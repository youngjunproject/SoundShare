import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { Coins, CreditCard, Clock } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { supabase } from "../lib/supabase";
import { getTokensRemaining, getTokenHistory } from "../lib/tokens";
import { formatDistanceToNow } from "date-fns";

// Initialize Stripe outside of component to avoid re-initialization
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY)
  : Promise.reject(new Error("Stripe public key not found"));

const TOKEN_PACKAGES = [
  { tokens: 10, price: 4.99 },
  { tokens: 50, price: 19.99 },
  { tokens: 100, price: 34.99 },
  { tokens: 500, price: 149.99 },
];

export function TokenPurchase() {
  const [currentTokens, setCurrentTokens] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<
    Array<{
      operation_type: string;
      tokens_changed: number;
      tokens_remaining: number;
      created_at: string;
    }>
  >([]);

  const loadTokens = async () => {
    const tokens = await getTokensRemaining();
    setCurrentTokens(tokens);
  };

  const loadHistory = async () => {
    const history = await getTokenHistory();
    setHistory(history);
  };

  const reloadData = async () => {
    await Promise.all([loadTokens(), loadHistory()]);
  };

  useEffect(() => {
    const checkPaymentStatus = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("success")) {
        await reloadData();
        alert(
          "Payment successful! Your tokens have been added to your account."
        );
        // Clean up URL parameters
        window.history.replaceState({}, "", window.location.pathname);
      } else if (urlParams.get("canceled")) {
        alert("Payment canceled. No tokens were purchased.");
        window.history.replaceState({}, "", window.location.pathname);
      }
    };

    reloadData();
    checkPaymentStatus();
  }, []);

  const handlePurchase = async (tokens: number, price: number) => {
    try {
      setLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please sign in to purchase tokens");
      }

      const stripe = await stripePromise.catch((err) => {
        throw new Error(
          "Failed to initialize payment system. Please try again later."
        );
      });

      if (!stripe) {
        throw new Error(
          "Payment system is not available. Please try again later."
        );
      }

      const response = await fetch(
        "/.netlify/functions/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            tokens,
            price,
            userId: user.id,
          }),
        }
      );

      const errorMessage = "Failed to create checkout session";

      try {
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || errorMessage);
        }

        if (!data?.id) {
          throw new Error("Invalid checkout session response");
        }

        const { error: stripeError } = await stripe.redirectToCheckout({
          sessionId: data.id,
        });

        if (stripeError) {
          throw stripeError;
        }
      } catch (parseError) {
        console.error("Response parsing error:", parseError);
        if (!response.ok) {
          throw new Error(
            `${errorMessage} (${response.status}: ${response.statusText})`
          );
        }
        throw new Error("Invalid response from payment server");
      }
    } catch (err) {
      console.error("Purchase error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process purchase. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className='max-w-4xl mx-auto px-4 sm:px-6 lg:px-8'>
        <div className='space-y-8'>
          <div>
            <h1 className='text-2xl font-bold text-gray-900'>
              Download Tokens
            </h1>
            <p className='mt-2 text-sm text-gray-600'>
              Purchase tokens to download sounds. Each download costs 1 token.
            </p>
          </div>

          <div className='bg-white rounded-lg shadow-lg p-6'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center'>
                <Coins className='h-8 w-8 text-yellow-500' />
                <div className='ml-4'>
                  <h2 className='text-lg font-medium text-gray-900'>
                    Current Balance
                  </h2>
                  <p className='text-sm text-gray-500'>
                    {currentTokens} tokens remaining
                  </p>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className='bg-red-50 p-4 rounded-md'>
              <p className='text-sm text-red-700'>{error}</p>
            </div>
          )}

          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
            {TOKEN_PACKAGES.map(({ tokens, price }) => (
              <div key={tokens} className='bg-white rounded-lg shadow-lg p-6'>
                <div className='flex justify-between items-start'>
                  <div>
                    <h3 className='text-lg font-medium text-gray-900'>
                      {tokens} Tokens
                    </h3>
                    <p className='mt-1 text-sm text-gray-500'>
                      ${price.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handlePurchase(tokens, price)}
                    disabled={loading}
                    className='inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed'
                  >
                    <CreditCard className='h-4 w-4 mr-2' />
                    {loading ? "Processing..." : "Purchase"}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className='bg-white rounded-lg shadow-lg p-6'>
            <h2 className='text-lg font-medium text-gray-900 mb-4'>
              Token History
            </h2>
            <div className='space-y-4'>
              {history.length === 0 ? (
                <p className='text-sm text-gray-500'>No token history yet</p>
              ) : (
                history.map((entry, index) => (
                  <div
                    key={index}
                    className='flex items-center justify-between py-2 border-b border-gray-200 last:border-0'
                  >
                    <div className='flex items-center'>
                      <Clock className='h-4 w-4 text-gray-400 mr-2' />
                      <div>
                        <p className='text-sm font-medium text-gray-900'>
                          {entry.operation_type === "consume"
                            ? "Used"
                            : "Purchased"}{" "}
                          {Math.abs(entry.tokens_changed)} token
                          {Math.abs(entry.tokens_changed) !== 1 ? "s" : ""}
                        </p>
                        <p className='text-xs text-gray-500'>
                          {formatDistanceToNow(new Date(entry.created_at), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <p className='text-sm text-gray-600'>
                      Balance: {entry.tokens_remaining}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
