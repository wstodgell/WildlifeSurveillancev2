import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ✅ Create IAM Role for AWS Amplify
    const amplifyRole = new iam.Role(this, "AmplifyRole", {
      assumedBy: new iam.ServicePrincipal("amplify.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AdministratorAccess-Amplify"),
      ],
    });

    // ✅ Allow Amplify to Read Cognito Secrets from AWS Secrets Manager
    const secretsPolicy = new iam.PolicyStatement({
      actions: ["secretsmanager:GetSecretValue"],
      resources: [
        `arn:aws:secretsmanager:us-east-1:${this.account}:secret:AmplifyUserCredentials-*`,
      ],
    });

    amplifyRole.addToPolicy(secretsPolicy);

    // ✅ Retrieve GitHub OAuth Token from AWS Secrets Manager
    const githubSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GitHubToken', 'aws-amplify-github-token');
    const githubToken = githubSecret.secretValueFromJson('GITHUB_OAUTH_TOKEN').unsafeUnwrap();

    // ✅ Create AWS Amplify App and Attach the IAM Role
    const amplifyApp = new amplify.CfnApp(this, 'MyAmplifyApp', {
      name: 'WildlifeSurveillanceApp',
      repository: 'https://github.com/wstodgell/WildlifeSurveillancev2.git',
      platform: 'WEB',
      oauthToken: githubToken,
      iamServiceRole: amplifyRole.roleArn, // ✅ Attach IAM Role Here
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

    // ✅ Output Role ARN (For Debugging)
    new cdk.CfnOutput(this, "AmplifyRoleArn", {
      value: amplifyRole.roleArn,
      description: "IAM Role used by AWS Amplify",
    });

  }
}
