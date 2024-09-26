import json
import boto3
from datetime import datetime
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('GpsDataTable')

def lambda_handler(event, context):
    # Log the entire incoming event to understand its structure
    print(f"Received event: {json.dumps(event)}")
    
    # Safely access 'payload' and 'topic' from the event (since IoT Core sends data inside 'payload')
    gps_data = event.get('payload', {})  # Extract GPS data from 'payload'
    topic = event.get('topic', 'unknown_topic')  # Extract 'topic'
    
    # Convert float values to Decimal for DynamoDB
    if gps_data:
        try:
            # Convert float values to Decimal
            gps_data['latitude'] = Decimal(str(gps_data['latitude']))
            gps_data['longitude'] = Decimal(str(gps_data['longitude']))
            gps_data['altitude'] = Decimal(str(gps_data['altitude']))
            
            # Store the data in DynamoDB
            table.put_item(
                Item={
                    'Topic': topic,
                    'Timestamp': datetime.utcnow().isoformat(),
                    'Data': gps_data
                }
            )
            print(f"Stored GPS data for topic {topic}")
        except Exception as e:
            print(f"Error storing data in DynamoDB: {str(e)}")
    else:
        print("No GPS data found in the event.")
