#!/bin/bash
# start-ngrok.sh - Start ngrok with configuration

# Load .env file
if [ -f .env ]; then
    source .env
else
    echo "❌ .env file not found!"
    exit 1
fi

# Check if token is set
if [ -z "$NGROK_AUTH_TOKEN" ] || [ "$NGROK_AUTH_TOKEN" = "your_actual_ngrok_token_here" ]; then
    echo "❌ NGROK_AUTH_TOKEN not set in .env"
    echo "   Get your token from: https://dashboard.ngrok.com/auth"
    echo "   Then add to .env: NGROK_AUTH_TOKEN=your_token"
    exit 1
fi

# Kill existing ngrok
pkill -f ngrok 2>/dev/null
sleep 1

echo "🔑 Authenticating ngrok..."
ngrok config add-authtoken $NGROK_AUTH_TOKEN

echo "🌐 Starting ngrok with config..."
ngrok start --config=ngrok.yml rentmanager &
NGROK_PID=$!

echo "⏳ Waiting for ngrok to start..."
sleep 3

# Get the ngrok URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    for tunnel in data.get('tunnels', []):
        if tunnel.get('proto') == 'https':
            print(tunnel.get('public_url'))
            break
except:
    pass
" 2>/dev/null)

if [ -n "$NGROK_URL" ]; then
    echo ""
    echo "==========================================="
    echo "✅ NGROK RUNNING SUCCESSFULLY!"
    echo "==========================================="
    echo "📱 Mobile URL: $NGROK_URL"
    echo "🔑 Login: caretaker@example.com"
    echo "🔒 Password: password123"
    echo "==========================================="
    echo ""
    echo "📋 To share: $NGROK_URL"
    echo ""
    echo "⚠️  Press Ctrl+C to stop ngrok"
else
    echo "❌ Failed to get ngrok URL"
    echo "   Check logs: curl http://localhost:4040/api/tunnels"
    echo "   Or view ngrok dashboard at: http://localhost:4040"
fi

# Wait for user to interrupt
trap "pkill -f ngrok; echo '🛑 ngrok stopped'; exit" INT
wait
