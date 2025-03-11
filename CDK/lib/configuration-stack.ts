import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ssm from 'aws-cdk-lib/aws-ssm';

// this is okay for testing purposes, but you cannot store secrets and parameter names in while storing on GiT_Hub
export class ConfigurationStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const GPSTopicParameter = new ssm.StringParameter(this, 'GPSTopicParameter', {
      parameterName: '/iot-topics/gps-topic-name',
      stringValue: 'IoT/GPS',
    });

    const ENVTopicParameter = new ssm.StringParameter(this, 'ENVTopicParameter', {
      parameterName: '/iot-topics/env-topic-name',
      stringValue: 'IoT/ENV',
    });

    const HEATopicParameter = new ssm.StringParameter(this, 'HEATopicParameter', {
      parameterName: '/iot-topics/hea-topic-name',
      stringValue: 'IoT/HEA',
    });

    //*********** Poling parameters */

    // **New Parameter: Publish Interval**
    const ENVPollingIntervalParameter = new ssm.StringParameter(this, 'ENVPollingIntervalParameter', {
      parameterName: '/iot-settings/env-publish-interval',
      stringValue: '120', // Default to 15 seconds
    });

    const HEAPollingIntervalParameter = new ssm.StringParameter(this, 'HEAPollingIntervalParameter', {
      parameterName: '/iot-settings/hea-publish-interval',
      stringValue: '120', // Default to 15 seconds
    });

    const GPSPollingIntervalParameter = new ssm.StringParameter(this, 'GPSPollingIntervalParameter', {
      parameterName: '/iot-settings/gps-publish-interval',
      stringValue: '120', // Default to 15 seconds
    });
  }
}
