import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

// this is okay for testing purposes, but you cannot store secrets and parameter names in while storing on GiT_Hub
export class ConfigurationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const parameter = new ssm.StringParameter(this, 'MyParameter', {
      parameterName: '/iot-topics/gps-topic-name',
      stringValue: 'IoT/GPS',
    });
  }
}
