import json
import random
import time

# Constants
NUM_ELKS = 8  # Number of elk being tracked

# Function to generate health data for elk
def generate_health_data():
    elk_health_data = []
    
    for elk_id in range(1, NUM_ELKS + 1):
        elk_data = {
            "elk_id": elk_id,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "body_temperature": round(random.uniform(36.5, 39.5), 1),  # Normal: 37.0 - 39.0°C
            "heart_rate": random.randint(30, 50),  # Normal: 30 - 45 BPM
            "respiration_rate": random.randint(10, 35),  # Normal: 10 - 30 breaths per min
            "activity_level": round(random.uniform(0, 1), 2),  # 0 (resting) to 1 (high movement)
            "posture": random.choice(["Standing", "Lying Down", "On Side"]),
            "hydration_level": round(random.uniform(50, 100), 1),  # Percentage
            "stress_level": round(random.uniform(0, 10), 2),  # 0 (calm) to 10 (high stress)
        }
        elk_health_data.append(elk_data)
    
    return elk_health_data

# Generate sample data
health_data = generate_health_data()

# Save to JSON file
with open("elk_health_data.json", "w") as json_file:
    json.dump(health_data, json_file, indent=4)

print("Elk health data saved to elk_health_data.json")
