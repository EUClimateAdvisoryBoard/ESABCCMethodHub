import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Server-side helper: return whether the given user has on-file consent
 * for AI summary features. Used by every API route that forwards user
 * content to a third-party LLM.
 */
export async function hasLlmConsent(
  supabase: SupabaseClient,
  userId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('llm_consent_at')
    .eq('id', userId)
    .maybeSingle();
  return !!data?.llm_consent_at;
}
