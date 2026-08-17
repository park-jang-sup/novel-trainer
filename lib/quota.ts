import { createAdminClient } from './supabase/admin'

export async function consumeAiQuota(userId: string, limit: number) {
  const supabase = createAdminClient()

  const { data, error } = await supabase.rpc('consume_ai_quota', {
    p_user: userId,
    p_limit: limit,
  })

  if (error) {
    throw error
  }

  return data
}
