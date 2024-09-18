import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { createIoTThing } from './helpers/iot-factory'; // Import the factory function

export class IotCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

     // Get the current account ID
     const accountId = cdk.Stack.of(this).account;

     // Create an S3 bucket with the account ID in the name
     const certBucket = new s3.Bucket(this, `IoTCertificateBucket-${accountId}`, {
       bucketName: `iot-certificates-${accountId}`, // Use the account ID in the bucket name
       versioned: true,
       removalPolicy: cdk.RemovalPolicy.DESTROY,
     });

    // Pass the bucket into the createIoTThing function
    createIoTThing(this, 'GPSThing', 'IoTDevicePolicy-GPS', cdk.Stack.of(this).region, certBucket);
    createIoTThing(this, 'TestThing', 'IoTDevicePolicy-Test', cdk.Stack.of(this).region, certBucket);
  }
}
