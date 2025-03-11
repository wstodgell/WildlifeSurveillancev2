import boto3
import zipfile
import io

s3 = boto3.client('s3')

RAW_BUCKET = "lab-sample-uploads"
PROCESSED_BUCKET = "lab-processed-images"

def lambda_handler(event, context):
    for record in event['Records']:
        zip_key = record['s3']['object']['key']

        # Download ZIP from S3
        zip_obj = s3.get_object(Bucket=RAW_BUCKET, Key=zip_key)
        buffer = io.BytesIO(zip_obj['Body'].read())

        # Extract ZIP contents
        with zipfile.ZipFile(buffer, 'r') as zip_ref:
            for file_name in zip_ref.namelist():
                with zip_ref.open(file_name) as extracted_file:
                    s3.upload_fileobj(
                        extracted_file, PROCESSED_BUCKET, f"extracted/{file_name}"
                    )
        print(f"✅ Successfully extracted files from {zip_key}")
