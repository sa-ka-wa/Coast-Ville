#!/bin/bash
# update-ngrok-env.sh - Get ngrok URL and save to .env

echo "🔍 Getting ngrok public URL..."

# Check if ngrok is running
if ! pgrep -f "ngrok" > /dev/null; then
    echo "❌ ngrok is not running!"
    echo "   Start it with: ngrok http 5173"
    exit 1
fi

# Get the public URL
NGROK_PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels 2>/dev/null | python3 -c "
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

if [ -z "$NGROK_PUBLIC_URL" ]; then
    echo "❌ Could not get ngrok public URL"
    echo "   Check: curl http://localhost:4040/api/tunnels"
    exit 1
fi

echo "✅ Found ngrok URL: $NGROK_PUBLIC_URL"

# Update .env file
if [ -f .env ]; then
    # Remove existing NGROK_PUBLIC_URL if present
    sed -i '/^NGROK_PUBLIC_URL=/d' .env
    
    # Add the new URL
    echo "NGROK_PUBLIC_URL=$NGROK_PUBLIC_URL" >> .env
    
    echo "✅ Updated .env with NGROK_PUBLIC_URL"
else
    echo "⚠️  .env file not found, creating one..."
    echo "NGROK_PUBLIC_URL=$NGROK_PUBLIC_URL" > .env
    echo "✅ Created .env with NGROK_PUBLIC_URL"
fi

# Also update Vite's .env if it exists
if [ -f Frontend/.env ]; then
    sed -i '/^VITE_NGROK_URL=/d' Frontend/.env
    echo "VITE_NGROK_URL=$NGROK_PUBLIC_URL" >> Frontend/.env
    echo "✅ Updated Frontend/.env with VITE_NGROK_URL"
fi

echo ""
echo "==========================================="
echo "✅ NGROK PUBLIC URL SAVED TO .env"
echo "==========================================="
echo "📱 $NGROK_PUBLIC_URL"
echo "==========================================="
echo ""
echo "🔑 Login: caretaker@example.com"
echo "🔒 Password: password123"
echo ""

# Show the updated .env
echo "📋 Current .env content:"
grep -E "NGROK_PUBLIC_URL|DATABASE_URL|JWT_SECRET_KEY" .env 2>/dev/null || echo "   No .env file found"

# Generate QR code
if command -v qrencode &> /dev/null; then
    echo ""
    echo "📱 Scan QR code:"
    qrencode -t ANSIUTF8 "$NGROK_PUBLIC_URL" 2>/dev/null
fi
