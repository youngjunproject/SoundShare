const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { createClient } = require("@supabase/supabase-js");

// Helper to validate environment variables
function getRequiredEnvVar(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    throw new Error(`${name} environment variable is required`);
  }
  return value;
}

// Get required environment variables
const supabaseUrl = getRequiredEnvVar("VITE_SUPABASE_URL");
const supabaseServiceKey = getRequiredEnvVar("SUPABASE_SERVICE_ROLE_KEY"); // CRITICAL: Must use service role key
const stripeWebhookSecret = getRequiredEnvVar("STRIPE_WEBHOOK_SECRET");

// Initialize Supabase client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

exports.handler = async function (event, context) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: "Method not allowed" }),
      };
    }

    // Verify Stripe webhook signature
    const sig = event.headers["stripe-signature"];
    let stripeEvent;
    try {
      stripeEvent = stripe.webhooks.constructEvent(
        event.body,
        sig,
        stripeWebhookSecret
      );
      console.log("Stripe event verified:", stripeEvent.type);
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      };
    }

    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;
      console.log("Processing checkout session:", session.id);

      const { userId, tokens } = session.metadata;

      if (!userId || !tokens) {
        console.error("Missing metadata:", session.metadata);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required metadata" }),
        };
      }

      try {
        console.log("Calling purchase_tokens:", { userId, tokens });

        // Call the purchase_tokens RPC function with retries
        let retries = 3;
        let success = false;
        let error;

        while (retries > 0 && !success) {
          const { data, error: rpcError } = await supabaseAdmin.rpc(
            "purchase_tokens",
            {
              user_id: userId,
              amount: parseInt(tokens, 10),
            }
          );

          if (rpcError) {
            error = rpcError;
            console.error(
              `Purchase tokens error (attempt ${4 - retries}):`,
              rpcError
            );
            retries--;
            if (retries > 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }
          } else {
            success = true;
            console.log("Purchase successful:", {
              userId,
              tokens,
              result: data,
            });
          }
        }

        if (!success) {
          throw error;
        }

        return {
          statusCode: 200,
          body: JSON.stringify({
            received: true,
            processed: true,
            tokens: parseInt(tokens, 10),
          }),
        };
      } catch (error) {
        console.error("Failed to process purchase:", error);
        return {
          statusCode: 500,
          body: JSON.stringify({
            error: "Failed to process token purchase",
            details: error.message,
          }),
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (err) {
    console.error("Webhook processing error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Internal server error",
        details: err.message,
      }),
    };
  }
};
