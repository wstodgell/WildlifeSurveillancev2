import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ✅ Retrieve GitHub OAuth Token from AWS Secrets Manager
    const githubSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubToken', 'aws-ampligy-github-token');

    // ✅ Extract the actual secret value using the key "GITHUB_OAUTH_TOKEN"
    const githubToken = githubSecret.secretValueFromJson('GITHUB_OAUTH_TOKEN').unsafeUnwrap();

    // ✅ Create an AWS Amplify App
    const amplifyApp = new amplify.CfnApp(this, 'MyAmplifyApp', {
      name: 'WildlifeSurveillanceApp',
      repository: 'https://github.com/wstodgell/WildlifeSurveillancev2.git',
      oauthToken: githubToken, // Uses the extracted GitHub token
    });

    // ✅ Define the branch (Deploy from "main" branch)
    const amplifyBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'main', // Make sure this matches your GitHub branch
    });

    // ✅ Output Amplify App ID for reference
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.attrAppId,
      description: 'AWS Amplify App ID',
    });

    // ✅ Output Amplify Console URL
    new cdk.CfnOutput(this, 'AmplifyConsoleUrl', {
      value: `https://us-east-1.console.aws.amazon.com/amplify/home#/d${amplifyApp.attrAppId}`,
      description: 'AWS Amplify Console URL',
    });
  }
}
