import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Cognito User Pool
    this.userPool = new cognito.UserPool(this, 'WildlifeUserPool', {
      userPoolName: 'WildlifeUserPool',
      signInAliases: { email: true },
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: false }
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    });

    // Create Cognito User Pool Client
    this.userPoolClient = new cognito.UserPoolClient(this, 'WildlifeUserPoolClient', {
      userPool: this.userPool,
      generateSecret: false
    });

    // Create Cognito Identity Pool
    this.identityPool = new cognito.CfnIdentityPool(this, 'WildlifeIdentityPool', {
      identityPoolName: 'WildlifeIdentityPool',
      allowUnauthenticatedIdentities: false, // Only allow authenticated users
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // Create IAM Role for Authenticated Users
    const authenticatedRole = new iam.Role(this, 'CognitoAuthRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          "StringEquals": { "cognito-identity.amazonaws.com:aud": this.identityPool.ref },
          "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "authenticated" }
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess") // Change to a scoped-down policy later
      ]
    });

    // Attach IAM Role to Identity Pool
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: { authenticated: authenticatedRole.roleArn }
    });

    // Output values
    new cdk.CfnOutput(this, 'UserPoolId', { value: this.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', { value: this.userPoolClient.userPoolClientId });
    new cdk.CfnOutput(this, 'IdentityPoolId', { value: this.identityPool.ref });
    new cdk.CfnOutput(this, 'AuthenticatedRoleArn', { value: authenticatedRole.roleArn });
  }
}
