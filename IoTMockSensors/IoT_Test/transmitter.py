import time
import boto3
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import logging


import logging
logging.basicConfig(level=logging.INFO)

# Test Logging
logging.info("This is Info Logging")
logging.error("This is error logging")

# Endpoint to IoT_Cod.  IoT CORE > Settings -> 
IOTC_ENDPOINT = "a3hakddmh1b2fi-ats.iot.us-east-1.amazonaws.com"  # Replace with your AWS IoT Core endpoint

#CLIENT_ID identifies *this* python script to IoT Core.
CLIENT_ID = "TestTransmitter"
TOPIC = "test/transmit"  # The MQTT topic where data will be sent
# **********************************

# Use this code snippet in your app.
# If you need more information about configurations
# or implementing the sample code, visit the AWS docs:
# https://aws.amazon.com/developer/language/python/

import boto3
from botocore.exceptions import ClientError


def get_secret():

    secret_name = "IoT/TestThing/certs"
    region_name = "us-east-1"

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(
        service_name='secretsmanager',
        region_name=region_name
    )

    try:
        get_secret_value_response = client.get_secret_value(
            SecretId=secret_name
        )
    except ClientError as e:
        # For a list of exceptions thrown, see
        # https://docs.aws.amazon.com/secretsmanager/latest/apireference/API_GetSecretValue.html
        raise e

    secret = get_secret_value_response['SecretString']

    # Your code goes here.
    print(secret)

get_secret()