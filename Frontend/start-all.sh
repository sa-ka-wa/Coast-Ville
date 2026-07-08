#!/bin/bash
# start-all.sh - Start all services

set -a
source .env
set +a

echo "🚀 Starting RentManager with ngrok..."

# Function to check if port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill processes if running
echo "🧹 Cleaning up old processes..."
pkill -f "python run.py" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "ngrok" 2>/dev/null
sleep 2

# Start Backend
echo "📡 Starting Backend Server..."
cd /root/moringaschool/phase-5/Coast-ville/Backend
source .venv/bin/activate
python run.py &
BACKEND_PID=$!
echo "✅ Backend started (PID: $BACKEND_PID)"

sleep 3

# Start Frontend
echo "🎨 Starting Frontend Server..."
cd /root/moringaschool/phase-5/Coast-ville/Frontend
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!
echo "✅ Frontend started (PID: $FRONTEND_PID)"

sleep 3

# Start ngrok
if [ -n "$NGROK_AUTH_TOKEN" ] && [ "$NGROK_AUTH_TOKEN" != "your_actual_ngrok_token_here" ]; then
    echo "🌐 Starting ngrok..."
    
    # Update ngrok.yml with token
    sed -i "s/authtoken:.*/authtoken: $NGROK_AUTH_TOKEN/g" ngrok.yml 2>/dev/null
    
    # Start ngrok with config
    ngrok start --config=ngrok.yml rentmanager &
    NGROK_PID=$!
    echo "✅ ngrok started (PID: $NGROK_PID)"
    
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
    
    echo ""
    echo "==========================================="
    if [ -n "$NGROK_URL" ]; then
        echo "✅ ALL SERVICES RUNNING!"
        echo "==========================================="
        echo "📱 Mobile URL: $NGROK_URL"
        echo "🔑 Login: caretaker@example.com"
        echo "🔒 Password: password123"
        echo "==========================================="
    else
        echo "⚠️  Services started but ngrok URL not found"
        echo "   Check: curl http://localhost:4040/api/tunnels"
    fi
    echo ""
else
    echo "⚠️  NGROK_AUTH_TOKEN not set in .env"
    echo "   Get token from: https://dashboard.ngrok.com/auth"
fi

# Function to clean up on exit
cleanup() {
    echo ""
    echo "🛑 Shutting down services..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    pkill -f ngrok 2>/dev/null
    echo "✅ All services stopped"
    exit
}

trap cleanup INT

echo "⚠️  Press Ctrl+C to stop all services"
echo ""
wait
