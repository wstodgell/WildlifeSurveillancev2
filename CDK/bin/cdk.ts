#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcrStack } from '../lib/iot/ecr-stack';
import { EcsStack } from '../lib/iot/ecs-stack';
import { IotCodeStack } from '../lib/iot/iot-stack';

const app = new cdk.App();

// Instantiate the EcrStack
new EcrStack(app, 'EcrStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

// Instantiate the EcsStack
new EcsStack(app, 'EcsStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

new IotCodeStack(app, 'IotCodeStack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
});

