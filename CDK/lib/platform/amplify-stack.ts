import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ✅ Retrieve Cognito User Pool & Identity Pool IDs from the Auth Stack
    const userPoolId = cdk.Fn.importValue('UserPoolId');
    const userPoolClientId = cdk.Fn.importValue('UserPoolClientId');
    const identityPoolId = cdk.Fn.importValue('IdentityPoolId');

    // ✅ Retrieve GitHub OAuth Token from AWS Secrets Manager
    const githubSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubToken', 'aws-ampligy-github-token');
    const githubToken = githubSecret.secretValueFromJson('GITHUB_OAUTH_TOKEN').unsafeUnwrap();

    // ✅ Create AWS Amplify App using OAuth Token
    const amplifyApp = new amplify.CfnApp(this, 'MyAmplifyApp', {
      name: 'WildlifeSurveillanceApp',
      repository: 'https://github.com/wstodgell/WildlifeSurveillancev2.git',
      platform: 'WEB',
      oauthToken: githubToken,
    });

    // ✅ Define the main branch with auto-build enabled
    const amplifyBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'master',
      enableAutoBuild: true,
      buildSpec: `
        version: 1
        frontend:
          phases:
            preBuild:
              commands:
                - cd field_website
                - npm install
            build:
              commands:
                - npm run build
          artifacts:
            baseDirectory: field_website/build
            files:
              - '**/*'
          cache:
            paths:
              - field_website/node_modules/**/*`
    });
  }
}
