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

def get_fresh_publish_interval():
    try:
        ssm = boto3.client('ssm')
        response = ssm.get_parameter(Name='/iot-settings/env-publish-interval', WithDecryption=False)
        return int(response['Parameter']['Value'])
    except Exception as e:
        print(f"⚠️ Failed to fetch publish interval, using default: {e}")
        return 15  # Fallback default



def create_topic(payload):
    transformed_payload = [
        {
            "sensor_id": sensor_id,
            "lat": item['latitude'],
            "lon": item['longitude'],
            "temperature": item['temperature'],
            "humidity": item['humidity'],
            "wind_direction": item['wind_direction']
        }
        for sensor_id, item in enumerate(payload)
    ]
    return {
        "messageId": str(uuid.uuid4()),
        "topic": ENV_TOPIC_NAME,
        "timestamp": time.time(),
        "payload": transformed_payload
    }
