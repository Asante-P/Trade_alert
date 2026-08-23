# Supabase Setup Guide for Trading Alert System

## 🚀 Setup Instructions

### 1. Set Up Supabase Database

1. **Go to your Supabase project dashboard**: https://supabase.com/dashboard/project/bdcouhofldwauwayyoyv
2. **Open SQL Editor** (left sidebar → SQL Editor)
3. **Copy and run the schema** from `supabase-schema.sql` file in this repository
4. **Verify tables created**: alerts, market_state, fcm_tokens, mtf_trends

### 2. Deploy Supabase Edge Functions

#### Option A: Using Supabase CLI (Recommended)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref bdcouhofldwauwayyoyv

# Deploy all functions
supabase functions deploy bos-detection
supabase functions deploy market-data
supabase functions deploy notify
```

#### Option B: Manual Deployment via Dashboard

1. Go to Edge Functions in Supabase dashboard
2. Create function `bos-detection` and paste content from `supabase/functions/bos-detection/index.ts`
3. Create function `market-data` and paste content from `supabase/functions/market-data/index.ts`
4. Create function `notify` and paste content from `supabase/functions/notify/index.ts`

### 3. Set Environment Variables

In Supabase Dashboard → Settings → Edge Functions, add these environment variables:

```
SUPABASE_URL=https://bdcouhofldwauwayyoyv.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkY291aG9mbGR3YXV3YXl5b3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQwMTYwNSwiZXhwIjoyMTAyOTc3NjA1fQ.BFjKeVWUFGEmCEdwoK8O-05ixFnwU34VjneZ9gZj8wc
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id"...}
NTFY_TOPIC=trade-alerts
NTFY_URL=https://ntfy.sh
```

### 4. Update Local Environment

The `.env.local` file has been updated with Supabase credentials. Verify:

```bash
# In web-dashboard directory
cd web-dashboard
cat .env.local
```

### 5. Migrate Existing SQLite Data (Optional)

If you want to migrate existing alerts and tokens from SQLite:

```bash
# Run migration script (create this script)
node scripts/migrate-to-supabase.js
```

### 6. Test Local Development

```bash
# Start backend (if still needed for some features)
cd backend
npm start

# Start frontend with Supabase
cd web-dashboard
npm run dev
```

Visit http://localhost:3001 to see the dashboard with Supabase integration.

### 7. Deploy to Vercel

#### A. Install Vercel CLI

```bash
npm install -g vercel
```

#### B. Deploy Frontend

```bash
cd web-dashboard
vercel
```

#### C. Set Vercel Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://bdcouhofldwauwayyoyv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkY291aG9mbGR3YXV3YXl5b3l2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MDE2MDUsImV4cCI6MjEwMjk3NzYwNX0.H4Kj68B5StdlEghYYOcTW1r9TbtA-StGoA86b2PoMVM
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJkY291aG9mbGR3YXV3YXl5b3l2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQwMTYwNSwiZXhwIjoyMTAyOTc3NjA1fQ.BFjKeVWUFGEmCEdwoK8O-05ixFnwU34VjneZ9gZj8wc
CRON_SECRET=your_secure_random_secret
NEXT_PUBLIC_BACKEND_URL=https://your-backend-url.vercel.app
NTFY_TOPIC=trade-alerts
NTFY_URL=https://ntfy.sh
```

#### D. Enable Cron Jobs

Vercel will automatically read `vercel.json` and set up cron jobs:
- `/api/cron/market-data` - Every 5 minutes
- `/api/cron/bos-detection` - Every 10 minutes

## 🔧 Architecture Overview

### Data Flow

```
Vercel Cron Jobs → Supabase Edge Functions → Supabase Database
                            ↓
                      Firebase/ntfy Notifications
                            ↓
                      Real-time Dashboard Updates
```

### Components

1. **Supabase Database**
   - `alerts` - BOS, OB, S&D events
   - `market_state` - Current prices, PDH/PDL, trends
   - `fcm_tokens` - Push notification tokens
   - `mtf_trends` - Multi-timeframe analysis

2. **Supabase Edge Functions**
   - `bos-detection` - Pine Script BOS/OB logic
   - `market-data` - EMA trends, price levels
   - `notify` - Firebase/ntfy notifications

3. **Vercel Cron Jobs**
   - `market-data` - Every 5 minutes
   - `bos-detection` - Every 10 minutes

4. **Next.js Dashboard**
   - Real-time subscriptions to Supabase
   - Live alert feed
   - Market state display

## 📊 Pine Script Implementation

The Edge Functions implement exact Pine Script logic:

- **BOS Detection**: Swing points with reset logic
- **Order Blocks**: ATR-relative sizing (0.3 ATR minimum, 1.5x impulse)
- **Supply/Demand**: Zone detection with ATR filters
- **EMA Trends**: 50-period EMA for trend determination
- **Price Levels**: PDH/PDL from 24 candles, PWH/PWL from 100 candles

## 🔒 Security Notes

- **Service Role Key**: Only used in Edge Functions, never exposed to client
- **Anon Key**: Used in frontend for read operations
- **RLS Policies**: Restrict write operations to service role
- **Cron Secret**: Protects cron endpoints from unauthorized access

## 🚨 Troubleshooting

### Dashboard shows "Disconnected"
- Check Supabase URL and keys in `.env.local`
- Verify Supabase project is active
- Check network connectivity

### No real-time alerts appearing
- Verify Edge Functions are deployed
- Check Supabase logs for function errors
- Ensure real-time subscriptions are enabled

### Cron jobs not working
- Verify `vercel.json` is deployed
- Check CRON_SECRET is set in Vercel
- Review Vercel cron job logs

### Firebase notifications not sending
- Verify FIREBASE_SERVICE_ACCOUNT in Supabase Edge Functions
- Check Firebase project settings
- Review Supabase function logs

## 📈 Monitoring

- **Supabase Dashboard**: Monitor database usage, function logs
- **Vercel Dashboard**: Monitor cron job execution, API performance
- **Firebase Console**: Monitor FCM delivery statistics
- **ntfy.sh**: Check notification delivery logs

## 💰 Cost Estimates

### Free Tier Limits (Monthly)
- **Supabase**: 500MB DB, 2GB bandwidth, 50k Edge Function invocations
- **Vercel**: 100GB bandwidth, 100h serverless execution
- **Firebase**: 10k FCM messages
- **ntfy.sh**: Unlimited (with rate limits)

### Estimated Usage
- **Cron jobs**: ~288 market-data + ~144 BOS-detection per day = ~432 invocations
- **Real-time subscriptions**: Minimal bandwidth
- **Total**: Well within free tiers for startup

## 🎯 Next Steps

1. ✅ Complete Supabase database setup
2. ✅ Deploy Edge Functions
3. ✅ Test local development
4. ✅ Deploy to Vercel
5. ✅ Monitor 24/7 operation
6. 🔄 Adjust cron intervals based on market activity
7. 🔄 Add more symbols as needed
8. 🔄 Implement additional Pine Script features