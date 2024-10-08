import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as common from '../common';


export class EcrStack extends cdk.Stack {
  public readonly GPSEcrRepositoryUri: string;
  public readonly TestEcrRepositoryUri: string;

  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const GPSRepository = new ecr.Repository(this, 'MyIotGpsAppRepository', {
      repositoryName: common.ECR_REPO_GPS,
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const TestRepository = new ecr.Repository(this, 'MyIotTestAppRepository', {
      repositoryName: common.ECR_REPO_TEST,
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // store the repository - property of cdk.Stack URI is typically: aws_account_id.dkr.ecr.region.amazonaws.com/repository_name
    this.GPSEcrRepositoryUri = GPSRepository.repositoryUri;

    // store the repository - property of cdk.Stack URI is typically: aws_account_id.dkr.ecr.region.amazonaws.com/repository_name
    this.TestEcrRepositoryUri = TestRepository.repositoryUri;

    // Creates a Cloudformation output to display values: Logical ID = GPS_EcrRepositoryUri and name of the value.
    new cdk.CfnOutput(this, 'GPSEcrRepositoryUri', {
      value: this.GPSEcrRepositoryUri,
      description: 'URI of the GPS ECR repository',
      exportName: 'GPSEcrRepositoryUri'
    });

    new cdk.CfnOutput(this, 'TestEcrRepositoryUri', {
      value: this.TestEcrRepositoryUri,
      description: 'URI of the Test ECR repository',
      exportName: 'TestEcrRepositoryUri'
    });

    // Create the IAM role with AdministratorAccess
    const ecsTaskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for ECS tasks with full administrative permissions',
      roleName: 'ecsTaskExecutionRole',  // Explicit role name
    });

    //export this for ecs-stack
    new cdk.CfnOutput(this, 'EcsTaskExecutionRoleArn', {
      value: ecsTaskExecutionRole.roleArn,
      description: 'ARN of the ECS Task Execution Role',
      exportName: 'EcsTaskExecutionRoleArn',
    });

    // Attach the AdministratorAccess policy to the role
    ecsTaskExecutionRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'));

  }
}
