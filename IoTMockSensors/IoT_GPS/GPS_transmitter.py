import json
import logging
import time
from datetime import datetime
from setup_mqtt import mqtt_connect, log_to_cloudwatch, TOPIC
from gps_collar_logic import update_elk_positions

# Setup logging
logging.basicConfig(level=logging.INFO)
console_testing = False

# Function to publish a message to the MQTT topic
def publish_message(mqtt_client):
    current_positions = update_elk_positions()
    # Update and get the current positions of all elks
    
    # Get the current time
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    message = {
        "message": "Hello from GPSThing!",
        "timestamp": time.time()
    }

    if(console_testing):
         # Print the current positions for each elk
        for elk_id, (lat, lon) in enumerate(current_positions, start=1):
            print(f"Elk ID: {elk_id}, Time: {current_time}, Latitude: {lat:.6f}, Longitude: {lon:.6f}")
    else:
        print('publishing topic')
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
    if(console_testing):
         while True:
            publish_message('') 
            time.sleep(15)
    else:
        mqtt_client = attempt_preamble_setup()

        # Infinite loop to publish messages every 15 seconds
        while True:
            try:
                print("TRYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYYY")
                publish_message(mqtt_client)  # Publish message
                time.sleep(15)  # Wait 15 seconds before next message
            except Exception as e:
                logging.error(f"Error during message publish: {e}. Retrying connection...")
                log_to_cloudwatch(f"Error during message publish: {e}. Retrying connection...")
                mqtt_client = attempt_preamble_setup()  # Retry connection if message publish fails
