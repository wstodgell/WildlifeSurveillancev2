import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { createIoTECS } from './helpers/ecs-factory'; // Import the factory function


export class EcsStack extends cdk.Stack {
  public readonly GPSEcrRepositoryUri: string;
  public readonly TestEcrRepositoryUri: string;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    

    // Get AWS account ID and region from environment variables
    const accountId = process.env.AWS_ACCOUNT_ID;
    const region = process.env.AWS_REGION;

    // Example of using these values in IAM Policy for Secrets Manager
    const logArn = `arn:aws:logs:${region}:${accountId}:log-group:/docker/transmitter:*`;


    // Import the ECR repository URIs created in the EcrStack - required for containers to get the images
    const GPSEcrRepositoryUri = cdk.Fn.importValue('GPSEcrRepositoryUri');
    const ENVEcrRepositoryUri = cdk.Fn.importValue('ENVEcrRepositoryUri');
    const HEAEcrRepositoryUri = cdk.Fn.importValue('HEAEcrRepositoryUri');

    const TestEcrRepositoryUri = cdk.Fn.importValue('TestEcrRepositoryUri');

    // Import the ECS task execution role created in EcrStack - required so Fargate can access
    const ecsTaskExecutionRoleArn = cdk.Fn.importValue('EcsTaskExecutionRoleArn');
    const ecsTaskExecutionRole = iam.Role.fromRoleArn(this, 'ImportedEcsTaskExecutionRole', ecsTaskExecutionRoleArn);

    // Create a VPC with only 1 NAT Gateway instead of multiple
    const vpc = new ec2.Vpc(this, 'IoTClusterVpc', {
      maxAzs: 2,  // Spread across 2 Availability Zones
      natGateways: 1,  // Only 1 NAT Gateway for all private subnets
    });

     // Create an ECS Cluster for ALL IoT Mock scripts
     const cluster = new ecs.Cluster(this, 'IoTCluster', {
      clusterName: 'IoTCluster',
      vpc,  // Attach the custom VPC here
      // The default Fargate configurations are already set up,
      // so there's no need to specify additional settings for Fargate
    });

    // Output the cluster name
    new cdk.CfnOutput(this, 'EcsClusterName', {
      value: cluster.clusterName,
      description: 'Name of the ECS cluster',
      exportName: 'EcsClusterName'
    });

    // ***********************************  SETUP GPS ROLES AND CONTAINERS

    //Creates a new CloudWatch Log Group in AWS.  LogGroup = container for storing logs
    //This = ECS Stack
    //ECSLogGroup (identifier)
    const logGroup = new logs.LogGroup(this, 'EcsLogGroup', {
      logGroupName: '/ecs/IoT-GPS',
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Ensure logs are cleaned up with stack removal
      retention: logs.RetentionDays.ONE_WEEK,   // Adjust retention period as needed
    });

    // Retrieve the secrets for TestThing and GPSThing from AWS Secrets Manager
    
    /// **IMPORTANT** - secret manager SPECIFIC to this string where secrets are stored.
    // Later created in iot-stack in format of secretName: `IoT/${thingName}/certs`,  
    // retrieved by MTTQS_SETUP.PY to publish to IoTCore
    const iotGPSThingSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GPSThingSecret', 'IoT/GPSThing/certs');

    // Create a Task Role for GPS task that can access GPSThing's secret
    const gpsTaskRole = new iam.Role(this, 'GPSTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'), // Allows ECS tasks to assume this role
      description: 'Task role for GPS task with permissions for Secrets Manager',
    });

    // Attach the pre-made AmazonSSMReadOnlyAccess managed policy to the GPS task role
    gpsTaskRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonSSMReadOnlyAccess"));

    // Grant the GPS task role permission to read GPSThing's secret
    iotGPSThingSecret.grantRead(gpsTaskRole);

    // Grant permissions for CloudWatch Logs
    gpsTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "logs:CreateLogGroup", // Permission to create log groups
        "logs:CreateLogStream", // Permission to create log streams
        "logs:PutLogEvents", // Permission to put log events into log streams
        "iot:DescribeEndpoint", // Allows describing IoT endpoints
        "iot:Connect", // Allows establishing a connection to IoT Core
        "iot:Publish", // Allows publishing messages to IoT topics
        "iot:Subscribe", // Allows subscribing to IoT topics
        "iot:Receive" // Allows receiving messages from IoT topics
      ],
      resources: ["*"], // Restrict to the specific resources necessary for these actions
    }));

    // Create a Fargate Task Definition for IoT-GPS
    const GPSTaskDefinition = new ecs.FargateTaskDefinition(this, 'IoTGPSTaskDefinition', {
      family: 'IoT-GPS', // Logical family name of this task definition
      cpu: 256, // CPU units (adjust as needed)
      memoryLimitMiB: 512, // Memory in MB (adjust as needed)
      executionRole: ecsTaskExecutionRole, // Use the execution role for pulling images and starting tasks
      taskRole: gpsTaskRole, // Task role used to interact with Secrets Manager for GPSThing
    });

    // Define the container for the GPS task, pulled from the ECR repository
    const GPSContainer = GPSTaskDefinition.addContainer('GPSContainer', {
      image: ecs.ContainerImage.fromRegistry(GPSEcrRepositoryUri), // Pulls container image from ECR
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'IoT-GPS', // Prefix for the CloudWatch log stream
        logGroup: logGroup, // The log group where container logs will be sent
      }),
    });

     // Set networking mode for task (awsvpc)
     GPSContainer.addPortMappings({
      containerPort: 80, // Adjust if your container exposes a different port
    });

    // Add Fargate Service to the IoTCluster
    const GPSFargateService = new ecs.FargateService(this, 'IoTGPSService', {
      cluster, // The ECS cluster where the task will run
      taskDefinition: GPSTaskDefinition, // Task definition that defines the container
      assignPublicIp: true, // Ensure tasks are reachable via public IP if needed
      desiredCount: 1, // Adjust based on how many instances you want running
      enableExecuteCommand: true, // Enable ECS Exec for debugging into the container
    });

    // ********************  SETUP TEST ROLES AND CONTAINERS






    const ENVFargateService = createIoTECS(this, 'ENV', 'ENVThingSecret', 'IoT/ENVThing/certs', 'ENVTaskRole', 
      ecsTaskExecutionRole, ENVEcrRepositoryUri, cluster)
    
    new cdk.CfnOutput(this, 'ENVFargateServiceName', {
      value: ENVFargateService.serviceName,
      description: 'Name of the ENV ECS Fargate Service',
      exportName: 'ENVFargateServiceName'
    });

    
    const HEAFargateService = createIoTECS(this, 'HEA', 'HEAThingSecret', 'IoT/HEAThing/certs', 'HEATaskRole', 
      ecsTaskExecutionRole, HEAEcrRepositoryUri, cluster)
    
    new cdk.CfnOutput(this, 'HEAFargateServiceName', {
      value: HEAFargateService.serviceName,
      description: 'Name of the HEA ECS Fargate Service',
      exportName: 'HEAFargateServiceName'
    });

    // Output for the Task Definition and Service
    new cdk.CfnOutput(this, 'GPSTaskDefinitionFamily', {
      value: GPSTaskDefinition.family,
      description: 'Family of the GPS ECS Task Definition',
      exportName: 'GPSTaskDefinitionFamily'
    });

    new cdk.CfnOutput(this, 'GPSFargateServiceName', {
      value: GPSFargateService.serviceName,
      description: 'Name of the GPS ECS Fargate Service',
      exportName: 'GPSFargateServiceName'
    });

  }
}
