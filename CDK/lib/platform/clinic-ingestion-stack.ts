import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';

export class ClinicIngestionStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a new VPC for the RDS instance
    const vpc = new ec2.Vpc(this, 'RdsVpc', {
      maxAzs: 2, // Create resources in 2 Availability Zones
      natGateways: 1,  // Use only 1 NAT Gateway instead of 1 per subnet
    });

    // Create a secret for the RDS PostgreSQL credentials
    const dbCredentialsSecret = new secretsmanager.Secret(this, 'DBCredentialsSecret', {
        generateSecretString: {
          secretStringTemplate: JSON.stringify({
            username: 'adminpostgres', // The username for the DB
          }),
          excludePunctuation: true,
          generateStringKey: 'password', // This will generate the key 'password'
        },
      });

    // Create the RDS PostgreSQL instance
    const rdsInstance = new rds.DatabaseInstance(this, 'RDSPostgresInstance', {
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.VER_16_3,
      }),
      // Using Secrets Manager for credentials
      credentials: rds.Credentials.fromSecret(dbCredentialsSecret),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PUBLIC,
      },
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.BURSTABLE3,
        ec2.InstanceSize.MICRO
      ),
      allocatedStorage: 20, // 20GB storage
      maxAllocatedStorage: 100, // Auto-scaling up to 100GB
      publiclyAccessible: true, // Make the instance publicly accessible
      multiAz: false, // Disable Multi-AZ for development
      autoMinorVersionUpgrade: true, // Allow automatic upgrades for minor versions
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Delete instance when stack is destroyed
      deletionProtection: false, // Disable deletion protection
    });

    // Add Security Group Rules to allow access from anywhere
    rdsInstance.connections.allowFromAnyIpv4(ec2.Port.tcp(5432), 'Allow PostgreSQL access');

    // Output the RDS endpoint and Secrets Manager credentials for convenience
    new cdk.CfnOutput(this, 'RdsEndpoint', {
      value: rdsInstance.instanceEndpoint.hostname,
    });

    new cdk.CfnOutput(this, 'SecretName', {
      value: dbCredentialsSecret.secretName,
    });
  }
}
