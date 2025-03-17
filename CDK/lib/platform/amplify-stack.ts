import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ✅ Retrieve GitHub OAuth Token from AWS Secrets Manager
    const githubSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubToken', 'aws-amplify-github-token');
    const githubToken = githubSecret.secretValueFromJson('GITHUB_OAUTH_TOKEN').unsafeUnwrap();

    // ✅ Create AWS Amplify App using OAuth Token
    const amplifyApp = new amplify.CfnApp(this, 'MyAmplifyApp', {
      name: 'WildlifeSurveillanceApp',
      repository: 'https://github.com/wstodgell/WildlifeSurveillancev2.git',
      platform: 'WEB',
      oauthToken: githubToken, // ✅ Pass the extracted GitHub token
    });

    // ✅ Define the main branch with auto-build enabled
    const amplifyBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'main',
      enableAutoBuild: true,
      buildSpec: `
        version: 1
        frontend:
          phases:
            preBuild:
              commands:
                - cd field_website  # ✅ Move into the correct directory
                - npm install
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: field_website/build  # ✅ Correct relative path
            files:
              - '**/*'
          cache:
            paths:
              - field_website/node_modules/**/*`
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
