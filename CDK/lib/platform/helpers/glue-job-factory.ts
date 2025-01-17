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
import * as glue from 'aws-cdk-lib/aws-glue';




export function createIoTECS(
    scope: Construct,
    DynamoDBTableName: string,
    lambdaDynamoDBAccessRole: cdk.aws_iam.Role,
    etlScriptBucketName: string,
    glueTempBucketName: string,
    s3BucketDynamoDbName: string
  ) {

    // Create the DynamoDB Table (GpsDataTable)
        const gpsDataTable = new dynamodb.Table(scope, DynamoDBTableName, {
          tableName: DynamoDBTableName,
          partitionKey: { name: 'Topic', type: dynamodb.AttributeType.STRING }, // Partition key (Topic)
          sortKey: { name: 'Timestamp', type: dynamodb.AttributeType.STRING },  // Sort key (Timestamp)
          billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // On-demand billing mode
          removalPolicy: cdk.RemovalPolicy.DESTROY, // Automatically delete the table when the stack is destroyed
        });
    
    
        // Create Lambda function for processing GPS data (Topic to DynamoDB)
        const gpsTopicProcessorLambda = new lambda.Function(scope, 'GpsTopicProcessorLambda', {
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
        const gpsIotRule = new iot.CfnTopicRule(scope, 'GpsIotRule', {
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
    
        // EXPLICIT: Make sure the Lambda function is destroyed with stack
        gpsTopicProcessorLambda.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);
    
        // ***************** create glue crawlers for Dynamodb
        // Step 1: Create IAM Role for AWS Glue
    
        //if a Glue database already exists, you do not want to create a new one or overwrite the existing one
        const glueDatabaseExistsParam = new CfnParameter(scope, 'GlueDatabaseExists', {
          type: 'String',
          allowedValues: ['true', 'false'],
          default: 'false',
        });
    
        // Condition based on the Glue Database existence
        const glueDatabaseExistsCondition = new CfnCondition(scope, 'GlueDatabaseExistsCondition', {
          expression: Fn.conditionEquals(glueDatabaseExistsParam.valueAsString, 'false'),
        });
    
    
        const glueRole = new Role(scope, 'GlueDynamoDBRole', {
          assumedBy: new ServicePrincipal('glue.amazonaws.com'),
        });
    
        // Attach necessary policies
        glueRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'));
        glueRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBReadOnlyAccess'));
        glueRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    
        // Step 2: Create AWS Glue Database (for storing the metadata from the crawler)
        const glueDatabase = new CfnDatabase(scope, 'GPSDataCatalog', {
          catalogId: "34234", //this should be scope.account - but it doesn't seem to recognize it - TODO: figure out why
          databaseInput: {
            name: 'gps_data_catalog',  // Database name in Glue Data Catalog
          },
        });
    
         // Apply condition so the Glue Database is only created if it doesn't already exist
         glueDatabase.cfnOptions.condition = glueDatabaseExistsCondition;
    
        // Step 8: Create Glue Crawler with conditional reference to the Glue Database
        const glueCrawler = new CfnCrawler(scope, 'DynamoDBGPSCrawler', {
          role: glueRole.roleArn,   // Attach IAM Role to Glue Crawler
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
          tablePrefix: '',  // Prefix for tables created by the Crawler
        });
     
        //// CREATE the blueJob
        // Now use this bucket in your Glue job creation:
        // Now use this bucket in your Glue job creation:
        const glueJob = new glue.CfnJob(scope, 'DynamoDBToS3GlueJob', {
          role: glueRole.roleArn,  // The IAM role for the Glue job
          command: {
            name: 'glueetl',  // Specifies it's an ETL job
            scriptLocation: `s3://${etlScriptBucketName}/scripts/etl_GPStoDb.py`,  // Path to the script in the S3 bucket
            pythonVersion: '3',  // Python 3 for the Glue job
          },
          defaultArguments: {
            '--job-language': 'python',  // The Glue job will run in Python
            '--TempDir': `s3://${glueTempBucketName}/tmp/`,  // Correct temporary directory
            '--enable-metrics': '',  // Enables metrics tracking
            '--enable-continuous-cloudwatch-log': 'true',  // Logs to CloudWatch
            '--s3_output_path': `s3://${s3BucketDynamoDbName}/gps_data/`,  // Pass the S3 bucket path to your Glue job
            '--extra-py-files': '',  // If additional Python dependencies are needed
            '--Dlog4j2.formatMsgNoLookups': 'true',  // Disable Log4j lookups for security
          },
          maxRetries: 3,  // Retry the job 3 times if it fails
          glueVersion: '3.0',  // Glue version
          numberOfWorkers: 2,  // Number of workers (adjust as needed)
          workerType: 'G.1X',  // Worker type
          timeout: 20,  // Job timeout in minutes
        });

    
        //******************** ENV */
    
        // Output the Glue Job Name
        new cdk.CfnOutput(scope, 'GlueJobNameOutput', {
          value: glueJob.ref,
        });
  }