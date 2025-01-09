import random
import math

# Constants for environment simulation
NUM_SENSORS = 10  # Adjust the number of sensors as needed
RADIUS = 0.1  # Diameter for sensor coverage in degrees, approx 5 km

# Initialize sensor positions with random starting points
sensor_positions = []
for _ in range(NUM_SENSORS):
    start_lat, start_lon = 53.0, -127.0  # Central starting point for the sensors
    angle = random.uniform(0, 2 * math.pi)
    distance = random.uniform(0, RADIUS)
    delta_lat = distance * math.cos(angle) / 111  # Convert degrees to approximate km
    delta_lon = distance * math.sin(angle) / (111 * math.cos(math.radians(start_lat)))
    sensor_positions.append([start_lat + delta_lat, start_lon + delta_lon])


def get_wind_direction(base_direction="East"):
    # Variability factor (in degrees)
    variability = 10  # The wind can vary by +/- 10 degrees
    direction_change = random.uniform(-variability, variability)
    
    directions = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"]
    base_index = directions.index(base_direction)
    
    # Calculate new direction index with wrap-around
    num_directions = len(directions)
    new_index = (base_index + int(direction_change // (360 / num_directions))) % num_directions
    
    return directions[new_index]

def update_environment():
    # Simulate environmental data for each sensor
    environment_data = []
    for lat, lon in sensor_positions:
        # Generate random environmental data
        temperature = random.uniform(-5, 30)  # Temperature in Celsius
        humidity = random.uniform(20, 100)  # Humidity in percentage
        wind_direction = get_wind_direction()  # Static wind direction

        # Append data for each sensor
        environment_data.append({
            "latitude": lat,
            "longitude": lon,
            "temperature": temperature,
            "humidity": humidity,
            "wind_direction": wind_direction
        })
    
    return environment_data