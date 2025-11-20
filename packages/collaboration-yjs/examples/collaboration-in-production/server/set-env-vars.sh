#!/bin/bash

# Set Environment Variables for Cloud Run Service
# Reads from .env file

set -e

SERVICE_NAME="superdoc-collab-demo"
REGION="us-central1"

echo "🔧 Setting environment variables for $SERVICE_NAME..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file with your environment variables."
    echo "You can copy from .env.example and update the values."
    exit 1
fi

# Load environment variables from .env file
echo "📂 Loading variables from .env file..."
export $(grep -v '^#' .env | xargs)

# Validate required variables
if [ -z "$JWT_SECRET" ] || [ -z "$DB_NAME" ] || [ -z "$DB_HOST" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ]; then
    echo "❌ Missing required environment variables!"
    echo "Please make sure your .env file contains: JWT_SECRET, DB_NAME, DB_HOST, DB_USER, DB_PASSWORD"
    exit 1
fi

echo "✅ Loaded variables from .env file"

# Set environment variables
gcloud run services update $SERVICE_NAME \
  --set-env-vars="JWT_SECRET=$JWT_SECRET,DB_NAME=$DB_NAME,DB_HOST=$DB_HOST,DB_USER=$DB_USER,DB_PASSWORD=$DB_PASSWORD" \
  --region $REGION

echo "✅ Environment variables updated!"
echo ""
echo "🔍 Current environment variables:"
gcloud run services describe $SERVICE_NAME --region $REGION --format="table(spec.template.spec.template.spec.containers[0].env[].name,spec.template.spec.template.spec.containers[0].env[].value)"