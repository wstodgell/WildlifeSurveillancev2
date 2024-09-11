import boto3
import os
import time
import json
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
from gps_collar_logic import update_elk_positions
import logging


logging.basicConfig(level=logging.INFO)

# AWS IoT Core details
MQTT_HOST = "a3f4hutyg6alsr-ats.iot.us-east-1.amazonaws.com"  # Replace with your AWS IoT Core endpoint - Iot Core -> Settings -> endpoint
CLIENT_ID = "GPSCollarPublisher"
TOPIC = "gps/elk"  # The MQTT topic where data will be sent

# S3 bucket details (if storing certs in S3)
S3_BUCKET = "iot-gps-mqtt-messages-bucket"
S3_CERT_PATH = "certs/"

# Download certs from S3 to a temporary directory (only if using S3 to store certs)
def download_certs_from_s3():
    s3 = boto3.client('s3')
    cert_dir = '/tmp/certs'
    os.makedirs(cert_dir, exist_ok=True)

    certs = ["AmazonRootCA1.pem", "private-key.pem", "certificate.pem.crt"]
    for cert in certs:
        s3.download_file(S3_BUCKET, S3_CERT_PATH + cert, f"{cert_dir}/{cert}")

    return cert_dir

# Path to certificates
cert_dir = download_certs_from_s3()  # Only if pulling from S3, otherwise set to cert directory path

# Initialize the AWS IoT MQTT Client
mqtt_client = AWSIoTMQTTClient(CLIENT_ID)
mqtt_client.configureEndpoint(MQTT_HOST, 8883)

# Update with correct cert paths
mqtt_client.configureCredentials(f"{cert_dir}/AmazonRootCA1.pem", f"{cert_dir}/private-key.pem", f"{cert_dir}/certificate.pem.crt")

# Configure MQTT client connection parameters
mqtt_client.configureAutoReconnectBackoffTime(1, 32, 20)
mqtt_client.configureOfflinePublishQueueing(-1)  # Infinite offline publish queueing
mqtt_client.configureDrainingFrequency(2)  # Draining: 2 Hz
mqtt_client.configureConnectDisconnectTimeout(10)  # 10 seconds
mqtt_client.configureMQTTOperationTimeout(5)  # 5 seconds

# Connect to AWS IoT Core
try:
    mqtt_client.connect()
    logging.info('Successfully connected to AWS IoT Core at {}'.format(MQTT_HOST))
except Exception as e:
    logging.error(f'Failed to connect to IoT Core: {e}')

# Simulate elk GPS collar data and publish it to IoT Core
for _ in range(100):  # Run for 100 updates, adjust as needed
    elk_positions = update_elk_positions()

    for elk_id, position in enumerate(elk_positions):
        lat, lon = position

        # Create a JSON payload to send to AWS IoT Core
        payload = {
            "elk_id": elk_id,
            "latitude": lat,
            "longitude": lon,
            "timestamp": time.time()  # Current time as a timestamp
        }

        # Convert the payload to a JSON string
        payload_json = json.dumps(payload)

        # Publish the payload to the MQTT topic
        try:
            mqtt_client.publish(TOPIC, payload_json, 1)
            logging.info(f'Successfully published GPS data for elk {elk_id}: {payload_json}')
        except Exception as e:
            logging.error(f'Failed to publish data for elk {elk_id}: {e}')

        print(f"Published GPS data for elk {elk_id}: {payload_json}")

    time.sleep(20)  # Wait 20 seconds before sending the next update

# Disconnect after simulation
mqtt_client.disconnect()
