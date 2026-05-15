# auto_migrate.py
import os
from django.core.management import call_command
from django.db import OperationalError

def run_migrations():
    try:
        # Only run if DJANGO_SETTINGS_MODULE is set
        if os.environ.get("DJANGO_SETTINGS_MODULE"):
            call_command("migrate", "--noinput")
            print("✅ Migrations applied successfully")
    except OperationalError as e:
        print("⚠️ Database not ready or cannot connect:", e)
    except Exception as e:
        print("⚠️ Migration failed:", e)