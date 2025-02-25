import os
from django.core.wsgi import get_wsgi_application

# Set the settings module before importing any settings
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "lms_backend.settings")

from mongoengine import connect
from django.conf import settings

# Now that settings are configured, connect to MongoDB
connect(host=settings.MONGO_URI)

application = get_wsgi_application()