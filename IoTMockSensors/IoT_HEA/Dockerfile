# Start with the base Python image
FROM python:3.12-slim

# Set the working directory inside the container
WORKDIR /app

# Copy the rest of the app code (including Mock_GPSCollar_AWS.py) into the /app directory
COPY . .

# Install the dependencies listed in the requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Keep the container running without running the script yet - this is so ECS service doesn't fail over and over
#CMD ["sleep", "infinity"]

# Define the entrypoint: Run Mock_GPSCollar_AWS.py when the container starts
CMD ["python", "hea_transmitter.py"]

