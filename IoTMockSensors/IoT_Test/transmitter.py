import time
import boto3
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import logging


import logging
logging.basicConfig(level=logging.INFO)

# Test Logging
logging.info("This is Info Logging")
logging.error("This is error logging")

# Endpoint to IoT_Cod - communicate to IoT Core over the MQTT protocol.  Example: az4voj63ln50g-ats.iot.us-east-1.amazonaws.com
IOTC_ENDPOINT = "az4voj63ln50g-ats.iot.us-east-1.amazonaws.com"  # Replace with your AWS IoT Core endpoint

#CLIENT_ID identifies *this* python script to IoT Core.
CLIENT_ID = "TestTransmitter"
TOPIC = "test/transmit"  # The MQTT topic where data will be sent

while(True):
    time.sleep(1)  # Wait 20 seconds before sending the next update
    print("Testing!!!")
