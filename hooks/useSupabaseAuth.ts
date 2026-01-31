import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseAuth() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data } = await supabase.auth.getSession()
      if (!mounted) return
      setSession(data.session)
    }

    init()

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sessionData) => {
      setSession(sessionData?.session ?? null)
    })

    return () => {
      mounted = false
      // unsubscribe
      // listener may be undefined in some environments
      try {
        listener?.subscription?.unsubscribe?.()
      } catch {
        // ignore
      }
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    return await supabase.auth.signUp({ email, password })
  }

  const signIn = async (email: string, password: string) => {
    return await supabase.auth.signInWithPassword({ email, password })
  }

  const signOut = async () => {
    return await supabase.auth.signOut()
  }

  return { session, signUp, signIn, signOut }
}

export default useSupabaseAuth
