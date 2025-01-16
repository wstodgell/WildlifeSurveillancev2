import json
import boto3
from datetime import datetime
from decimal import Decimal

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('GpsDataTable')

def lambda_handler(event, context):
    # Log the entire incoming event to understand its structure
    print(f"Received event: {json.dumps(event)}")
    
    # Safely access 'payload' and 'topic' from the event (since IoT Core sends data inside 'payload')
    payload = event.get('payload', [])  # Extract GPS data list from 'payload'
    topic = event.get('topic', 'unknown_topic')  # Extract 'topic'
    
    # Check if payload contains GPS data
    if payload:
        try:
            for gps_data in payload:
                # Extract the individual elk data (lat, lon, elk_id)
                elk_id = gps_data.get('elk_id')
                lat = gps_data.get('lat')
                lon = gps_data.get('lon')

                # Convert float values to Decimal for DynamoDB
                lat = Decimal(str(lat))
                lon = Decimal(str(lon))
                
                # Store each elk's data in DynamoDB
                table.put_item(
                    Item={
                        'ElkId': str(elk_id),  # Store elk_id as string
                        'Topic': topic,
                        'Timestamp': datetime.utcnow().isoformat(),
                        'Latitude': lat,
                        'Longitude': lon
                    }
                )
                print(f"Stored GPS data for ElkId {elk_id} in topic {topic}")

        except Exception as e:
            print(f"Error storing data in DynamoDB: {str(e)}")
    else:
        print("No GPS data found in the event.")
