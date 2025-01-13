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
const supabaseServiceKey = getRequiredEnvVar("SUPABASE_SERVICE_ROLE_KEY");
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
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `Webhook Error: ${err.message}` }),
      };
    }

    // Only process completed checkout sessions
    if (stripeEvent.type === "checkout.session.completed") {
      const session = stripeEvent.data.object;

      // Extract metadata
      const userId = session.metadata?.userId;
      const tokens = session.metadata?.tokens;

      if (!userId || !tokens) {
        console.error("Missing metadata:", session.metadata);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Missing required metadata" }),
        };
      }

      // First verify the user exists
      const { data: user, error: userError } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

      if (userError || !user) {
        console.error("User verification failed:", userError);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "Invalid user" }),
        };
      }

      // Directly update the download_tokens table
      const { data: tokenData, error: tokenError } = await supabaseAdmin
        .from("download_tokens")
        .upsert(
          {
            user_id: userId,
            tokens_remaining: supabaseAdmin.sql`COALESCE(tokens_remaining, 0) + ${parseInt(
              tokens,
              10
            )}`,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "user_id",
            returning: "full",
          }
        );

      if (tokenError) {
        console.error("Token update failed:", tokenError);
        return {
          statusCode: 500,
          body: JSON.stringify({ error: "Failed to update tokens" }),
        };
      }

      // Log the purchase in the audit log
      const { error: auditError } = await supabaseAdmin
        .from("token_audit_log")
        .insert({
          user_id: userId,
          operation_type: "purchase",
          tokens_changed: parseInt(tokens, 10),
          tokens_remaining: tokenData[0].tokens_remaining,
        });

      if (auditError) {
        console.error("Audit log failed:", auditError);
        // Don't fail the whole operation if just the audit log fails
      }

      console.log("Purchase successful:", {
        userId,
        tokens,
        newBalance: tokenData[0].tokens_remaining,
      });

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          tokens: tokenData[0].tokens_remaining,
        }),
      };
    }

    // Acknowledge other events
    return { statusCode: 200, body: JSON.stringify({ received: true }) };
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
