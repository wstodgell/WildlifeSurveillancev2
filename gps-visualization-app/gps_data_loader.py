import boto3
from decimal import Decimal
import json

# Initialize DynamoDB client
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('GpsDataTable')

def get_gps_data():
    # Scan the DynamoDB table (or use Query if partition/sort keys are known)
    response = table.scan()
    data = response.get('Items', [])

    gps_coordinates = []

    # Extract GPS coordinates from the DynamoDB items
    for item in data:
        # Assuming each 'Data' field in DynamoDB contains 'lat' and 'lon'
        for gps_data in item['Data']:  # If 'Data' contains the payload array
            lat = float(gps_data['lat'])
            lon = float(gps_data['lon'])
            gps_coordinates.append([lat, lon])

    return gps_coordinates

# Get GPS data from DynamoDB
gps_data = get_gps_data()

# Optionally, save to a file for debugging
with open('gps_data.json', 'w') as f:
    json.dump(gps_data, f, indent=4)
