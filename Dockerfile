# Use the official Python runtime image
FROM python:3.13  

# Set the working directory
WORKDIR /app

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1  

# Upgrade pip
RUN pip install --upgrade pip  

# Copy only requirements.txt first for better caching
COPY requirements.txt /app/

# Install dependencies using pip
RUN pip install --no-cache-dir -r requirements.txt  

# Copy the rest of the Django project
COPY . /app/

# Expose the Django port
EXPOSE 8000  

# Run Django’s development server
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]