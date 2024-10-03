import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { CfnCrawler, CfnDatabase } from 'aws-cdk-lib/aws-glue';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';
import { CfnParameter, CfnCondition, Fn } from 'aws-cdk-lib';

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // Create a unique S3 bucket name using the stack name and account ID
    const uniqueBucketName = `gps-dynamodb-glue-data-${this.account}-${this.stackName}`;

    const s3Bucket = new s3.Bucket(this, 'UniqueGPSDataBucket', {
      bucketName: uniqueBucketName.toLowerCase(),  // S3 bucket names must be lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,    // Bucket will be deleted with the stack
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'BucketNameOutput', {
      value: s3Bucket.bucketName,
    });

    //Create Roles
    // Create the IAM role (LambdaDynamoDBAccessRole)
    const lambdaDynamoDBAccessRole = new iam.Role(this, 'LambdaDynamoDBAccessRole', {
      roleName: 'LambdaDynamoDBAccessRole', // Explicit role name
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'), // Lambda service will assume this role
      description: 'Role for Lambda to access DynamoDB and CloudWatch',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
      ],
    });

    // Create the DynamoDB Table (GpsDataTable)
    const gpsDataTable = new dynamodb.Table(this, 'GpsDataTable', {
      tableName: 'GpsDataTable',
      partitionKey: { name: 'Topic', type: dynamodb.AttributeType.STRING }, // Partition key (Topic)
      sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING },  // Sort key (Timestamp)
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand billing mode
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Automatically delete the table when the stack is destroyed
    });

    // Create Lambda function for processing GPS data
    const gpsTopicProcessorLambda = new lambda.Function(this, 'GpsTopicProcessorLambda', {
      functionName: 'GPSTopicProcessor',
      code: lambda.Code.fromAsset('lib/lambda'), // Path to your Lambda code directory
      handler: 'GPSTopicProcessor.lambda_handler', // Assuming your Python file is named GPSTopicProcessor.py with a lambda_handler
      runtime: lambda.Runtime.PYTHON_3_12,
      role: lambdaDynamoDBAccessRole,
      environment: {
        GpsDataTable: gpsDataTable.tableName, // Pass the table name to the Lambda function's environment variables
      },
    });

    // Grant the Lambda function read/write permissions to the DynamoDB table
    gpsDataTable.grantReadWriteData(gpsTopicProcessorLambda);

    // Create the IoT Rule
    const gpsIotRule = new iot.CfnTopicRule(this, 'GpsIotRule', {
      topicRulePayload: {
        description: 'Processes the GPS topic',
        sql: "SELECT * FROM 'IoT/GPS'", // SQL query to select from 'IoT/GPS'
        actions: [
          {
            lambda: {
              functionArn: gpsTopicProcessorLambda.functionArn, // Trigger the Lambda function
            },
          },
        ],
        ruleDisabled: false, // Enable the rule
      },
    });

    // EXPLICIT: Add Deletion Policy for the IoT Rule
    gpsIotRule.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // Grant IoT Core permissions to invoke the Lambda function
    gpsTopicProcessorLambda.grantInvoke(new iam.ServicePrincipal('iot.amazonaws.com'));

    // EXPLICIT: Make sure the Lambda function is destroyed
    gpsTopicProcessorLambda.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);

    // ***************** create glue crawlers for Dynamodb
    // Step 1: Create IAM Role for AWS Glue

    const glueDatabaseExistsParam = new CfnParameter(this, 'GlueDatabaseExists', {
      type: 'String',
      allowedValues: ['true', 'false'],
      default: 'false',
    });

    // Condition based on the Glue Database existence
    const glueDatabaseExistsCondition = new CfnCondition(this, 'GlueDatabaseExistsCondition', {
      expression: Fn.conditionEquals(glueDatabaseExistsParam.valueAsString, 'false'),
    });


    const glueRole = new Role(this, 'GlueDynamoDBRole', {
      assumedBy: new ServicePrincipal('glue.amazonaws.com'),
    });

    // Attach necessary policies
    glueRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'));
    glueRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess'));
    glueRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));

    // Step 2: Create AWS Glue Database (for storing the metadata from the crawler)
    const glueDatabase = new CfnDatabase(this, 'GPSDataCatalog', {
      catalogId: this.account,
      databaseInput: {
        name: 'gps_data_catalog',  // Database name in Glue Data Catalog
      },
    });

     // Apply condition so the Glue Database is only created if it doesn't already exist
     glueDatabase.cfnOptions.condition = glueDatabaseExistsCondition;

    // Step 8: Create Glue Crawler with conditional reference to the Glue Database
    const glueCrawler = new CfnCrawler(this, 'DynamoDBGPSCrawler', {
      role: glueRole.roleArn,  // Attach IAM Role to Glue Crawler
      databaseName: Fn.conditionIf(
        'GlueDatabaseExistsCondition',
        glueDatabase.ref,        // Reference the newly created database (if GlueDatabaseExists = false)
        'gps_data_catalog'       // Reference the existing database (if GlueDatabaseExists = true)
      ).toString(),
      name: 'DynamoDBgps',
      targets: {
        dynamoDbTargets: [
          {
            path: 'GpsDataTable',  // DynamoDB Table Name
          },
        ],
      },
      schedule: {
        scheduleExpression: 'cron(0 12 * * ? *)',  // Optional Crawler schedule (daily at noon)
      },
      tablePrefix: 'gps_',  // Prefix for tables created by the Crawler
    });

  }
}
