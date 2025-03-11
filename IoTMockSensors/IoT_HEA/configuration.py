import boto3
from colorama import Fore, Style, init
import time
import uuid

CLIENT_ID = "HeaCollar"
HEA_TOPIC_NAME = None
LOG_GROUP = "/docker/HEA"
CERT_SECRET_NAME = "IoT/HEAThing/certs"
TESTING = False
LOG_STREAM = "mqtt_connect"

def setup_config():
    global ENV_TOPIC_NAME
    ssm = boto3.client('ssm')
    # Get a parameter
    response = ssm.get_parameter(
        Name='/iot-topics/hea-topic-name',  # Name of the parameter you want to retrieve
        WithDecryption=False  # Set to True if it's a SecureString parameter
    )

    # Extract the value
    ENV_TOPIC_NAME = response['Parameter']['Value']
    print(f"{Fore.RED}*******************Retrieved {HEA_TOPIC_NAME}{Style.RESET_ALL}")

def get_fresh_publish_interval():
    try:
        ssm = boto3.client('ssm')
        response = ssm.get_parameter(Name='/iot-settings/hea-publish-interval', WithDecryption=False)
        return int(response['Parameter']['Value'])
    except Exception as e:
        print(f"⚠️ Failed to fetch publish interval, using default: {e}")
        return 15  # Fallback default

def create_topic(payload):
    transformed_payload = [
        {
            "sensor_id": sensor_id,
            "elk_id": item['elk_id'],
            "timestamp": item['timestamp'],
            "body_temperature": item['body_temperature'],
            "heart_rate": item['heart_rate'],
            "respiration_rate": item['respiration_rate'],
            "activity_level": item['activity_level'],
            "posture": item['posture'],
            "hydration_level": item['hydration_level'],
            "stress_level": item['stress_level']
        }
        for sensor_id, item in enumerate(payload)
    ]
    return {
        "messageId": str(uuid.uuid4()),
        "topic": ENV_TOPIC_NAME,
        "timestamp": time.time(),
        "payload": transformed_payload
    }

