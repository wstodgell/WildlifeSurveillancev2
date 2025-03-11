import json
import logging
import time
from datetime import datetime
from setup_mqtt import mqtt_connect, log_to_cloudwatch
from hea_logic import generate_health_data 
import configuration
from colorama import Fore, Style, init
import traceback


# Setup logging
logging.basicConfig(level=logging.INFO)

def log_error_with_traceback(e):
  logging.error(f"Exception: {str(e)}")
  logging.error(traceback.format_exc())

def publish_message(mqtt_client):
  try:
    print(f"{Fore.YELLOW}Attempting to Publish Message{Style.RESET_ALL}")
    env_data = generate_health_data()  # Get environment data
    print(f"DEBUG: Environment data generated: {env_data}")  # Debug log

    # Verify the data structure of env_data
    print("Inspecting env_data structure:", env_data)

    # Create a JSON payload to send to AWS IoT Core
    payload = configuration.create_topic(env_data)  # Use env_data here
    print(f"{Fore.GREEN}The payload: {json.dumps(payload, indent=2)}{Style.RESET_ALL}")

    if configuration.TESTING:
      print(f"{Fore.BLUE}Testing mode: Payload generated but not publishing to AWS IoT Core.{Style.RESET_ALL}")
    else:
      # Ensure the mqtt_client is valid before trying to publish
      if mqtt_client:
        print(f'Publishing topic: {Fore.GREEN}{configuration.ENV_TOPIC_NAME}{Style.RESET_ALL}')
        mqtt_client.publish(configuration.ENV_TOPIC_NAME, json.dumps(payload), 1)
        logging.info(f"Published: {json.dumps(payload)} to {configuration.ENV_TOPIC_NAME}")
        log_to_cloudwatch(f"Published: {json.dumps(payload)} to {configuration.ENV_TOPIC_NAME}")
      else:
        logging.error(f"MQTT client is None. Cannot publish message.")
  except Exception as e:
    log_error_with_traceback(e)
    raise


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
    configuration.setup_config()
    # Continuously try to establish connection until successful
    if(configuration.TESTING):
         while True:
            publish_message('') 
            time.sleep(15)
    else:
        mqtt_client = attempt_preamble_setup()

        # Infinite loop to publish messages every 15 seconds
        while True:
            try:
                publish_message(mqtt_client)  # Publish message
                print(f"Publish Interval Value: {configuration.get_fresh_publish_interval()}")
                time.sleep(configuration.get_fresh_publish_interval())
            except Exception as e:
                logging.error(f"Error during message publish: {e}. Retrying connection...")
                log_to_cloudwatch(f"Error during message publish: {e}. Retrying connection...")
                mqtt_client = attempt_preamble_setup()  # Retry connection if message publish fails
