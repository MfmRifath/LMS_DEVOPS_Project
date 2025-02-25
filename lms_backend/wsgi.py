"""
WSGI config for lms_backend project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/3.1/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application
from mongoengine import connect
from django.conf import settings

# Connect to MongoDB using mongoengine
connect(host=settings.MONGO_URI)

application = get_wsgi_application()