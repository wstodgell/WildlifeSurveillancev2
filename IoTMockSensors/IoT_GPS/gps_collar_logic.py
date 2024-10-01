import random
import math

#Summary: Initializes 8 elk in random positions within specific 'circle'.
#   update_elk_positions will move the elk in a random faions (longitude wise) but to the east (latitude wise)

# Constants
NUM_ELKS = 8  # Number of elk
RADIUS = 0.025  # Roughly 1 km in latitude/longitude degrees

# Initialize elk positions without elk_id, only lat and lon
elk_positions = []
for _ in range(NUM_ELKS):
  start_lat, start_lon = 53.0, -127.0  # Central starting point
  angle = random.uniform(0, 2 * math.pi)
  distance = random.uniform(0, RADIUS)
  delta_lat = distance * math.cos(angle) / 111
  delta_lon = distance * math.sin(angle) / (111 * math.cos(math.radians(start_lat)))
  initial_lat = start_lat + delta_lat
  initial_lon = start_lon + delta_lon
  elk_positions.append([initial_lat, initial_lon])

# Function to update elk positions
def update_elk_positions():
  for i, (lat, lon) in enumerate(elk_positions):
    # Move each elk towards a final point, adding randomness for a meandering path
    end_lat, end_lon = 53.2, -128.0  # Central ending point
    lat_step = (end_lat - lat) / 100  # Smaller steps for more meandering
    lon_step = (end_lon - lon) / 100

    # Add randomness to each step
    lat += lat_step + random.uniform(-0.002, 0.002)
    lon += lon_step + random.uniform(-0.002, 0.002)

    # Update elk's position
    elk_positions[i] = [lat, lon]
  print(f"elk_positions {elk_positions}")
  return elk_positions

