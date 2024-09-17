# Start with the base Python image
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the requirements.txt into the /app directory inside the container
COPY requirements.txt .

# Install the dependencies listed in the requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the app code (including Mock_GPSCollar_AWS.py) into the /app directory
COPY . .

# Debugging: List files in /app to verify everything is copied
RUN ls -la /app && cat /app/Mock_GPSCollar_AWS.py

# Define the entrypoint: Run Mock_GPSCollar_AWS.py when the container starts
CMD ["python", "Mock_GPSCollar_AWS.py"]
