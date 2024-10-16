import os
import boto3

s3 = boto3.client('s3')

def handler(event, context):
    bucket_name = os.getenv('S3_BUCKET_NAME')
    
    # Upload images
    image_dir = '/mnt/images'
    for filename in os.listdir(image_dir):
        if filename.endswith((".jpg", ".png")):
            s3_key = f"images/{filename}"
            try:
                s3.head_object(Bucket=bucket_name, Key=s3_key)
                print(f"{filename} already exists, skipping upload.")
            except s3.exceptions.ClientError:
                file_path = os.path.join(image_dir, filename)
                s3.upload_file(file_path, bucket_name, s3_key)
                print(f"Uploaded {filename} to {bucket_name}")
    
    # Upload metadata
    metadata_dir = '/mnt/metadata'
    for filename in os.listdir(metadata_dir):
        if filename.endswith(".json"):
            s3_key = f"metadata/{filename}"
            try:
                s3.head_object(Bucket=bucket_name, Key=s3_key)
                print(f"{filename} already exists, skipping upload.")
            except s3.exceptions.ClientError:
                file_path = os.path.join(metadata_dir, filename)
                s3.upload_file(file_path, bucket_name, s3_key)
                print(f"Uploaded {filename} to {bucket_name}")
    
    return {"statusCode": 200, "body": "File upload check complete"}
