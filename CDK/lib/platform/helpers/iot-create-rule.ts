import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iot from 'aws-cdk-lib/aws-iot';
import * as iam from 'aws-cdk-lib/aws-iam';

export class GpsIotRuleStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Import or create the Lambda function (GPSTopicProcessor)
    const gpsTopicProcessorLambda = lambda.Function.fromFunctionArn(this, 'GpsTopicProcessorLambda', 'arn:aws:lambda:YOUR_REGION:YOUR_ACCOUNT_ID:function:GPSTopicProcessor');

    // Create the IoT Rule
    new iot.CfnTopicRule(this, 'GpsIotRule', {
      topicRulePayload: {
        description: 'Processes the GPS topic',
        sql: "SELECT * FROM 'IoT/GPS' WHERE sqlVersion = '2016-03-23'", // SQL query to select from 'IoT/GPS'
        actions: [
          {
            lambda: {
              functionArn: gpsTopicProcessorLambda.functionArn, // Trigger the Lambda function
            },
          },
        ],
        ruleDisabled: false, // Enable the rule
      },
    });

    // Grant the IoT service permission to invoke the Lambda function
    gpsTopicProcessorLambda.grantInvoke(new iam.ServicePrincipal('iot.amazonaws.com'));
  }
}
