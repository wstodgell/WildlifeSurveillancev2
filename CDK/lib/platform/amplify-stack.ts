import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';


// AWS Amplify is a service that deploys and hosts your website.
// 1) It needs to pull (download) your code from GitHub before building the website
// 2) GitHub won't allow this unless Amplify has permission
// 3) OAuth token is like giving Amplify a 'guest pass' to access GitHub Repo

// ------

// Got to GitHub Token Settings - Generate new token (Classic)
// - Git it permissions repo (Fulle control)
// - give it admin:repo_hook) - so Amplify can set up auto-deployments
export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {

    super(scope, id, props);

    // Retrieve GitHub OAuth Token from AWS Secrets Manager
    const githubToken = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubToken', 'amplify-github-token');

    // Create an AWS Amplify App
    const amplifyApp = new amplify.CfnApp(this, 'MyAmplifyApp', {
      name: 'MyFrontendApp',
      repository: 'https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git',
      oauthToken: githubToken.secretValue.toString(), // Uses the stored token
    });

    // Output Amplify App ID for reference
    new cdk.CfnOutput(this, 'AmplifyAppId', {
      value: amplifyApp.attrAppId,
      description: 'AWS Amplify App ID',
    });

    // Output Amplify Console URL
    new cdk.CfnOutput(this, 'AmplifyConsoleUrl', {
      value: `https://us-east-1.console.aws.amazon.com/amplify/home#/d${amplifyApp.attrAppId}`,
      description: 'AWS Amplify Console URL',
    });
  }
}
