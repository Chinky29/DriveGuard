# DriveGuard Enhanced ML Service Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and image decoding
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy service source code
COPY . .

# Expose service port (default 5001)
EXPOSE 5001

ENV PORT=5001
ENV PYTHONUNBUFFERED=1

# Run with Gunicorn WSGI server
CMD ["gunicorn", "-b", "0.0.0.0:5001", "--workers", "2", "--timeout", "60", "app:app"]
