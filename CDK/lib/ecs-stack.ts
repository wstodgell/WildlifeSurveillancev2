import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';


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
    const TestEcrRepositoryUri = cdk.Fn.importValue('TestEcrRepositoryUri');

    // Import the ECS task execution role created in EcrStack - required so Fargate can access
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

     // Create an ECS Cluster for ALL IoT Mock scripts
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

    // ***********************************  SETUP GPS ROLES AND CONTAINERS
    // Retrieve the secrets for TestThing and GPSThing from AWS Secrets Manager
    
    /// **IMPORTANT** - secret manager SPECIFIC to this string where secrets are stored.
    // Later created in iot-stack in format of secretName: `IoT/${thingName}/certs`,  
    const iotGPSThingSecret = secretsmanager.Secret.fromSecretNameV2(this, 'GPSThingSecret', 'IoT/GPSThing/certs');

    // Create a Task Role for GPS task that can access GPSThing's secret
    const gpsTaskRole = new iam.Role(this, 'GPSTaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'), // Allows ECS tasks to assume this role
      description: 'Task role for GPS task with permissions for Secrets Manager',
    });

    // Grant the GPS task role permission to read GPSThing's secret
    iotGPSThingSecret.grantRead(gpsTaskRole);

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
      memoryLimitMiB: 512, // Container memory limit
      cpu: 256, // Container CPU limit
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


    //const iotTestThingSecret = secretsmanager.Secret.fromSecretNameV2(this, 'TestThingSecret', 'IoT/TestThing/certs');



    // Later created in iot-stack in format of secretName: `IoT/${thingName}/certs`,  
    const iotTestThingSecret = secretsmanager.Secret.fromSecretNameV2(this, 'TestThingSecret', 'IoT/TestThing/certs');

    //This role is created so that TEST TRansmitter can read secrets, create/write to logs and also connect to IoT
    const explicitTestTaskRole = new iam.Role(this, 'ExplicitTestTaskRole', {
      roleName: 'ExplicitTestTaskRole',  // Assign a clear, meaningful name
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'), // Allows ECS tasks to assume this role
      description: 'Task role for Test task with permissions for IoT, CloudWatch, and Secrets Manager',
    });
    
    // Grant permissions for IoT Core
    explicitTestTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "iot:DescribeEndpoint",
        "iot:Publish"
      ],
      resources: ["*"],  // You can narrow this down to specific IoT resources if necessary
    }));
    
    // Grant the ECS task permission to retrieve the secret value
    iotTestThingSecret.grantRead(explicitTestTaskRole);
    
    // Grant permissions for CloudWatch Logs
    explicitTestTaskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      resources: [logArn],
    }));
    

    // Create the Fargate task definition for the Test task
    const testTaskDefinition = new ecs.FargateTaskDefinition(this, 'IoTTestTaskDefinition', {
      family: 'IoT-Test', // Logical family name of this task definition
      cpu: 256, // CPU units (adjust as needed)
      memoryLimitMiB: 512, // Memory in MB (adjust as needed)
      executionRole: ecsTaskExecutionRole, // Use the execution role for pulling images and starting tasks
      taskRole: explicitTestTaskRole, // Task role used to interact with Secrets Manager for TestThing
    });

    // Define the container for the Test task, pulled from the ECR repository
    const testContainer = testTaskDefinition.addContainer('TestContainer', {
      image: ecs.ContainerImage.fromRegistry(TestEcrRepositoryUri), // Pulls container image from ECR
      memoryLimitMiB: 512, // Container memory limit
      cpu: 256, // Container CPU limit
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'IoT-Test', // Prefix for the CloudWatch log stream
        logGroup: logGroup, // The log group where container logs will be sent
      }),
    });

    // Set port mapping for the Test container
    testContainer.addPortMappings({
      containerPort: 81, // Port exposed by the container (adjust if necessary)
    });

    // Create an ECS Fargate service for the Test task
    const testFargateService = new ecs.FargateService(this, 'IoTTestService', {
      cluster, // The ECS cluster where the task will run
      taskDefinition: testTaskDefinition, // Task definition that defines the container
      assignPublicIp: true, // Assign a public IP address so the service is publicly accessible
      desiredCount: 1, // Number of task instances to run (scale this as needed)
      enableExecuteCommand: true, // Enable ECS Exec for debugging into the container
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

    // Output for the Task Definition and Service
    new cdk.CfnOutput(this, 'TestTaskDefinitionFamily', {
      value: GPSTaskDefinition.family,
      description: 'Family of the Test ECS Task Definition',
      exportName: 'TestTaskDefinitionFamily'
    });

    // Output the name of the Test Fargate Service
    new cdk.CfnOutput(this, 'TestFargateServiceName', {
      value: testFargateService.serviceName, // Name of the service
      description: 'Name of the Test ECS Fargate Service',
      exportName: 'TestFargateServiceName',
    });
  }
}
