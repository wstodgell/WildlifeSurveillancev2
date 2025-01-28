import * as glue from 'aws-cdk-lib/aws-glue';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as cdk from 'aws-cdk-lib';

export class DataAnalyticsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Reference the S3 bucket where Glue Job writes its output
    const s3OutputBucket = s3.Bucket.fromBucketName(this, 'OutputBucket', 'DynamoDbBucketNameOutput');

    // IAM Role for Glue Crawler
    const glueCrawlerRole = new iam.Role(this, 'GlueCrawlerRole', {
      assumedBy: new iam.ServicePrincipal('glue.amazonaws.com'),
    });

    // Grant necessary permissions to the Glue Crawler Role
    s3OutputBucket.grantRead(glueCrawlerRole);
    glueCrawlerRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSGlueServiceRole'));

    // Glue Database for the crawler
    const glueDatabase = new glue.CfnDatabase(this, 'GlueDatabase', {
      catalogId: this.account,
      databaseInput: {
        name: 'gps_data_analytics_db',
      },
    });

    // Glue Crawler
    new glue.CfnCrawler(this, 'GlueS3Crawler', {
      role: glueCrawlerRole.roleArn,
      databaseName: glueDatabase.ref,
      targets: {
        s3Targets: [
          {
            path: `s3://${s3OutputBucket.bucketName}/`,
          },
        ],
      },
      name: 'S3ResultsCrawler',
      tablePrefix: 'processed_', // Optional table prefix
    });
  }
}
