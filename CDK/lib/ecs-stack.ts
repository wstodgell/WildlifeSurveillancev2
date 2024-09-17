import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';


export class EcsStack extends cdk.Stack {
  public readonly GPSEcrRepositoryUri: string;
  public readonly TestEcrRepositoryUri: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const GPSEcrRepositoryUri = cdk.Fn.importValue('GPSEcrRepositoryUri');
    const TestEcrRepositoryUri = cdk.Fn.importValue('TestEcrRepositoryUri');

    const ecsTaskExecutionRoleArn = cdk.Fn.importValue('EcsTaskExecutionRoleArn');
    const ecsTaskExecutionRole = iam.Role.fromRoleArn(this, 'ImportedEcsTaskExecutionRole', ecsTaskExecutionRoleArn);

    //Creates a new CloudWatch Log Group in AWS.  LogGroup = container for storing logs
    //This = ECS Stack
    //ECSLogGroup (identifier)
    const logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: '/ecs/IoT-GPS',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Ensure logs are cleaned up with stack removal
      retention: logs.RetentionDays.ONE_WEEK,   // Adjust retention period as needed
    });

     // Create an ECS Cluster
     const cluster = new ecs.Cluster(this, 'IoTCluster', {
      clusterName: 'IoTCluster',
      // The default Fargate configurations are already set up,
      // so there's no need to specify additional settings for Fargate
    });

    // Output the cluster name
    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: cluster.clusterName,
      description: 'Name of the ECS cluster',
      exportName: 'EcsClusterName'
    });

    // Create a Fargate Task Definition for IoT-GPS
    const GPSTaskDefinition = new ecs.FargateTaskDefinition(this, 'IoTGPSTaskDefinition', {
      family: 'IoT-GPS',
      cpu: 256, // Adjust CPU if needed
      memoryLimitMiB: 512, // Adjust memory if needed
      executionRole: ecsTaskExecutionRole,
    });

     // Create a Fargate Task Definition for IoT-TEST
     const TestTaskDefinition = new ecs.FargateTaskDefinition(this, 'IoTTestTaskDefinition', {
      family: 'IoT-Test',
      cpu: 256, // Adjust CPU if needed
      memoryLimitMiB: 512, // Adjust memory if needed
      executionRole: ecsTaskExecutionRole,
    });
    

    // Add container to the Task Definition
    const GPSContainer = GPSTaskDefinition.addContainer('GPSContainer', {
      image: ecs.ContainerImage.fromRegistry(GPSEcrRepositoryUri),  // Use imported ECR URI
      memoryLimitMiB: 512, // Adjust memory if needed
      cpu: 256, // Adjust CPU if needed
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'IoT-GPS',
        logGroup: logGroup
      }),
    });

    // Set networking mode for task (awsvpc)
    GPSContainer.addPortMappings({
      containerPort: 80, // Adjust if your container exposes a different port
    });

    // Add Fargate Service to the IoTCluster
    const GPSFargateService = new ecs.FargateService(this, 'IoTGPSService', {
      cluster,
      taskDefinition: GPSTaskDefinition,
      assignPublicIp: true, // Ensure tasks are reachable via public IP if needed
      desiredCount: 1, // Adjust based on how many instances you want running
    });

    // Output for the Task Definition and Service
    new cdk.CfnOutput(this, 'GPSTaskDefinitionFamily', {
      value: GPSTaskDefinition.family,
      description: 'Family of the GPS ECS Task Definition',
      exportName: 'GPS TaskDefinitionFamily'
    });

    new cdk.CfnOutput(this, 'GPSFargateServiceName', {
      value: GPSFargateService.serviceName,
      description: 'Name of the GPS ECS Fargate Service',
      exportName: 'GPSFargateServiceName'
    });
  }
}
