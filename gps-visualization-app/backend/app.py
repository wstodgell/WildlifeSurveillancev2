# app.py
from flask import Flask, jsonify
import boto3

app = Flask(__name__)

# DynamoDB configuration
dynamodb = boto3.resource('dynamodb', region_name='us-east-1')
table = dynamodb.Table('GpsDataTable')

# Fetch GPS data from DynamoDB
@app.route('/gps-data', methods=['GET'])
def get_gps_data():
    try:
        response = table.scan()  # Fetch all items from the table
        return jsonify(response['Items'])
    except Exception as e:
        return jsonify({'error': str(e)})


@app.route('/', methods=['GET'])
def home():
    return "GPS Data API is running. Use /gps-data to fetch the data."

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
