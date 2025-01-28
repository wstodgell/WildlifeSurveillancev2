import sys
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.job import Job
from awsglue.transforms import *
from awsglue.utils import getResolvedOptions

# Initialize Glue job
args = getResolvedOptions(sys.argv, ['JOB_NAME', 's3_output_path'])  # Get the s3_output_path argument
sc = SparkContext()
glueContext = GlueContext(sc)
spark = glueContext.spark_session
job = Job(glueContext)
job.init(args['JOB_NAME'], args)

# Read from DynamoDB table
dynamo_frame = glueContext.create_dynamic_frame.from_options(
    connection_type="dynamodb",
    connection_options={
        "dynamodb.input.tableName": "GpsDataTable",  # Replace with your table name
        "dynamodb.throughput.read.percent": "1.0"   # Adjust throughput usage as needed
    }
)

# Step 3: Combine all data into a single JSON file and write it to S3
s3_output_path = args['s3_output_path']  # Use the passed S3 output path
# Convert the AWS Glue DynamicFrame to a Spark DataFrame, reduce the output to a single partition 
# (so the result is written as a single JSON file), and append the new data to the existing files 
# in the specified S3 path without overwriting any existing data.
dynamo_frame.toDF().coalesce(1).write.mode('append').json(s3_output_path)

# Step 4: Commit the job to signal completion
job.commit()
