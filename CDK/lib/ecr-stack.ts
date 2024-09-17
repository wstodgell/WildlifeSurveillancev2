import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';

export class EcrStack extends cdk.Stack {
  public readonly GPSecrRepositoryUri: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const GPSrepository = new ecr.Repository(this, 'MyIotGpsAppRepository', {
      repositoryName: 'my-iot-gps-app',
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // store the repository - property of cdk.Stack URI is typically: aws_account_id.dkr.ecr.region.amazonaws.com/repository_name
    this.GPSecrRepositoryUri = GPSrepository.repositoryUri;

    // Creates a Cloudformation output to display values: Logical ID = GPS_EcrRepositoryUri and name of the value.
    new cdk.CfnOutput(this, 'GPSEcrRepositoryUri', {
      value: this.GPSecrRepositoryUri,
      description: 'URI of the ECR repository',
      exportName: 'GPSEcrRepositoryUri'
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
