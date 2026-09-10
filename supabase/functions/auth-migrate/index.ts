import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Supabase Auth requires min 6 chars — pad short passwords
function authPassword(pw: string): string {
  return pw.length >= 6 ? pw : pw.padEnd(6, '_')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { username, password } = await req.json()
    if (!username || !password) {
      return new Response(JSON.stringify({ error: 'Missing credentials' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Fetch user_profile (service role bypasses RLS)
    const { data: users, error: dbErr } = await adminClient
      .from('user_profile')
      .select('id, username, password_hash, fullname, role, s_active, allowed_pages')
    if (dbErr) {
      return new Response(JSON.stringify({ error: 'DB error: ' + dbErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const user = (users ?? []).find((u: { username: string }) => u.username === username)
    if (!user) return new Response(JSON.stringify({ error: 'User not found' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    if (!user.s_active) return new Response(JSON.stringify({ error: 'Account disabled' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // 2. Verify password against user_profile hash
    const encoder = new TextEncoder()
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password))
    const hashed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')
    const storedHash = user.password_hash ?? ''
    const isHashed = storedHash.length === 64 && /^[0-9a-f]+$/.test(storedHash)
    const passwordOk = isHashed ? storedHash === hashed : storedHash === password
    if (!passwordOk) return new Response(JSON.stringify({ error: 'Password is incorrect' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    if (!isHashed) {
      await adminClient.from('user_profile').update({ password_hash: hashed }).eq('id', user.id)
    }

    // 3. Create/update Supabase Auth user
    const email = `${username.toLowerCase()}@medstock.local`
    const authPw = authPassword(password)  // ensure >= 6 chars for Supabase Auth
    const { data: listData } = await adminClient.auth.admin.listUsers()
    const existing = (listData?.users ?? []).find(u => u.email === email)

    if (!existing) {
      const { error: ce } = await adminClient.auth.admin.createUser({ email, password: authPw, email_confirm: true })
      if (ce) return new Response(JSON.stringify({ error: 'Create auth user failed: ' + ce.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    } else {
      const { error: ue } = await adminClient.auth.admin.updateUserById(existing.id, { password: authPw })
      if (ue) return new Response(JSON.stringify({ error: 'Update auth user failed: ' + ue.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Sign in with padded password
    const loginClient = createClient(supabaseUrl, anonKey)
    const { data: session, error: signInErr } = await loginClient.auth.signInWithPassword({ email, password: authPw })
    if (signInErr || !session?.session) {
      return new Response(JSON.stringify({ error: 'Sign in failed: ' + (signInErr?.message ?? 'no session') }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({
      session: session.session,
      profile: { id: user.id, username: user.username, fullname: user.fullname, role: user.role, s_active: user.s_active, allowed_pages: user.allowed_pages },
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal error: ' + String(err) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
