# Use the official Python image
FROM python:3.12

# Set environment variables to avoid Python bytecode creation
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PIP_NO_CACHE_DIR=off
ENV PIPENV_VENV_IN_PROJECT=1

# Set the working directory
WORKDIR /LMS_DEVOPS_PROJECT

# Install system dependencies
RUN pip install --upgrade pip && pip install pipenv

# Copy Pipfile and Pipfile.lock
COPY Pipfile Pipfile.lock /LMS_DEVOPS_PROJECT/

# Install dependencies from Pipfile.lock
RUN pipenv install --deploy

# Copy project files
COPY . /LMS_DEVOPS_PROJECT/

# Expose port 8000 for Django
EXPOSE 8000

# Run Django server
CMD ["pipenv", "run", "python", "manage.py", "runserver", "0.0.0.0:8000"]