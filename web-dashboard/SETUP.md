# Setup Instructions

## Environment Configuration

Create a `.env.local` file in the web-dashboard directory with the following content:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
```

## Running the System

### 1. Start the Backend Server

```bash
cd backend
npm start
```

The backend will run on http://localhost:3000

### 2. Start the Web Dashboard

```bash
cd web-dashboard
npm run dev
```

The dashboard will run on http://localhost:3001 (or next available port)

### 3. Access the Dashboard

Open your browser and navigate to: http://localhost:3001

## System Architecture

- **Backend Server**: Port 3000 - Handles TradingView webhooks, FCM notifications, and database
- **Web Dashboard**: Port 3001 - Next.js frontend for monitoring alerts and system status
- **Database**: SQLite database (alerts.db) stores alert history and FCM tokens

## Testing the System

1. **Test Backend Health**: 
   - Navigate to http://localhost:3000/health
   - Should return: `{"status":"ok","registeredTokens":0,"alertCount":0}`

2. **Test Dashboard**: 
   - Navigate to http://localhost:3001
   - Should show the trading dashboard with "Connected" status

3. **Test Webhook**: 
   - Use the webhook URL shown in the dashboard
   - Send a test POST request to verify alert processing

## TradingView Configuration

1. Copy the webhook URL from the dashboard's Webhook Configuration panel
2. In TradingView, create a new alert with your indicator conditions
3. Paste the webhook URL in the Webhook URL field
4. Use the JSON message format provided in the dashboard
5. Save and enable the alert

## Supported Alert Types

- BOS+OB Buy Signal
- BOS+OB Sell Signal  
- 3rd Touch Trendline Buy
- 3rd Touch Trendline Sell

## Troubleshooting

### Backend Not Starting
- Check if port 3000 is already in use
- Verify Firebase credentials are properly configured
- Check database file permissions

### Dashboard Not Connecting
- Ensure backend server is running
- Verify NEXT_PUBLIC_BACKEND_URL in .env.local
- Check browser console for errors

### Alerts Not Showing
- Verify TradingView webhook URL is correct
- Check backend server logs for incoming webhooks
- Ensure database is writable

### Database Issues
- The SQLite database (alerts.db) will be created automatically
- Check file permissions if database creation fails
- Database stores alerts and FCM tokens locally