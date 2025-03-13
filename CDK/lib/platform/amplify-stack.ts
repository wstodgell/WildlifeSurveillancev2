import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 🌟 Step 1: Create an Amplify App (Using `CfnApp` Instead of `amplify.App`)
    const amplifyApp = new amplify.CfnApp(this, 'WildlifeAmplifyApp', {
      name: 'WildlifeSurveillance',
      repository: 'https://github.com/YOUR_GITHUB_REPO',
      oauthToken: process.env.GITHUB_OAUTH_TOKEN, // Store token securely in `.env`
      buildSpec: `
        version: 1
        frontend:
          phases:
            preBuild:
              commands:
                - npm install
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: /build
            files:
              - '**/*'
          cache:
            paths:
              - node_modules/**/*
      `,
    });

    // 🌟 Step 2: Create an IAM Role for Amplify Deployment
    const amplifyRole = new iam.Role(this, 'AmplifyDeploymentRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'), // Change to least-privilege later
      ],
    });

    // 🌟 Step 3: Output Amplify App ID and URL
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.attrAppId,
      description: 'AWS Amplify App ID',
    });

    new cdk.CfnOutput(this, 'AmplifyConsoleUrl', {
      value: `https://us-east-1.console.aws.amazon.com/amplify/home#/d${amplifyApp.attrAppId}`,
      description: 'AWS Amplify Console URL',
    });
  }
}
