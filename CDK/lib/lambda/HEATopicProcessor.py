import json
import boto3
import decimal
from datetime import datetime
from decimal import Decimal
import traceback  # Added for better debugging

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('HeaDataTable')  # Use the table for elk health data

# Safe Decimal conversion function
def safe_decimal(value, default=0):
    """Convert to Decimal safely, defaulting to a given value if conversion fails."""
    try:
        return Decimal(str(value))
    except (ValueError, TypeError, decimal.InvalidOperation):
        return Decimal(default)  # Default to 0 if invalid

def lambda_handler(event, context):
    # Log the entire incoming event to understand its structure
    print(f"Received event: {json.dumps(event)}")
    
    # Safely access 'payload' and 'topic' from the event
    payload = event.get('payload', [])  # Extract elk health data list
    topic = event.get('topic', 'unknown_topic')  # Extract 'topic'
    
    # Check if payload contains elk health data
    if payload:
        try:
            for elk_data in payload:
                # Extract the individual elk's health data
                sensor_id = elk_data.get('sensor_id')
                elk_id = elk_data.get('elk_id')
                timestamp = str(elk_data.get('timestamp'))  # Ensure this is a string!
                
                # Log values before storing
                print(f"Processing ElkId {elk_id}:")
                print(f"  - BodyTemperature: {elk_data.get('body_temperature')}")
                print(f"  - HeartRate: {elk_data.get('heart_rate')}")
                print(f"  - RespirationRate: {elk_data.get('respiration_rate')}")
                print(f"  - ActivityLevel: {elk_data.get('activity_level')}")
                print(f"  - HydrationLevel: {elk_data.get('hydration_level')}")
                print(f"  - StressLevel: {elk_data.get('stress_level')}")

                # Convert values safely
                body_temperature = safe_decimal(elk_data.get('body_temperature'))
                heart_rate = safe_decimal(elk_data.get('heart_rate'))
                respiration_rate = safe_decimal(elk_data.get('respiration_rate'))
                activity_level = safe_decimal(elk_data.get('activity_level'))
                hydration_level = safe_decimal(elk_data.get('hydration_level'))
                stress_level = safe_decimal(elk_data.get('stress_level'))

                # Store each elk's health data in DynamoDB
                table.put_item(
                    Item={
                        'SensorId': str(sensor_id),  # Ensure this matches your table PK
                        'ElkId': str(elk_id),  # Ensure IDs are stored as strings
                        'Topic': topic,
                        'Timestamp': timestamp,  # Ensure timestamp is stored as a string
                        'BodyTemperature': body_temperature,
                        'HeartRate': heart_rate,
                        'RespirationRate': respiration_rate,
                        'ActivityLevel': activity_level,
                        'Posture': elk_data.get('posture', 'Unknown'),  # Default to 'Unknown' if missing
                        'HydrationLevel': hydration_level,
                        'StressLevel': stress_level
                    }
                )
                print(f"✅ ElkId {elk_id} health data written to DynamoDB (from IoT Topic: {topic})")

        except Exception as e:
            print(f"Error storing data in DynamoDB: {traceback.format_exc()}")  # Full error traceback
    else:
        print("No elk health data found in the event.")
