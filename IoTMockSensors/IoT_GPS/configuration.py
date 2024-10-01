import boto3
from colorama import Fore, Style, init
import time
import uuid

CLIENT_ID = "GPSCollar"
GPS_TOPIC_NAME = None
LOG_GROUP = "/docker/GPS"
CERT_SECRET_NAME = "IoT/GPSThing/certs"
TESTING = False
LOG_STREAM = "mqtt_connect"

def setup_config():
    global GPS_TOPIC_NAME
    ssm = boto3.client('ssm')
    # Get a parameter
    response = ssm.get_parameter(
        Name='/iot-topics/gps-topic-name',  # Name of the parameter you want to retrieve
        WithDecryption=False  # Set to True if it's a SecureString parameter
    )

    # Extract the value
    GPS_TOPIC_NAME = response['Parameter']['Value']
    print(f"{Fore.RED}*******************Retrieved {GPS_TOPIC_NAME}{Style.RESET_ALL}")


def create_topic(payload):
  transformed_payload = [
    {"elk_id": elk_id, "lat": lat, "lon": lon}
    for elk_id, (lat, lon) in enumerate(payload)
  ]
  return {
    "messageId": str(uuid.uuid4()),
    "topic": GPS_TOPIC_NAME,
    "timestamp": time.time(),
    "payload": transformed_payload
  }
