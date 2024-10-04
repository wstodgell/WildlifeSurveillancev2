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

# Step 1: Read from Glue Data Catalog (which is linked to DynamoDB via the Crawler)
dynamic_frame = glueContext.create_dynamic_frame.from_catalog(
    database="gps_data_catalog",
    table_name="gps_gpsdatatable"
)

# Step 2: Optional - Apply any transformations (e.g., filtering, cleaning)
filtered_frame = dynamic_frame.filter(lambda row: row["latitude"] is not None and row["longitude"] is not None)

# Step 3: Write the data to the S3 bucket in Parquet format (suitable for Athena queries)
s3_output_path = args['s3_output_path']  # Use the passed S3 output path
glueContext.write_dynamic_frame.from_options(
    frame=filtered_frame,
    connection_type="s3",
    connection_options={"path": s3_output_path},
    format="parquet"
)

# Step 4: Commit the job to signal completion
job.commit()
