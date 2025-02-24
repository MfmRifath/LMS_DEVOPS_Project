#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to the project directory
cd /home/ubuntu/LMS_DEVOPS_Project || exit

# Stop the existing service (if any)
echo "🔴 Stopping any running application..."
sudo systemctl stop lms_django || true

# Pull the latest changes from GitHub
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies (example for Django)
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Restart the application
echo "🚀 Restarting the application..."
sudo systemctl start lms_django

echo "✅ Deployment complete!"