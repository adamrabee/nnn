import { createClient, type Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'

// The publishable key is meant for browsers; row level security on the
// `lessons` table decides who may write. Override both with Vite env vars.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://vtoyklhfkrszbwoddwvz.supabase.co'
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_MHEdCyty4jSIGErEU2ILMA_a2ilunEU'

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'droos-auth' },
})

/** Current teacher session (null when signed out, undefined while loading). */
export function useSession(): Session | null | undefined {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])
  return session
}
