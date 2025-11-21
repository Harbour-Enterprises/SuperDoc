#!/bin/bash

# Cloud Run Deployment Script for Collaboration Server
# Make sure you have gcloud CLI installed and authenticated

set -e

# Configuration
SERVICE_NAME="superdoc-collab-demo"
REGION="us-central1"
PROJECT_ID=$(gcloud config get-value project)

echo "🚀 Deploying to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"
echo ""

# Check if gcloud is authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Please authenticate with gcloud first:"
    echo "   gcloud auth login"
    exit 1
fi

# Deploy to Cloud Run
echo "📦 Deploying service..."
gcloud run deploy $SERVICE_NAME \
    --source . \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --port 3050 \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10 \
    --timeout 3600

# Get the service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region $REGION --format "value(status.url)")

echo ""
echo "✅ Deployment complete!"
echo "Service URL: $SERVICE_URL"
echo ""

# Prompt for environment variables
echo "🔧 Now set your environment variables:"
echo "Run this command with your actual values:"
echo ""
echo "gcloud run services update $SERVICE_NAME \\"
echo "  --set-env-vars=\"JWT_SECRET=your-jwt-secret,DB_NAME=your-db-name,DB_HOST=your-neon-host,DB_USER=your-db-user,DB_PASSWORD=your-db-password\" \\"
echo "  --region $REGION"
echo ""
echo "📝 Don't forget to update your client's VITE_API_URL and VITE_WS_URL to:"
echo "   VITE_API_URL=$SERVICE_URL"
echo "   VITE_WS_URL=${SERVICE_URL/https:/wss:}"