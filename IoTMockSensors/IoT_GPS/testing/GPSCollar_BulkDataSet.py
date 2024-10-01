import csv
import random
import math
from datetime import datetime, timedelta

# Constants
NUM_ELKS = 8  # Number of elk
RADIUS = 0.025  # Roughly 1 km in latitude/longitude degrees
TOTAL_HOURS = 6 * 24  # 6 days

# Function to generate random points within a circle
def generate_random_point(center_lat, center_lon, radius):
    angle = random.uniform(0, 2 * math.pi)
    distance = random.uniform(0, radius)
    delta_lat = distance * math.cos(angle) / 111  # Approximate conversion from km to degrees
    delta_lon = distance * math.sin(angle) / (111 * math.cos(math.radians(center_lat)))
    return center_lat + delta_lat, center_lon + delta_lon

# File name for CSV output
csv_filename = 'elk_movement.csv'

# Create a list to store the data
data = []

# Initialize current time
current_time = datetime.now()

# Generate data for each elk
for elk_id in range(1, NUM_ELKS + 1):
    # Generate random start and end points
    start_lat, start_lon = generate_random_point(53.0, -127.0, RADIUS)
    end_lat, end_lon = generate_random_point(53.2, -128.0, RADIUS)
    
    # Define the step increments for latitude and longitude
    lat_step = (end_lat - start_lat) / TOTAL_HOURS
    lon_step = (end_lon - start_lon) / TOTAL_HOURS

    # Initialize starting latitude and longitude
    lat = start_lat
    lon = start_lon

    # Generate data for each hour
    for hour in range(TOTAL_HOURS):
        # Add larger random deviations to create a more wild meandering path
        lat += lat_step + random.uniform(-0.002, 0.002)
        lon += lon_step + random.uniform(-0.002, 0.002)
        timestamp = current_time + timedelta(hours=hour)
        # Create a row of data
        data.append([elk_id, timestamp.strftime('%Y-%m-%d %H:%M:%S'), lat, lon])

# Write the data to a CSV file
with open(csv_filename, mode='w', newline='') as file:
    writer = csv.writer(file)
    # Write the header
    writer.writerow(['Animal_ID', 'Timestamp', 'Latitude', 'Longitude'])
    # Write the data rows
    writer.writerows(data)

print(f"Elk movement data has been written to {csv_filename}")
