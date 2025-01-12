import { supabase } from './supabase';

export async function getTokensRemaining(): Promise<number> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await supabase
      .from('download_tokens')
      .select('tokens_remaining')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Error getting tokens:', error);
      return 0;
    }

    return data?.tokens_remaining || 0;
  } catch (error) {
    console.error('Error in getTokensRemaining:', error);
    return 0;
  }
}

export async function consumeToken(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .rpc('consume_download_token', {
        user_id: user.id
      });

    if (error) {
      console.error('Error consuming token:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in consumeToken:', error);
    return false;
  }
}

export async function purchaseTokens(amount: number): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .rpc('purchase_tokens', {
        user_id: user.id,
        amount: amount
      });

    if (error) {
      console.error('Error purchasing tokens:', error);
      return false;
    }

    return data || false;
  } catch (error) {
    console.error('Error in purchaseTokens:', error);
    return false;
  }
}

export async function getTokenHistory(): Promise<Array<{
  operation_type: string;
  tokens_changed: number;
  tokens_remaining: number;
  created_at: string;
}>> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('token_audit_log')
      .select('operation_type, tokens_changed, tokens_remaining, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error getting token history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in getTokenHistory:', error);
    return [];
  }
}