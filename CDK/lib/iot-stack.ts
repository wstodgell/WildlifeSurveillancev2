import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

export class IotCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create an S3 bucket as a basic example
    new s3.Bucket(this, 'MyNewBucket234234234', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Automatically delete bucket on stack deletion
    });
  }
}
