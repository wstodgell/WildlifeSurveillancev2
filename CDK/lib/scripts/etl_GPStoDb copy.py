import sys
from pyspark.context import SparkContext
from awsglue.context import GlueContext
from awsglue.utils import getResolvedOptions

# Initialize Glue job
args = getResolvedOptions(sys.argv, ['JOB_NAME'])
sc = SparkContext()
glueContext = GlueContext(sc)

# Read from DynamoDB table
dynamo_frame = glueContext.create_dynamic_frame.from_options(
    connection_type="dynamodb",
    connection_options={
        "dynamodb.input.tableName": "GpsDataTable",  # Replace with your table name
        "dynamodb.throughput.read.percent": "0.5"   # Adjust throughput usage as needed
    }
)

# Write to S3 in Parquet format
output_path = "s3://dynamo-to-s3-975049909803-dataingestionstack/"
glueContext.write_dynamic_frame.from_options(
    frame=dynamo_frame,
    connection_type="s3",
    connection_options={
        "path": output_path
    },
    format="parquet"
)

print(f"Data successfully written to {output_path}")
