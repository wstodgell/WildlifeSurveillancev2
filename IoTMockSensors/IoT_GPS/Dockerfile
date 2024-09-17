# Start with the base image
FROM python:3.12-slim

# Set the working directory
WORKDIR /app

# Copy the shared requirements.txt from IoTMockSensors
COPY ../IoTMockSensors/requirements.txt .

# Install the shared dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app code for IoT_CameraTrap
COPY . .

# Define your entrypoint or command to run the IoT_CameraTrap service
CMD ["python", "Mock_GPSCollar_AWS.py"]
