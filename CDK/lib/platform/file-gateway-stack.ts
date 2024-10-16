import * as cdk from 'aws-cdk-lib';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Bucket, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';
import { Role, ServicePrincipal, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources'; // Correct import for PhysicalResourceId
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import { Duration } from 'aws-cdk-lib';

export class FileGatewayStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const fileGatewayBucket = new Bucket(this, 'FileGatewayBucket', {
      bucketName: `lab-data-storage-${this.account}-${this.region}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      lifecycleRules: [
        {
          id: 'MoveOldFilesToGlacier',
          enabled: true,
          transitions: [
            {
              storageClass: cdk.aws_s3.StorageClass.GLACIER,
              transitionAfter: Duration.days(30),
            },
          ],
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    

    // Step 2: Create an IAM Role for File Gateway access to S3
    const fileGatewayRole = new Role(this, 'FileGatewayRole', {
      assumedBy: new ServicePrincipal('storagegateway.amazonaws.com'),
    });

    // Add permissions to the role
    fileGatewayRole.addToPolicy(new PolicyStatement({
      actions: [
        's3:PutObject',
        's3:GetObject',
        's3:DeleteObject',
        's3:ListBucket',
      ],
      resources: [
        fileGatewayBucket.bucketArn,
        `${fileGatewayBucket.bucketArn}/*`,
      ],
    }));

    const uploadFilesLambda = new lambda.Function(this, 'UploadFilesLambda', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'upload.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas'), {
        exclude: ['*.pyc'],
        bundling: {
          image: lambda.Runtime.PYTHON_3_9.bundlingImage,
          command: [
            'bash', '-c', 
            'mkdir -p /mnt/images /mnt/metadata && cp -r ./images/* /mnt/images/ && cp -r ./metadata/* /mnt/metadata/ && cp -r . /asset-output'
          ],
        },
      }),
      environment: {
        S3_BUCKET_NAME: fileGatewayBucket.bucketName,
      },
    });

    // Grant Lambda permission to write to the S3 bucket
    fileGatewayBucket.grantPut(uploadFilesLambda);

    // Step 4: Create an AwsCustomResource to invoke Lambda after deployment
    const customResource = new AwsCustomResource(this, 'InvokeLambdaOnDeployment', {
      onCreate: {
        service: 'Lambda',
        action: 'invoke',
        parameters: {
          FunctionName: uploadFilesLambda.functionName,
          InvocationType: 'Event',
        },
        physicalResourceId: PhysicalResourceId.of('InvokeLambdaOnDeployment'),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          actions: ['lambda:InvokeFunction'],
          resources: [uploadFilesLambda.functionArn],
        }),
      ]),
    });
  }
}
