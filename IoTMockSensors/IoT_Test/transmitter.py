import time
import json
import logging
from setup_mqtt import mqtt_connect, log_to_cloudwatch, TOPIC

# Setup logging
logging.basicConfig(level=logging.INFO)

# Function to publish a message to the MQTT topic
def publish_message(mqtt_client):
    message = {
        "message": "Hello from TestThing!",
        "timestamp": time.time()
    }
    mqtt_client.publish(TOPIC, json.dumps(message), 1)
    logging.info(f"Published: {json.dumps(message)} to {TOPIC}")
    log_to_cloudwatch(f"Published: {json.dumps(message)} to {TOPIC}")

# Function to attempt preamble setup and connection
def attempt_preamble_setup():
    while True:
        try:
            logging.info("Attempting to connect to AWS IoT Core...")
            mqtt_client = mqtt_connect()  # Try connecting
            logging.info("MQTT connection successful. Entering message publish loop.")
            return mqtt_client  # Return the client if successful
        except Exception as e:
            logging.error(f"Connection failed: {e}. Retrying in 10 seconds...")
            log_to_cloudwatch(f"Connection failed: {e}. Retrying in 10 seconds...")
            time.sleep(10)  # Wait 10 seconds before retrying

if __name__ == "__main__":
    # Continuously try to establish connection until successful
    mqtt_client = attempt_preamble_setup()

    # Infinite loop to publish messages every 15 seconds
    while True:
        try:
            publish_message(mqtt_client)  # Publish message
            time.sleep(15)  # Wait 15 seconds before next message
        except Exception as e:
            logging.error(f"Error during message publish: {e}. Retrying connection...")
            log_to_cloudwatch(f"Error during message publish: {e}. Retrying connection...")
            mqtt_client = attempt_preamble_setup()  # Retry connection if message publish fails
