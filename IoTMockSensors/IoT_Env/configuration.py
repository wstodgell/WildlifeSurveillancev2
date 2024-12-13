import boto3
from colorama import Fore, Style, init
import time
import uuid

CLIENT_ID = "GnvCollar"
ENV_TOPIC_NAME = None
LOG_GROUP = "/docker/ENV"
CERT_SECRET_NAME = "IoT/ENVThing/certs"
TESTING = False
LOG_STREAM = "mqtt_connect"

def setup_config():
    global ENV_TOPIC_NAME
    ssm = boto3.client('ssm')
    # Get a parameter
    response = ssm.get_parameter(
        Name='/iot-topics/env-topic-name',  # Name of the parameter you want to retrieve
        WithDecryption=False  # Set to True if it's a SecureString parameter
    )

    # Extract the value
    ENV_TOPIC_NAME = response['Parameter']['Value']
    print(f"{Fore.RED}*******************Retrieved {ENV_TOPIC_NAME}{Style.RESET_ALL}")


def create_topic(payload):
  transformed_payload = [
    {"sensor_id": sensor_id, "lat": lat, "lon": lon}
    for sensor_id, (lat, lon) in enumerate(payload)
  ]
  return {
    "messageId": str(uuid.uuid4()),
    "topic": ENV_TOPIC_NAME,
    "timestamp": time.time(),
    "payload": transformed_payload
  }
