#!/bin/bash
# update-ngrok-token.sh - Update ngrok.yml with token from .env

# Load .env file
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found!"
    exit 1
fi

if [ -z "$NGROK_AUTH_TOKEN" ] || [ "$NGROK_AUTH_TOKEN" = "your_actual_ngrok_token_here" ]; then
    echo "❌ NGROK_AUTH_TOKEN not set in .env"
    echo "   Get your token from: https://dashboard.ngrok.com/auth"
    echo "   Then add to .env: NGROK_AUTH_TOKEN=your_token"
    exit 1
fi

echo "🔑 Updating ngrok.yml with auth token..."

# Update ngrok.yml with token from .env
sed -i "s/authtoken:.*/authtoken: $NGROK_AUTH_TOKEN/g" ngrok.yml

# Also update ngrok config
ngrok config add-authtoken $NGROK_AUTH_TOKEN

echo "✅ ngrok.yml updated successfully!"
echo "📋 Token: ${NGROK_AUTH_TOKEN:0:10}..."
