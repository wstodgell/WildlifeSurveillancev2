import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';  // Import S3 module

export class DataIngestionStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create the most basic S3 bucket
    const bucket = new s3.Bucket(this, 'BasicS3Bucket', {
      // Default properties for a basic S3 bucket
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Ensures the bucket is deleted when the stack is destroyed
      autoDeleteObjects: true,  // Automatically delete objects when the bucket is deleted
    });

    // Output the bucket name to the console
    new cdk.CfnOutput(this, 'BucketNameOutput', {
      value: bucket.bucketName,
      description: 'The name of the S3 bucket',
    });
  }
}
