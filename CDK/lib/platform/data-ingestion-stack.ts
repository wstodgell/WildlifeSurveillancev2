import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the most basic S3 bucket (example from your original stack)
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

    // Grant IoT Core permissions to invoke the Lambda function
    gpsTopicProcessorLambda.grantInvoke(new iam.ServicePrincipal('iot.amazonaws.com'));

    // Output the bucket name to the console
    new cdk.CfnOutput(this, 'BucketNameOutput', {
      value: bucket.bucketName,
      description: 'The name of the S3 bucket',
    });
  }
}
