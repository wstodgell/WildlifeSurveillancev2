import * as iot from 'aws-cdk-lib/aws-iot';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

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
