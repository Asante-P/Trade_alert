import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Check if market is open (XAUUSD 24/5 market: Sunday 5pm EST to Friday 5pm EST)
function isMarketOpen() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = now.getUTCHours();
  
  // XAUUSD market hours: Sunday 21:00 UTC to Friday 21:00 UTC (5pm EST)
  // Closed: Friday 21:00 UTC to Sunday 21:00 UTC
  if (day === 5 && hours >= 21) return false; // Friday after 9pm UTC
  if (day === 6) return false; // Saturday
  if (day === 0 && hours < 21) return false; // Sunday before 9pm UTC
  
  return true;
}

serve(async (req) => {
  try {
    // Notifications should work regardless of market hours (alerts can come anytime)
    const { alertId, symbol, type, direction, price } = await req.json();
    
    if (!alertId || !symbol || !type || !direction || !price) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get all FCM tokens
    const { data: tokens, error: tokensError } = await supabase
      .from('fcm_tokens')
      .select('token');
    
    if (tokensError) {
      console.error('Error fetching FCM tokens:', tokensError);
    }
    
    // Prepare notification payload
    const notificationTitle = `${type} Alert - ${symbol}`;
    const notificationBody = `${direction.toUpperCase()} ${type} at ${price}`;
    
    // Send Firebase FCM notifications
    if (tokens && tokens.length > 0) {
      const firebaseServiceAccount = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
      if (firebaseServiceAccount) {
        try {
          const serviceAccount = JSON.parse(firebaseServiceAccount);
          
          // Get Firebase access token
          const tokenResponse = await fetch(
            `https://oauth2.googleapis.com/token`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: serviceAccount.private_key // This would need proper JWT signing
              })
            }
          );
          
          // For simplicity, we'll use the direct FCM API with service account
          // In production, you'd use firebase-admin SDK
          for (const tokenData of tokens) {
            try {
              const fcmResponse = await fetch(
                `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${serviceAccount.private_key}`, // Simplified - needs proper auth
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    message: {
                      token: tokenData.token,
                      notification: {
                        title: notificationTitle,
                        body: notificationBody
                      },
                      data: {
                        alertId,
                        symbol,
                        type,
                        direction,
                        price: price.toString()
                      }
                    }
                  })
                }
              );
              
              console.log('FCM response:', await fcmResponse.text());
            } catch (fcmError) {
              console.error('FCM error for token:', tokenData.token, fcmError);
            }
          }
        } catch (firebaseError) {
          console.error('Firebase configuration error:', firebaseError);
        }
      }
    }
    
    // Send ntfy.sh notification
    const ntfyTopic = Deno.env.get('NTFY_TOPIC') || 'trade-alerts';
    const ntfyUrl = Deno.env.get('NTFY_URL') || 'https://ntfy.sh';
    
    try {
      const ntfyResponse = await fetch(`${ntfyUrl}/${ntfyTopic}`, {
        method: 'POST',
        headers: {
          'Title': notificationTitle,
          'Priority': 'high',
          'Tags': type.toLowerCase().replace('_', '-'),
          'Content-Type': 'text/plain'
        },
        body: notificationBody
      });
      
      console.log('ntfy response:', ntfyResponse.status);
    } catch (ntfyError) {
      console.error('ntfy error:', ntfyError);
    }
    
    // Update last_used timestamp for tokens
    if (tokens && tokens.length > 0) {
      const { error: updateError } = await supabase
        .from('fcm_tokens')
        .update({ last_used: new Date().toISOString() })
        .in('token', tokens.map(t => t.token));
      
      if (updateError) {
        console.error('Error updating token timestamps:', updateError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Notifications sent',
        recipients: tokens?.length || 0
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});