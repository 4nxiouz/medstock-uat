import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type StaffInfo = { user_id: string; display_name: string; role: 'owner' | 'staff' }

type Ctx = {
  session: Session | null
  staff: StaffInfo | null
  loading: boolean
  isOwner: boolean
  reload: () => Promise<void>
}

const StaffContext = createContext<Ctx>({ session: null, staff: null, loading: true, isOwner: false, reload: async () => {} })

export function StaffProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [staff, setStaff] = useState<StaffInfo | null>(null)
  const [loading, setLoading] = useState(true)

  const loadStaff = async (s: Session | null) => {
    if (!s) { setStaff(null); return }
    const { data } = await supabase.from('staff').select('user_id,display_name,role').eq('user_id', s.user.id).maybeSingle()
    setStaff((data as StaffInfo) ?? null)
  }

  const reload = async () => {
    const { data } = await supabase.auth.getSession()
    setSession(data.session)
    await loadStaff(data.session)
  }

  useEffect(() => {
    reload().finally(() => setLoading(false))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // defer: avoid calling supabase inside the auth callback
      setTimeout(() => { loadStaff(s) }, 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return (
    <StaffContext.Provider value={{ session, staff, loading, isOwner: staff?.role === 'owner', reload }}>
      {children}
    </StaffContext.Provider>
  )
}

export const useStaff = () => useContext(StaffContext)
