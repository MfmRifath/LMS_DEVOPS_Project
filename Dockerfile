# Use Python 3.10.12 as specified in the requirements
FROM python:3.10.12

# Set the working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DEBUG=0

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    gcc \
    default-libmysqlclient-dev \
    netcat-traditional \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip and install Python tools
RUN pip install --upgrade pip setuptools wheel

# Copy requirements first for better layer caching
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# Install MongoDB client for Python
RUN pip install pymongo[srv]

# Install Gunicorn as specified in requirements
RUN pip install gunicorn==21.2.0

# Copy the Django project
COPY . /app/

# Create an entrypoint script for debugging
RUN echo '#!/bin/bash\n\
echo "=== ENVIRONMENT VARIABLES ==="\n\
env | grep -v SECRET_KEY | grep -v MONGO_URI\n\
echo "=== TESTING DJANGO SETTINGS ==="\n\
python manage.py check\n\
echo "=== STARTING APPLICATION ==="\n\
exec "$@"' > /app/entrypoint.sh && \
chmod +x /app/entrypoint.sh

# Create a directory for static files
RUN mkdir -p /app/staticfiles

# Collect static files
RUN python manage.py collectstatic --noinput || echo "Static collection will be done at runtime"

# Expose the Django port
EXPOSE 8000

# Use entrypoint script for debugging
ENTRYPOINT ["/app/entrypoint.sh"]

# Run migrations and start Gunicorn
CMD ["sh", "-c", "python manage.py migrate && gunicorn --bind 0.0.0.0:8000 lms_backend.wsgi:application"]