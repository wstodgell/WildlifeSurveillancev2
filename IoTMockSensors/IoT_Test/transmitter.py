import time
import boto3
from AWSIoTPythonSDK.MQTTLib import AWSIoTMQTTClient
import logging
import boto3
from botocore.exceptions import ClientError
import json
import requests
import tempfile

# Setup logging
logging.basicConfig(level=logging.INFO)

# Get Endpoint from the AWS Parameter store from ASM
CLIENT_ID = "TestTransmitter"
TOPIC = "test/transmit"

# Function to download the Root CA certificate
def download_root_ca():
    url = "https://www.amazontrust.com/repository/AmazonRootCA1.pem"
    response = requests.get(url)
    
    # Use a cross-platform temporary directory
    with tempfile.NamedTemporaryFile(delete=False, suffix=".pem") as temp_file:
        temp_file.write(response.content)
        root_ca_path = temp_file.name
    
    return root_ca_path

# Function to retrieve the IoT Endpoint
def get_iot_endpoint():
    try:
        client = boto3.client('iot', region_name='us-east-1')
        response = client.describe_endpoint(endpointType='iot:Data-ATS')
        iot_endpoint = response['endpointAddress']
        return iot_endpoint
    except ClientError as e:
        logging.error(f"Error retrieving IoT endpoint: {e}")
        raise e

# Function to retrieve secrets - stored as `IoT/${thingName}/certs`
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
        secret = get_secret_value_response.get('SecretString', None)
        
        # Debugging: Print the raw secret
        print("Raw Secret Retrieved: ", secret)

        # Return the secret string directly (not as JSON)
        return secret

    except ClientError as e:
        print(f"Error retrieving secret: {e}")
        raise e

def parse_secret(secret_string):
    """Manually extract the private key and certificate from the secret string"""
    
    # Extract private key and certificate from the raw string
    private_key_start = secret_string.find("-----BEGIN RSA PRIVATE KEY-----")
    private_key_end = secret_string.find("-----END RSA PRIVATE KEY-----") + len("-----END RSA PRIVATE KEY-----")
    private_key = secret_string[private_key_start:private_key_end]

    certificate_start = secret_string.find("-----BEGIN CERTIFICATE-----")
    certificate_end = secret_string.find("-----END CERTIFICATE-----") + len("-----END CERTIFICATE-----")
    certificate = secret_string[certificate_start:certificate_end]

    return private_key, certificate

def write_to_temp_file(content, filename_prefix):
    """Write the content to a temporary file and return the file path"""
    temp_file_path = f"./{filename_prefix}.pem"
    with open(temp_file_path, 'w') as f:
        f.write(content)
    return temp_file_path

# Function to establish an MQTT connection
def mqtt_connect():
    # Path to the Root CA file
    root_ca = download_root_ca()

    # Retrieve certs from Secrets Manager
    secret = get_secret()

    # Parse the secret manually (since it's not valid JSON)
    private_key, certificate = parse_secret(secret)

    # Write the certificate and private key to temporary files
    cert_file = write_to_temp_file(certificate, 'cert')
    key_file = write_to_temp_file(private_key, 'private_key')

    # Retrieve IoT endpoint dynamically
    iot_endpoint = get_iot_endpoint()

    # Initialize the MQTT client
    mqtt_client = AWSIoTMQTTClient(CLIENT_ID)
    mqtt_client.configureEndpoint(iot_endpoint, 8883)  # Port 8883 for secure MQTT communication
    mqtt_client.configureCredentials(root_ca, key_file, cert_file)

    # Configure the MQTT client connection parameters
    mqtt_client.configureOfflinePublishQueueing(-1)  # Infinite offline publish queueing
    mqtt_client.configureDrainingFrequency(2)  # Draining: 2 Hz
    mqtt_client.configureConnectDisconnectTimeout(10)  # 10 sec
    mqtt_client.configureMQTTOperationTimeout(5)  # 5 sec

    # Connect to AWS IoT Core
    if mqtt_client.connect():
        logging.info("Connected to AWS IoT Core")
    else:
        logging.error("Failed to connect to AWS IoT Core")

    return mqtt_client

# Function to publish a message to the MQTT topic
def publish_message(mqtt_client):
    message = {
        "message": "Hello from TestThing!",
        "timestamp": time.time()
    }
    mqtt_client.publish(TOPIC, json.dumps(message), 1)
    logging.info(f"Published: {json.dumps(message)} to {TOPIC}")

if __name__ == "__main__":
    # Connect to AWS IoT Core
    mqtt_client = mqtt_connect()

    # Publish message
    publish_message(mqtt_client)
    publish_message(mqtt_client)
    publish_message(mqtt_client)
    publish_message(mqtt_client)

    # Disconnect after publishing
    mqtt_client.disconnect()
    logging.info("Disconnected from AWS IoT Core")
