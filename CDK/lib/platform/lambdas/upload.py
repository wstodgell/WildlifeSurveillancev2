import os
import boto3

s3 = boto3.client('s3')

def handler(event, context):
    # Get the bucket name from environment variables
    bucket_name = os.getenv('S3_BUCKET_NAME')
    
    # Local image directory inside Lambda
    image_dir = '/mnt/images'  # This directory will be bundled with the Lambda

    # Check each file in the image directory and upload it to S3 if it doesn't already exist
    for filename in os.listdir(image_dir):
        if filename.endswith((".jpg", ".png")):
            s3_key = f"images/{filename}"
            
            # Check if the file already exists in S3
            try:
                s3.head_object(Bucket=bucket_name, Key=s3_key)
                print(f"{filename} already exists, skipping upload.")
            except s3.exceptions.ClientError:
                # If the file does not exist, upload it
                file_path = os.path.join(image_dir, filename)
                s3.upload_file(file_path, bucket_name, s3_key)
                print(f"Uploaded {filename} to {bucket_name}")

    return {"statusCode": 200, "body": "File upload check complete"}
