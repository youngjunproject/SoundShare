const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

exports.handler = async function (event, context) {
  const sig = event.headers["stripe-signature"];
  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
    };
  }

  // Handle the checkout.session.completed event
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    // Extract user ID and token amount from metadata
    const { userId, tokens } = session.metadata;

    if (!userId || !tokens) {
      console.error("Missing required metadata:", { userId, tokens });
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Missing required metadata" }),
      };
    }

    try {
      // Call the purchase_tokens function
      const { data, error } = await supabase.rpc("purchase_tokens", {
        user_id: userId,
        amount: parseInt(tokens, 10),
      });

      if (error) {
        console.error("Token purchase error:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Failed to process token purchase" }),
        };
      }

      console.log("Token purchase successful:", {
        userId,
        tokens,
        success: data,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({ received: true, processed: true }),
      };
    } catch (error) {
      console.error("Token purchase processing error:", error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Failed to process token purchase" }),
      };
    }
  }

  // Return success for other event types
  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
