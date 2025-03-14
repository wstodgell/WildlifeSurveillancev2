import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as common from '../common';


export class EcrStack extends cdk.Stack {
  public readonly TestEcrRepositoryUri: string;
  public readonly GPSEcrRepositoryUri: string;
  public readonly EnvEcrRepositoryUri: string;
  public readonly HeaEcrRepositoryUri: string;
  
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const GPSRepository = new ecr.Repository(this, 'MyIotGpsAppRepository', {
      repositoryName: common.ECR_REPO_GPS,
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const EnvRepository = new ecr.Repository(this, 'MyIotEnvAppRepository', {
      repositoryName: common.ECR_REPO_ENV,
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const HeaRepository = new ecr.Repository(this, 'MyIotHeaAppRepository', {
      repositoryName: common.ECR_REPO_HEA,
      emptyOnDelete: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // store the repository - property of cdk.Stack URI is typically: aws_account_id.dkr.ecr.region.amazonaws.com/repository_name
    this.GPSEcrRepositoryUri = GPSRepository.repositoryUri;

    this.EnvEcrRepositoryUri = EnvRepository.repositoryUri;

    this.HeaEcrRepositoryUri = HeaRepository.repositoryUri;

    // Creates a Cloudformation output to display values: Logical ID = GPS_EcrRepositoryUri and name of the value.
    new cdk.CfnOutput(this, 'GPSEcrRepositoryUri', {
      value: this.GPSEcrRepositoryUri,
      description: 'URI of the GPS ECR repository',
      exportName: 'GPSEcrRepositoryUri'
    });

    new cdk.CfnOutput(this, 'ENVEcrRepositoryUri', {
      value: this.EnvEcrRepositoryUri,
      description: 'URI of the Env ECR repository',
      exportName: 'ENVEcrRepositoryUri'
    });

    new cdk.CfnOutput(this, 'HEAEcrRepositoryUri', {
      value: this.HeaEcrRepositoryUri,
      description: 'URI of the Hea ECR repository',
      exportName: 'HEAEcrRepositoryUri'
    });

    // Create the IAM role with AdministratorAccess
    const ecsTaskExecutionRole = new iam.Role(this, 'EcsTaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      description: 'Role for ECS tasks with full administrative permissions',
      roleName: 'ecsTaskExecutionRole',  // Explicit role name
    });

    // Attach the AdministratorAccess policy to the role
    // Enhanced security recommenation - specify resources instead of wildcard
    // Attach the AdministratorAccess policy to the role
    ecsTaskExecutionRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        "ecr:GetAuthorizationToken", // Allows ECS to authenticate and retrieve tokens from ECR.
        "ecr:BatchCheckLayerAvailability", // Verifies the availability of image layers in ECR before pulling.
        "ecr:GetDownloadUrlForLayer", // Retrieves URLs for downloading image layers from ECR.
        "ecr:BatchGetImage" // Retrieves Docker images from ECR, improving efficiency by batching requests.
      ],
      resources: ["*"], // Recommended: Restrict this to specific ECR repository ARNs for enhanced security.
    }));

     //export this for ecs-stack to attach to Task Definition
     new cdk.CfnOutput(this, 'EcsTaskExecutionRoleArn', {
      value: ecsTaskExecutionRole.roleArn,
      description: 'ARN of the ECS Task Execution Role',
      exportName: 'EcsTaskExecutionRoleArn',
    });

  }
}
