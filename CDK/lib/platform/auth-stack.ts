import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class AuthStack extends cdk.Stack {
  // Exposing these properties so other stacks (or the frontend) can use them
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly identityPool: cognito.CfnIdentityPool;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    /** 
     * Step 1: Create a Cognito User Pool
     * - A **User Pool** is a managed authentication service in AWS.
     * - It handles user registration, login, password reset, etc.
     */
    this.userPool = new cognito.UserPool(this, 'WildlifeUserPool', {
      userPoolName: 'WildlifeUserPool',  // Custom name for the pool
      signInAliases: { email: true },    // Users log in with their email
      selfSignUpEnabled: true,           // Users can sign up themselves
      autoVerify: { email: true },       // Automatically verify email addresses
      standardAttributes: {
        email: { required: true, mutable: false }, // Email is required and cannot be changed
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Deletes the user pool when stack is destroyed (not for production)
    });

    /**
     * Step 2: Create a Cognito User Pool Client
     * - A **User Pool Client** allows applications to interact with the User Pool.
     * - This client ID will be used in the frontend to authenticate users.
     */
    this.userPoolClient = new cognito.UserPoolClient(this, 'WildlifeUserPoolClient', {
      userPool: this.userPool,  // Connects to the user pool created above
      generateSecret: false,    // This is for public clients (web & mobile apps) that don't use a secret key
    });

    /**
     * Step 3: Create a Cognito Identity Pool
     * - **Identity Pools** grant AWS access (e.g., S3, DynamoDB) to users authenticated via the User Pool.
     * - This allows authenticated users to assume an IAM role and interact with AWS resources.
     */
    this.identityPool = new cognito.CfnIdentityPool(this, 'WildlifeIdentityPool', {
      identityPoolName: 'WildlifeIdentityPool',  
      allowUnauthenticatedIdentities: false, // Only authenticated users can access AWS resources
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId, // Connects to the User Pool Client
          providerName: this.userPool.userPoolProviderName, // Identifies the User Pool as the identity provider
        },
      ],
    });

    /**
     * Step 4: Create an IAM Role for Authenticated Users
     * - This role will be assumed by users who sign in through Cognito.
     * - It determines what AWS services authenticated users can access.
     */
    const authenticatedRole = new iam.Role(this, 'CognitoAuthRole', {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',  // Specifies that this role is for Cognito users
        {
          "StringEquals": { "cognito-identity.amazonaws.com:aud": this.identityPool.ref },  // This role is only for this Identity Pool
          "ForAnyValue:StringLike": { "cognito-identity.amazonaws.com:amr": "authenticated" } // Only authenticated users
        },
        "sts:AssumeRoleWithWebIdentity" // This allows Cognito users to assume this role
      ),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonS3FullAccess"),  // Allows users to access S3 (modify this as needed)
      ]
    });

    /**
     * Step 5: Attach the IAM Role to the Identity Pool
     * - This step links the IAM role we created to the Cognito Identity Pool.
     * - Now, authenticated users will assume the `CognitoAuthRole` when they log in.
     */
    new cognito.CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.ref,  // Connect to our Identity Pool
      roles: { authenticated: authenticatedRole.roleArn }, // Assign our IAM role to authenticated users
    });

    /**
     * Step 6: Output Important IDs
     * - These values are needed in your frontend application.
     * - They allow Amplify to know how to connect to Cognito.
     */
    new cdk.CfnOutput(this, 'UserPoolId', { 
      value: this.userPool.userPoolId, 
      description: 'ID of the Cognito User Pool' 
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', { 
      value: this.userPoolClient.userPoolClientId, 
      description: 'ID of the Cognito User Pool Client' 
    });

    new cdk.CfnOutput(this, 'IdentityPoolId', { 
      value: this.identityPool.ref, 
      description: 'ID of the Cognito Identity Pool' 
    });

    new cdk.CfnOutput(this, 'AuthenticatedRoleArn', { 
      value: authenticatedRole.roleArn, 
      description: 'IAM Role for authenticated users' 
    });

    // ******************************** Create User
    // Create IAM User
    const amplifyUser = new iam.User(this, 'AmplifyUser', {
      userName: 'AmplifyAdmin',
    });

    // Attach Required Policies
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify'));
    
    // (Optional) Attach Additional Policies If Needed
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSCloudFormationFullAccess'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSLambda_FullAccess'));
    amplifyUser.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('IAMFullAccess'));

    // Create Access Key for the User
    const accessKey = new iam.CfnAccessKey(this, 'AmplifyUserAccessKey', {
      userName: amplifyUser.userName,
    });

    // Store credentials in AWS Secrets Manager (Optional, but recommended)
    new secretsmanager.Secret(this, 'AmplifySecret', {
      secretName: 'AmplifyUserCredentials',
      description: 'IAM User Credentials for Amplify CLI',
      secretObjectValue: {
        accessKeyId: cdk.SecretValue.unsafePlainText(accessKey.ref),
        secretAccessKey: cdk.SecretValue.unsafePlainText(accessKey.attrSecretAccessKey),
      },
    });

    // Output Access Keys (You may want to remove this in production)
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
