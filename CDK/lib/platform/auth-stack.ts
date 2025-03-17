import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /** 
     * ✅ Step 1: Create Cognito User Pool (Authentication System)
     */
    this.userPool = new cognito.UserPool(this, 'WildlifeUserPool', {
      userPoolName: 'WildlifeUserPool',
      signInAliases: { email: true }, 
      selfSignUpEnabled: true, 
      autoVerify: { email: true }, 
      standardAttributes: {
        email: { required: true, mutable: false },
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    /**
     * ✅ Step 2: Create Cognito User Pool Client (For Web & Mobile Apps)
     */
    this.userPoolClient = new cognito.UserPoolClient(this, 'WildlifeUserPoolClient', {
      userPool: this.userPool,
      generateSecret: false,
    });

    /**
     * ✅ Step 3: Create Cognito Identity Pool (Allows Access to AWS Services)
     */
    this.identityPool = new cognito.CfnIdentityPool(this, 'WildlifeIdentityPool', {
      identityPoolName: 'WildlifeIdentityPool',
      allowUnauthenticatedIdentities: true, // ✅ ALLOW UNAUTHENTICATED ACCESS
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    // ✅ Store Cognito values in AWS Secrets Manager
    new secretsmanager.Secret(this, 'CognitoSecrets', {
      secretName: 'WildlifeSurveillanceCognito', //TODO - store this in GITHUB
      description: 'Cognito User Pool and Identity Pool IDs',
      secretObjectValue: {
        userPoolId: cdk.SecretValue.unsafePlainText(this.userPool.userPoolId),
        userPoolClientId: cdk.SecretValue.unsafePlainText(this.userPoolClient.userPoolClientId),
        identityPoolId: cdk.SecretValue.unsafePlainText(this.identityPool.ref),
      },
    });

    // ✅ Output Cognito Secret Name //TODO store this in GitHub
    new cdk.CfnOutput(this, 'CognitoSecretName', {
      value: 'WildlifeSurveillanceCognito',
      description: 'Secret name storing Cognito values',
    });

    /**
     * ✅ Step 4: Create IAM Role for Authenticated Users (Grants AWS Access)
     */
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
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),
      ]
    });

    /**
     * ✅ Step 4b: Create IAM Role for Unauthenticated Users
     */
    const unauthenticatedRole = new iam.Role(this, 'CognitoUnauthRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          "StringEquals": { "cognito-identity.amazonaws.com:aud": this.identityPool.ref },
          "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "unauthenticated" } // ✅ UNAUTHENTICATED USERS
        },
        "sts:AssumeRoleWithWebIdentity"
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSLambda_ReadOnlyAccess"), // Example Policy
      ]
    });

    // ✅ Attach Secrets Manager Access to Unauthenticated Role
    unauthenticatedRole.addToPolicy(new iam.PolicyStatement({
      actions: ["secretsmanager:GetSecretValue"],
      resources: [`arn:aws:secretsmanager:us-east-1:${this.account}:secret:AmplifyUserCredentials-*`],
    }));

    /**
     * ✅ Step 5: Attach IAM Roles to Identity Pool
     */
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,
      roles: { 
        authenticated: authenticatedRole.roleArn, 
        unauthenticated: unauthenticatedRole.roleArn // ✅ ATTACH UNAUTHENTICATED ROLE
      },
    });

    /**
     * ✅ Step 6: Output Cognito IDs for Other Stacks (Needed for Amplify)
     */
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      exportName: 'UserPoolId',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      exportName: 'UserPoolClientId',
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', {
      value: this.identityPool.ref,
      exportName: 'IdentityPoolId',
    });

    /**
     * ✅ Step 7: Create IAM User for AWS Amplify
     */
    const amplifyUser = new iam.User(this, 'AmplifyUser', {
      userName: 'AmplifyAdmin',
    });

    // Attach Necessary IAM Policies for Amplify Deployments
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('IAMFullAccess'));

    /**
     * ✅ Step 8: Create Access Keys for the Amplify IAM User
     */
    const accessKey = new iam.CfnAccessKey(this, 'AmplifyUserAccessKey', {
      userName: amplifyUser.userName,
    });

    /**
     * ✅ Step 9: Store IAM Credentials in AWS Secrets Manager
     */
    new secretsmanager.Secret(this, 'AmplifySecret', {
      secretName: 'AmplifyUserCredentials',
      description: 'IAM User Credentials for Amplify CLI',
      secretObjectValue: {
        accessKeyId: cdk.SecretValue.unsafePlainText(accessKey.ref),
        secretAccessKey: cdk.SecretValue.unsafePlainText(accessKey.attrSecretAccessKey),
      },
    });

    /**
     * ✅ Step 10: Output IAM User Access Keys (For Debugging, Remove in Production)
     */
    new cdk.CfnOutput(this, 'AmplifyAccessKeyId', {
      value: accessKey.ref,
      description: 'Amplify IAM User Access Key ID',
    });

    new cdk.CfnOutput(this, 'AmplifySecretAccessKey', {
      value: accessKey.attrSecretAccessKey,
      description: 'Amplify IAM User Secret Access Key',
    });
  }
}
