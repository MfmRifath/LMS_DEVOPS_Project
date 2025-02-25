import os
from django.core.wsgi import get_wsgi_application

# Set the settings module so that Django can load your configuration
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lms_backend.settings")

from mongoengine import connect
from django.conf import settings

# Optional: Log the Mongo URI for debugging (ensure logging is configured)
import logging
logger = logging.getLogger(__name__)
logger.info("Connecting to MongoDB at: %s", settings.MONGO_URI)

# Connect to MongoDB using the MONGO_URI from settings
connect(host=settings.MONGO_URI)

# Create the WSGI application callable
application = get_wsgi_application()