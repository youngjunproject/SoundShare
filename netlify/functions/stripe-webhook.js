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
const supabaseServiceKey = getRequiredEnvVar("SUPABASE_SERVICE_ROLE_KEY"); // Changed to use service role key
const stripeWebhookSecret = getRequiredEnvVar("STRIPE_WEBHOOK_SECRET");

// Initialize Supabase client
let supabaseClient;
try {
  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
} catch (error) {
  console.error("Failed to initialize Supabase client:", error);
  throw error;
}

exports.handler = async function (event, context) {
  console.log("Webhook received:", {
    method: event.httpMethod,
    headers: event.headers,
    envVars: {
      supabaseUrl: supabaseUrl ? "present" : "missing",
      supabaseKey: supabaseServiceKey ? "present" : "missing",
      webhookSecret: stripeWebhookSecret ? "present" : "missing",
    },
  });

  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

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

      const { data, error } = await supabaseClient.rpc("purchase_tokens", {
        user_id: userId,
        amount: parseInt(tokens, 10),
      });

      if (error) {
        console.error("Purchase tokens error:", error);
        throw error;
      }

      console.log("Purchase successful:", { userId, tokens, result: data });

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
};
