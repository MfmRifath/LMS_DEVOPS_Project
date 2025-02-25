# Use the official Python runtime image
FROM python:3.12 

# Set the working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1  

# Upgrade pip, setuptools, and wheel
RUN pip install --upgrade pip setuptools wheel  
# Copy only requirements.txt first for better caching
COPY requirements.txt /app/

# Install dependencies using pip
RUN pip install --no-cache-dir -r requirements.txt  

# Copy the rest of the Django project
COPY . /app/

# Expose the Django port
EXPOSE 8000  

# Run Django migrations, collect static files, and start the server using gunicorn
CMD ["sh", "-c", "python manage.py migrate && python manage.py collectstatic --noinput && gunicorn --bind 0.0.0.0:8000 lms.wsgi:application"]