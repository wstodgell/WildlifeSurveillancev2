import json
import boto3
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('EnvDataTable')  # Use the new table for environmental data

def lambda_handler(event, context):
    # Log the entire incoming event to understand its structure
    print(f"Received event: {json.dumps(event)}")
    
    # Safely access 'payload' and 'topic' from the event (since IoT Core sends data inside 'payload')
    payload = event.get('payload', [])  # Extract ENV data list from 'payload'
    topic = event.get('topic', 'unknown_topic')  # Extract 'topic'
    timestamp = datetime.utcnow().isoformat()
    # Check if payload contains ENV data
    if payload:
        try:
            for env_data in payload:
                # Extract the individual sensor data
                sensor_id = env_data.get('sensor_id')
                lat = env_data.get('lat')
                lon = env_data.get('lon')
                temperature = env_data.get('temperature')
                humidity = env_data.get('humidity')
                wind_direction = env_data.get('wind_direction')

                # Convert float values to Decimal for DynamoDB
                lat = Decimal(str(lat))
                lon = Decimal(str(lon))
                temperature = Decimal(str(temperature))
                humidity = Decimal(str(humidity))
                
                # Store each sensor's data in DynamoDB
                table.put_item(
                    Item={
                        'SensorId': str(sensor_id),  # Store sensor_id as string
                        'Topic': topic,
                        'Timestamp': str(timestamp),
                        'Latitude': lat,
                        'Longitude': lon,
                        'Temperature': temperature,
                        'Humidity': humidity,
                        'WindDirection': wind_direction
                    }
                )
                print(f"✅ SensorId {sensor_id} data written to DynamoDB (from IoT Topic: {topic})")


        except Exception as e:
            print(f"Error storing data in DynamoDB: {str(e)}")
    else:
        print("No ENV data found in the event.")
