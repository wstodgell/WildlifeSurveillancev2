import * as iot from 'aws-cdk-lib/aws-iot';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';

export function createIoTThing(
  scope: Construct,
  thingName: string,
  policyName: string,
  region: string,
  bucket: s3.Bucket
) {
  // Create IoT Thing
  const iotThing = new iot.CfnThing(scope, `IoTThing-${thingName}`, {
    thingName: thingName,
  });

  // Create IoT Policy
  const iotPolicy = new iot.CfnPolicy(scope, `IoTPolicy-${thingName}`, {
    policyName: policyName,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['iot:Connect', 'iot:Publish', 'iot:Subscribe', 'iot:Receive'],
          Resource: '*',
        },
      ],
    },
  });

  // Create IoT Certificate using custom resource
  const certResource = new cr.AwsCustomResource(scope, `CreateIoTCertificate-${thingName}`, {
    onCreate: {
      service: 'Iot',
      action: 'createKeysAndCertificate',
      parameters: {
        setAsActive: true,
      },
      physicalResourceId: cr.PhysicalResourceId.of(`CreateIoTCertificate-${thingName}`),
      region: region, // Use the current region
    },
    policy: cr.AwsCustomResourcePolicy.fromStatements([
      new iam.PolicyStatement({
        actions: ['iot:CreateKeysAndCertificate'],
        resources: ['*'],
      }),
    ]),
  });

  // Extract certificate and private key - sanitize the \ns because it's causing error
  const certPem = (certResource.getResponseField('certificatePem') ?? '').replace(/\\n/g, '\n');
  const privateKey = (certResource.getResponseField('keyPair.PrivateKey') ?? '').replace(/\\n/g, '\n');

  // Log the values for debugging purposes (optional)
  console.log('Certificate PEM:', certPem);
  console.log('Private Key:', privateKey);

  const s3UploadLambda = new lambda.Function(scope, `S3UploadLambda-${thingName}`, {
    runtime: lambda.Runtime.NODEJS_18_X,
    handler: 'index.handler',
    code: lambda.Code.fromInline(`
      const AWS = require('aws-sdk');
      const s3 = new AWS.S3();
      const log = console.log;
  
      exports.handler = async function(event) {
        const { certPem, privateKey, bucketName, thingName } = event.ResourceProperties;
  
        // Log the values to CloudWatch
        log('Uploading certificate PEM:', certPem);
        log('Uploading private key:', privateKey);
  
        try {
          // Upload certificate PEM
          await s3.putObject({
            Bucket: bucketName,
            Key: \`certs/\${thingName}/certificate.pem.crt\`,
            Body: certPem,
          }).promise();
  
          // Upload private key
          await s3.putObject({
            Bucket: bucketName,
            Key: \`certs/\${thingName}/private.pem.key\`,
            Body: privateKey,
          }).promise();
  
          log('Certificate and private key uploaded successfully');
          return { Status: 'SUCCESS' };
        } catch (error) {
          log('Error uploading certificate or private key:', error);
          throw error;
        }
      };
    `),
  });

  // Grant the Lambda function permission to write to S3
  bucket.grantPut(s3UploadLambda);

  // Create a custom resource to invoke the Lambda function for uploading the certificate and private key to S3
  new cr.AwsCustomResource(scope, `UploadCertToS3-${thingName}`, {
    onCreate: {
      service: 'Lambda',
      action: 'invoke',
      parameters: {
        FunctionName: s3UploadLambda.functionArn,
        Payload: JSON.stringify({
          certPem: certPem,
          privateKey: privateKey,
          bucketName: bucket.bucketName,
          thingName: thingName,
        }),
      },
      physicalResourceId: cr.PhysicalResourceId.of(`UploadCertToS3-${thingName}`), // Add physicalResourceId here
    },
    policy: cr.AwsCustomResourcePolicy.fromStatements([
      new iam.PolicyStatement({
        actions: ['lambda:InvokeFunction'],
        resources: [s3UploadLambda.functionArn],
      }),
    ]),
  });

  // Extract certificate ARN
  const certArn = certResource.getResponseField('certificateArn');

  // Attach certificate to the IoT Thing
  new iot.CfnThingPrincipalAttachment(scope, `IoTThingCertAttachment-${thingName}`, {
    principal: certArn,
    thingName: iotThing.thingName!,
  });

  // Attach policy to the certificate
  new iot.CfnPolicyPrincipalAttachment(scope, `IoTPolicyAttachment-${thingName}`, {
    principal: certArn,
    policyName: iotPolicy.policyName!,
  });
}
