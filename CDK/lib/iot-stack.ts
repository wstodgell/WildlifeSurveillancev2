import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as path from 'path';

export class IotCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create IoT Policy
    const iotPolicy = new iot.CfnPolicy(this, 'IoTPolicy', {
      policyName: 'IoTDevicePolicy',
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Action: [
              'iot:Connect',
              'iot:Publish',
              'iot:Subscribe',
              'iot:Receive'
            ],
            Resource: '*',
          },
        ],
      },
    });

    // Create IoT Thing
    const iotThing = new iot.CfnThing(this, 'IoTThing', {
      thingName: 'ElkGPSCollar',
    });

    // Custom resource to create IoT Certificate
    const certResource = new cr.AwsCustomResource(this, 'CreateIoTCertificate', {
      onCreate: {
        service: 'Iot',
        action: 'createKeysAndCertificate',
        parameters: {
          setAsActive: true
        },
        physicalResourceId: cr.PhysicalResourceId.of('CreateIoTCertificate'),
        region: cdk.Stack.of(this).region, // Use the current region
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: [
            'iot:CreateKeysAndCertificate',
            'iot:AttachThingPrincipal', // Add permission for attaching the cert to the IoT Thing
            'iot:AttachPolicy' // Add permission for attaching the policy to the cert
          ],
          resources: ['*'],
        }),
      ])
    });

    // Extract certificate ARN from the custom resource
    const certArn = certResource.getResponseField('certificateArn');

    // Attach the certificate to the IoT Thing
    new iot.CfnThingPrincipalAttachment(this, 'IoTThingCertAttachment', {
      principal: certArn,
      thingName: iotThing.thingName!,
    });

    // Attach the policy to the certificate
    new iot.CfnPolicyPrincipalAttachment(this, 'IoTPolicyAttachment', {
      principal: certArn,
      policyName: iotPolicy.policyName!,
    });

// ************************ Create an S3 bucket to store IoT messages
    const iotGpsBucket = new s3.Bucket(this, 'IoTGPSMessagesBucket', {
      bucketName: 'iot-gps-mqtt-messages-bucket',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Deletes bucket on stack deletion (adjust as needed)
      autoDeleteObjects: true,  // Automatically deletes objects on bucket deletion
      versioned: true,          // Enable versioning for objects in the bucket
      publicReadAccess: false,   // Ensures bucket is private
    });

    // ****************************************Lambda function to create IoT certificates and upload them to S3d
    const createCertificatesFunction = new lambda.Function(this, 'CreateCertificatesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambda/create-certificates')),
      environment: {
        BUCKET_NAME: iotGpsBucket.bucketName,
      },
    });

    iotGpsBucket.grantPut(createCertificatesFunction); // Grant Lambda permission to upload to S3

    // Custom resource to trigger **** Lambda during CDK deployment
    new cr.AwsCustomResource(this, 'CreateCertificatesCustomResource', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: createCertificatesFunction.functionName,
        },
        physicalResourceId: cr.PhysicalResourceId.of('CreateCertificatesCustomResource'),
      },
    });
    // ************************ END OF LAMBDA FUNCTION *****************************

      // Add a bucket policy to allow IoT and ECS to put objects in the bucket
    iotGpsBucket.addToResourcePolicy(new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:PutObjectAcl', 's3:GetObject'],
      resources: [`${iotGpsBucket.bucketArn}/*`],
      principals: [
        new iam.ServicePrincipal('iot.amazonaws.com'),   // Allows IoT to write messages
        new iam.ServicePrincipal('ecs-tasks.amazonaws.com')  // Allows ECS tasks to write objects
      ],
    }));

    const s3WritePolicy = new iam.PolicyStatement({
      actions: ['s3:PutObject'],
      resources: [`${iotGpsBucket.bucketArn}/*`],
    });
  
    const iotRole = new iam.Role(this, 'IoTToS3Role', {
        assumedBy: new iam.ServicePrincipal('iot.amazonaws.com'),
        inlinePolicies: {
            S3WriteAccess: new iam.PolicyDocument({
                statements: [s3WritePolicy],
            }),
        },
    });

    const iotRule = new iot.CfnTopicRule(this, 'IoTGpsToS3Rule', {
      ruleName: 'IoTGpsToS3Rule',
      topicRulePayload: {
          actions: [
              {
                  s3: {
                      bucketName: iotGpsBucket.bucketName,
                      key: 'gps_data/${timestamp()}.json',  // Object key format with timestamp
                      roleArn: iotRole.roleArn,  // Use the role created above
                  },
              },
          ],
          sql: "SELECT * FROM 'gps/elk'",  // SQL query to select messages from the MQTT topic
          ruleDisabled: false,
        },
    });
  

    new cdk.CfnOutput(this, 'S3GPSBucketName', {
      value: iotGpsBucket.bucketName,
      description: 'Name of the S3 Bucket for IoT GPS messages',
    });



    // Outputs to find the certificate and Thing details

    new cdk.CfnOutput(this, 'IoTPolicyOutput', {
      value: iotPolicy.policyName!,
      description: 'Name of the IoT Device Policy',
    });

    new cdk.CfnOutput(this, 'IoTCertificateArnOutput', {
      value: certResource.getResponseField('certificateArn'),
      description: 'The ARN of the IoT Device Certificate',
    });


    new cdk.CfnOutput(this, 'IoTThingName', {
      value: iotThing.thingName!,
      description: 'The name of the IoT Thing',
    });

    new cdk.CfnOutput(this, 'IoTCertificateArn', {
      value: certArn,
      description: 'The ARN of the IoT Device Certificate',
    });
  }
}
