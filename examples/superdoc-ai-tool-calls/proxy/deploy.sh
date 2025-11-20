#!/bin/bash

set -e

# Load .env file
if [ -f .env ]; then
  source .env
else
  echo "Create .env file with required variables"
  exit 1
fi

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars OPENAI_API_KEY=$OPENAI_API_KEY

echo "Deployed! URL:"
gcloud run services describe $SERVICE_NAME --region=us-central1 --format="value(status.url)"