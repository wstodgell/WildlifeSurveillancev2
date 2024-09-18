import * as iot from 'aws-cdk-lib/aws-iot';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';

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

  new cr.AwsCustomResource(scope, `UploadCertToS3-${thingName}`, {
    onCreate: {
      service: 'S3',
      action: 'putObject',
      parameters: {
        Bucket: bucket.bucketName,
        Key: `certs/${thingName}/certificate.pem.crt`,
        Body: certPem,
      },
      physicalResourceId: cr.PhysicalResourceId.of(`UploadCertToS3-${thingName}`),
    },
    policy: cr.AwsCustomResourcePolicy.fromStatements([
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [bucket.arnForObjects('*')],
      }),
    ]),
  });
  
  new cr.AwsCustomResource(scope, `UploadPrivateKeyToS3-${thingName}`, {
    onCreate: {
      service: 'S3',
      action: 'putObject',
      parameters: {
        Bucket: bucket.bucketName,
        Key: `certs/${thingName}/private.pem.key`,
        Body: privateKey,
      },
      physicalResourceId: cr.PhysicalResourceId.of(`UploadPrivateKeyToS3-${thingName}`),
    },
    policy: cr.AwsCustomResourcePolicy.fromStatements([
      new iam.PolicyStatement({
        actions: ['s3:PutObject'],
        resources: [bucket.arnForObjects('*')],
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
