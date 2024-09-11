import time
from gps_collar_logic import update_elk_positions
from datetime import datetime

# Constants
SECONDS_BETWEEN_POINTS = 2  # 20 seconds per point

# Run the real-time simulation
while True:
    # Update and get the current positions of all elks
    current_positions = update_elk_positions()
    
    # Get the current time
    current_time = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Print the current positions for each elk
    for elk_id, (lat, lon) in enumerate(current_positions, start=1):
        print(f"Elk ID: {elk_id}, Time: {current_time}, Latitude: {lat:.6f}, Longitude: {lon:.6f}")
    
    # Wait before printing the next set of positions
    time.sleep(SECONDS_BETWEEN_POINTS)
    print("\n")  # Separate each time step for clarity
