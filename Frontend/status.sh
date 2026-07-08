#!/bin/bash
# status.sh - Check status of all services

echo "🔍 Checking service status..."
echo ""

# Check Backend
if pgrep -f "python run.py" > /dev/null; then
    echo "✅ Backend: Running (Port 5555)"
    BACKEND_PID=$(pgrep -f "python run.py")
    echo "   PID: $BACKEND_PID"
else
    echo "❌ Backend: Not running"
fi

echo ""

# Check Frontend
if pgrep -f "vite" > /dev/null; then
    echo "✅ Frontend: Running (Port 5173)"
    FRONTEND_PID=$(pgrep -f "vite")
    echo "   PID: $FRONTEND_PID"
else
    echo "❌ Frontend: Not running"
fi

echo ""

# Check ngrok
if pgrep -f "ngrok" > /dev/null; then
    echo "✅ ngrok: Running"
    NGROK_PID=$(pgrep -f "ngrok")
    echo "   PID: $NGROK_PID"
    
    # Get ngrok URL
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
        echo "   URL: $NGROK_URL"
    else
        echo "   URL: Not available (check tunnel)"
    fi
else
    echo "❌ ngrok: Not running"
fi

echo ""
echo "📋 Quick URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend: http://localhost:5555"
echo "   ngrok Dashboard: http://localhost:4040"
