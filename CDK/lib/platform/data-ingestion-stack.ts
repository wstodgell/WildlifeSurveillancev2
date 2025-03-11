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
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment'; // Import S3 Deployment
import { createGlueJob } from './helpers/glue-job-factory'; // Import the factory function
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
//import { checkFileExists } from './helpers/check-glue'; // Import the factory function

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a dedicated temporary S3 bucket for Glue job
    const glueTempS3BucketName = `glue-temp-${this.account}-${this.stackName}`.toLowerCase();

    const glueTempBucket = new s3.Bucket(this, 'GlueTempBucket', {
      bucketName: glueTempS3BucketName,
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Automatically delete the bucket with the stack
      autoDeleteObjects: true  // Automatically delete objects when the bucket is deleted
    });

    // Deploy an empty file to the /tmp/ folder to simulate its existence
    new s3Deployment.BucketDeployment(this, 'DeployEmptyFileToTmp', {
      destinationBucket: glueTempBucket,
      destinationKeyPrefix: 'tmp/', // This ensures the file goes into the /tmp/ "folder"
      sources: [s3Deployment.Source.data('empty-file.txt', '')], // Deploy an empty file
    });

    // ********* athena results bucket
    // Create a unique S3 bucket name for the bucket that stores athena results
    const athenaResultsS3BucketName = `athenaResults-${this.account}-${this.stackName}`;

    //Create a bucket to store Athena Reults
    const athenaResultsBucket = new s3.Bucket(this, 'athenaResults', {
      bucketName: athenaResultsS3BucketName.toLowerCase(),  // S3 bucket names must be lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,    // Bucket will be deleted with the stack
      autoDeleteObjects: true  // Automatically delete objects when the bucket is deleted
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
    const dynamoDbS3ResultsBucketName = `dynamo-to-s3-${this.account}-${this.stackName}`.toLowerCase();

    //Glue job outputs data filese into from DynamoDB to S3 bucket
    const s3BucketDynamoDb = new s3.Bucket(this, 'dynamo-to-s3', {
      bucketName: dynamoDbS3ResultsBucketName,  // S3 bucket names must be lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,    // Bucket will be deleted with the stack
      autoDeleteObjects: true  // Automatically delete objects when the bucket is deleted
    });

    //************ Create bucket for ETL scripts for Glue JObs */
    // Create a unique S3 bucket name for storing Glue ETL scripts
    const etlScriptBucketName = `etl-scripts-${this.account}-${this.stackName}`.toLowerCase();

    // Create a bucket to store Glue ETL scripts
    const etlScriptBucket = new s3.Bucket(this, 'ETLScriptBucket', {
      bucketName: etlScriptBucketName,  // S3 bucket names must be lowercase
      removalPolicy: cdk.RemovalPolicy.DESTROY,  // Bucket will be deleted with the stack
      autoDeleteObjects: true  // Automatically delete objects when the bucket is deleted
    });

    // Put the etl script into the bucket.
    new s3Deployment.BucketDeployment(this, 'DeployETLScripts', {
      destinationBucket: etlScriptBucket,
      sources: [s3Deployment.Source.asset('./lib/scripts')],  // Path to local folder containing etl_GPStoDb.py
      destinationKeyPrefix: 'scripts/',  // Place scripts in the "scripts/" folder in S3
    });


    // Output the athenaResultsBucketName
    new cdk.CfnOutput(this, 'AthenaResultsBucketNameOutput', {
      value: athenaResultsBucket.bucketName,
    });

    // Output the DynamoDbBucketName Parquet files are put here from Glue Job
    new cdk.CfnOutput(this, 'DynamoDbBucketNameOutput', {
      value: s3BucketDynamoDb.bucketName,
      exportName: 'DynamoDbBucketName',
    });

    // Output the bucket name
    new cdk.CfnOutput(this, 'ETLScriptBucketNameOutput', {
      value: etlScriptBucket.bucketName,
    });

    // Output the bucket name for verification
    new cdk.CfnOutput(this, 'GlueTempBucketNameOutput', {
      value: glueTempBucket.bucketName,
    });

    //Create Roles
    // Create the IAM role (LambdaDynamoDBAccessRole)
    // This lambda is what is used to pull data from the IoT Topic and into the DynamoDB table
    const lambdaDynamoDBAccessRole = new iam.Role(this, 'LambdaDynamoDBAccessRole', {
      roleName: 'LambdaDynamoDBAccessRole', // Explicit role name
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'), // Lambda service will assume this role
      description: 'Role for Lambda to access DynamoDB and CloudWatch',
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonDynamoDBFullAccess'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('CloudWatchFullAccess'),
      ],
    });
    
    createGlueJob(this, lambdaDynamoDBAccessRole, etlScriptBucketName, glueTempS3BucketName, dynamoDbS3ResultsBucketName, 'etl_GPStoDb.py', 'gps');
    createGlueJob(this, lambdaDynamoDBAccessRole, etlScriptBucketName, glueTempS3BucketName, dynamoDbS3ResultsBucketName, 'etl_ENVtoDb.py', 'env');
    createGlueJob(this, lambdaDynamoDBAccessRole, etlScriptBucketName, glueTempS3BucketName, dynamoDbS3ResultsBucketName, 'etl_HEAtoDb.py', 'hea');

    /* File upload Stack for field workers */


      // Bucket for raw ZIP uploads
      const rawUploadsBucket = new s3.Bucket(this, 'RawUploadsBucket', {
          bucketName: 'lab-sample-uploads',
          removalPolicy: cdk.RemovalPolicy.DESTROY,  // Automatically delete the bucket with the stack
          autoDeleteObjects: true  // Automatically delete objects when the bucket is deleted
      });

      // Bucket for extracted images
      const processedImagesBucket = new s3.Bucket(this, 'ProcessedImagesBucket', {
          bucketName: 'lab-processed-images',
          removalPolicy: cdk.RemovalPolicy.DESTROY,  // Automatically delete the bucket with the stack
          autoDeleteObjects: true  // Automatically delete objects when the bucket is deleted
      });

      const unzipLambda = new lambda.Function(this, 'UnzipLambda', {
        runtime: lambda.Runtime.PYTHON_3_9,
        handler: 'unzip_and_store.lambda_handler',
        code: lambda.Code.fromAsset('lib/platform/lambdas'),

      });
    
      rawUploadsBucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(unzipLambda));

  }
}
