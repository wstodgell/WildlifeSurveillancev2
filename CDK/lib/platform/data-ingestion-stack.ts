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
import * as athena from 'aws-cdk-lib/aws-athena';
import * as glue from 'aws-cdk-lib/aws-glue';

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ********* athena results bucket
    // Create a unique S3 bucket name for the bucket that stores athena results
    const athenaResultsS3BucketName = `athenaResults-${this.account}-${this.stackName}`;

    //Create a bucket to store Athena Reults
    const athenaResultsBucket = new s3.Bucket(this, 'athenaResults', {
      bucketName: athenaResultsS3BucketName.toLowerCase(),  // S3 bucket names must be lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,    // Bucket will be deleted with the stack
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'athenaResultsBucketNameOutput', {
      value: athenaResultsBucket.bucketName,
    });

    // Athena Workgroup - assign athenaResultsBucket bucket to store reuslts.
    const athenaWorkgroup = new athena.CfnWorkGroup(this, 'MyAthenaWorkgroup', {
      name: 'MyWorkgroup',
      state: 'ENABLED',
      workGroupConfiguration: {
        resultConfiguration: {
          outputLocation: `s3://${athenaResultsBucket.bucketName}/`,
        },
      },
    });

    // ********* athena GPS dynamoDB Bucket data
    //Glue job outputs data filese into from DynamoDB to S3 bucket
    const dynamoDbS3ResultsBucketName = `dyanmoToS3-${this.account}-${this.stackName}`;

    //Glue job outputs data filese into from DynamoDB to S3 bucket
    const s3BucketDynamoDb = new s3.Bucket(this, 'dyanmoToS3', {
      bucketName: dynamoDbS3ResultsBucketName.toLowerCase(),  // S3 bucket names must be lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,    // Bucket will be deleted with the stack
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'DynamoDbBucketName', {
      value: s3BucketDynamoDb.bucketName,
    });

    //************ Create bucket for ETL scripts for Glue JObs */
    // Create a unique S3 bucket name for storing Glue ETL scripts
    const etlScriptBucketName = `etl-scripts-${this.account}-${this.stackName}`;

    // Create a bucket to store Glue ETL scripts
    const etlScriptBucket = new s3.Bucket(this, 'ETLScriptBucket', {
      bucketName: etlScriptBucketName.toLowerCase(),  // S3 bucket names must be lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Bucket will be deleted with the stack
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'ETLScriptBucketNameOutput', {
      value: etlScriptBucket.bucketName,
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

    //// CREATE the blueJob
    // Now use this bucket in your Glue job creation:
    const glueJob = new glue.CfnJob(this, 'DynamoDBToS3GlueJob', {
      role: glueRole.roleArn,
      command: {
        name: 'glueetl',  // Specifies it's an ETL job
        scriptLocation: `s3://${etlScriptBucket.bucketName}/scripts/etl_script.py`,  // Path to the script in the new ETL script bucket
        pythonVersion: '3',  // Python 3 for the Glue job
      },
      defaultArguments: {
        '--job-language': 'python',  // The Glue job will run in Python
        '--TempDir': `s3://${athenaResultsBucket.bucketName}/tmp/`,  // Temporary directory in Athena results bucket
        '--enable-metrics': '',  // Enables metrics tracking
        '--enable-continuous-cloudwatch-log': 'true',  // Logs to CloudWatch
      },
      maxRetries: 3,  // Retry the job 3 times if it fails
      glueVersion: '3.0',  // Glue version
      numberOfWorkers: 2,  // Number of workers (adjust if needed)
      workerType: 'G.1X',  // Worker type
      timeout: 20,  // Job timeout in minutes
    });

    // Output the Glue Job Name
    new cdk.CfnOutput(this, 'GlueJobNameOutput', {
      value: glueJob.ref,
    });

  }
}
