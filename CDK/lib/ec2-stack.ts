import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as iam from 'aws-cdk-lib/aws-iam';

export class Ec2Stack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // Create a new VPC (or use an existing one by importing it)
        const vpc = new ec2.Vpc(this, 'MyVpc', {
            maxAzs: 2,  // number of availability zones
            natGateways: 1,  // Ensure it's private by using a NAT gateway
            subnetConfiguration: [
                {
                    name: 'PrivateSubnet',
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                },
            ],
        });

        // Output the VPC ID for reference
        new cdk.CfnOutput(this, 'VpcId', {
            value: vpc.vpcId,
            description: 'The VPC Id where the EC2 instance is located',
        });

        // Create the security group for the EC2 instance
        const securityGroup = new ec2.SecurityGroup(this, 'EC2SecurityGroup', {
            vpc,
            allowAllOutbound: true,  // Allows the instance to reach the internet via the NAT
        });

        // Create IAM role for the EC2 instance
        const instanceRole = new iam.Role(this, 'InstanceRole', {
            assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        });

        instanceRole.addManagedPolicy(
            iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerServiceforEC2Role')
        );

        // Create EC2 instance
        const instance = new ec2.Instance(this, 'MyEC2Instance', {
            vpc,
            instanceType: new ec2.InstanceType('t3.medium'),  // Change instance type as needed
            machineImage: ecs.EcsOptimizedImage.amazonLinux2(),
            securityGroup,
            role: instanceRole,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },  // Ensures no public access
        });

        // Output the instance ID for reference
        new cdk.CfnOutput(this, 'InstanceId', {
            value: instance.instanceId,
            description: 'The EC2 instance ID',
        });

        // Attach the EC2 instance to an ECS cluster
        const cluster = new ecs.Cluster(this, 'MyCluster', {
            vpc: vpc,
        });

        // Add the EC2 instance to the ECS cluster
        cluster.addCapacity('DefaultAutoScalingGroupCapacity', {
            instanceType: new ec2.InstanceType('t3.medium'),
            desiredCapacity: 1,  // Adjust based on the number of EC2 instances you need
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },  // Only private subnets
        });
    }
}
