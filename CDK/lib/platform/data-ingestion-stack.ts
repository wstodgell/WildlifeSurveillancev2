import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { CfnCrawler, CfnDatabase } from 'aws-cdk-lib/aws-glue';
import { Role, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // Create a unique S3 bucket name using the stack name and account ID
    const uniqueBucketName = `gps-dynamodb-glue-data-${this.account}-${this.stackName}`;

    // Create the S3 bucket with the unique name
    const s3Bucket = new s3.Bucket(this, 'UniqueGPSDataBucket', {
      bucketName: uniqueBucketName.toLowerCase(),  // Ensure bucket name is lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,        // Bucket will be deleted with the stack
    });

    // Output the bucket name to the console
    new cdk.CfnOutput(this, 'BucketNameOutput', {
      value: s3Bucket.bucketName,
    });

    // Create the most basic S3 bucket (example from your original stack) this is for testing
    // TODO: remove this - for testing only
    const bucket = new s3.Bucket(this, 'BasicS3Bucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Ensures the bucket is deleted when the stack is destroyed
      autoDeleteObjects: true,  // Automatically delete objects when the bucket is deleted
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

    // Step 3: Create Glue Crawler
    const glueCrawler = new CfnCrawler(this, 'DynamoDBGPSCrawler', {
      role: glueRole.roleArn,  // Attach the IAM Role to the crawler
      databaseName: glueDatabase.ref,  // Target Glue Database
      name: 'DynamoDBgps',
      targets: {
        dynamoDbTargets: [
          {
            path: 'GpsDataTable',  // DynamoDB Table Name
          },
        ],
      },
      schedule: {
        scheduleExpression: 'cron(0 12 * * ? *)',  // Optional: Crawler schedule, adjust if needed
      },
      tablePrefix: 'gps_',  // Optional: Prefix for tables created by the Crawler
    });

  }
}
