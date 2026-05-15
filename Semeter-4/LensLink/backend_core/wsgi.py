"""
WSGI config for backend_core project.

It exposes the WSGI callable as a module-level variable named `application`.

For more information:
https://docs.djangoproject.com/en/6.0/howto/deployment/wsgi/
"""

import os
from django.core.wsgi import get_wsgi_application

# Set the settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend_core.settings')

# Get the WSGI application
application = get_wsgi_application()

# NOTE:
# Do NOT run migrations here.
# On Vercel (serverless), this file can be imported multiple times, 
# and running migrations here will cause AppRegistryNotReady errors 
# and race conditions on the database.

# Migrations should be run once during deployment using a separate command:
#   python manage.py migrate --noinput