const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

exports.handler = async function(event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sig = event.headers['stripe-signature'];
  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    const { userId, tokens } = session.metadata;

    try {
      const { data, error } = await supabase.rpc('purchase_tokens', {
        user_id: userId,
        amount: parseInt(tokens, 10)
      });

      if (error) throw error;

      return {
        statusCode: 200,
        body: JSON.stringify({ received: true })
      };
    } catch (error) {
      console.error('Token purchase error:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to process token purchase' })
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};