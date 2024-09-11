import folium
import pandas as pd
import random

# Load the dataset
df = pd.read_csv('elk_movement.csv')

# Initialize a Folium map centered around the average latitude and longitude
center_lat = df['Latitude'].mean()
center_lon = df['Longitude'].mean()
map_ = folium.Map(location=[center_lat, center_lon], zoom_start=12)

# Function to generate a random color
def random_color():
    return "#{:06x}".format(random.randint(0, 0xFFFFFF))

# Plot each elk's path
for elk_id, group in df.groupby('Animal_ID'):
    # Convert the DataFrame group to a list of (lat, lon) tuples
    points = group[['Latitude', 'Longitude']].values.tolist()
    
    # Plot the nodes
    for point in points:
        folium.CircleMarker(
            location=[point[0], point[1]],
            radius=3,
            color=random_color(),
            fill=True,
            fill_color=random_color(),
            fill_opacity=0.6
        ).add_to(map_)
    
    # Plot the path
    folium.PolyLine(
        locations=points,
        color=random_color(),
        weight=2.5,
        opacity=0.7
    ).add_to(map_)

# Save the map to an HTML file
map_.save('elk_movement_map.html')

print("Map has been saved to elk_movement_map.html")
