import * as iot from 'aws-cdk-lib/aws-iot';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as cdk from 'aws-cdk-lib/core';

export function createIoTThing(
  scope: Construct,
  thingName: string,
  policyName: string,
  region: string
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
  iotPolicy.applyRemovalPolicy(cdk.RemovalPolicy.DESTROY);  // Mark for deletion

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
    onDelete: {
      service: 'Iot',
      action: 'deleteCertificate',
      parameters: {
        certificateId: new cr.PhysicalResourceIdReference(), // Use the certificate ID from the create response
      },
      region: region,
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

  // Store the certificate and private key in Secrets Manager as a JSON object
  // While the SecretValue.unsafePlainText is convenient for testing, 
  // it's not recommended for production use since it exposes the value in the CDK code. 
  // For production, consider using environment variables or KMS encryption.
  new secretsmanager.Secret(scope, `IoTSecret-${thingName}`, {
    secretName: `IoT/${thingName}/certs`,  // You can adjust the naming convention as needed
    secretObjectValue: {
      certificatePem: cdk.SecretValue.unsafePlainText(certPem),
      privateKey: cdk.SecretValue.unsafePlainText(privateKey),
    },
    removalPolicy: cdk.RemovalPolicy.DESTROY,  // Mark the secret for deletion
  });

  // Extract certificate ARN
  const certArn = certResource.getResponseField('certificateArn');

  // Attach certificate to the IoT Thing
  new iot.CfnThingPrincipalAttachment(scope, `IoTThingCertAttachment-${thingName}`, {
    principal: certArn,
    thingName: iotThing.thingName!,
  });

  // Attach policy to the certificate
  const policyPrincipalAttachment = new iot.CfnPolicyPrincipalAttachment(scope, `IoTPolicyAttachment-${thingName}`, {
    principal: certArn,
    policyName: iotPolicy.policyName!,
  });

  // Add dependency: ensure the IoT policy is created before attaching it to the certificate
  policyPrincipalAttachment.node.addDependency(iotPolicy);
}
