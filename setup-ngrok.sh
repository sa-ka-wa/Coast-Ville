#!/bin/bash
# setup-ngrok.sh - Clean ngrok setup

echo "🔧 Setting up ngrok..."

# Your actual token
TOKEN="3GDPxgSbbntKcPjKAzcu759ndrP_5viC4LaLd8HFgo8MTY5Gx"

echo "🔑 Adding ngrok auth token..."
ngrok config add-authtoken $TOKEN

echo "✅ ngrok configured successfully!"

# Test ngrok
echo ""
echo "🧪 Testing ngrok..."
ngrok http 5173 &
NGROK_PID=$!
sleep 3

# Get the URL
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
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
    echo "✅ NGROK WORKING!"
    echo "==========================================="
    echo "📱 Mobile URL: $NGROK_URL"
    echo "==========================================="
    
    # Save to .env
    sed -i '/^NGROK_PUBLIC_URL=/d' .env 2>/dev/null
    echo "NGROK_PUBLIC_URL=$NGROK_URL" >> .env
    sed -i '/^NGROK_PUBLIC_URL=/d' Backend/.env 2>/dev/null
    echo "NGROK_PUBLIC_URL=$NGROK_URL" >> Backend/.env
else
    echo "❌ Could not get ngrok URL"
fi

# Kill test ngrok
pkill -f ngrok
echo ""
echo "✅ Setup complete!"
echo "📋 To start ngrok: ngrok http 5173"
