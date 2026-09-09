import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

  // Admin client (service role) — for creating auth users
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Anon client — for querying user_profile
  const anonClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { username, password } = await req.json()
  if (!username || !password) {
    return new Response(JSON.stringify({ error: 'Missing username or password' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 1. Fetch user_profile
  const { data: users, error: dbErr } = await anonClient
    .from('user_profile')
    .select('id, username, password_hash, fullname, role, s_active, allowed_pages')

  if (dbErr) {
    return new Response(JSON.stringify({ error: 'DB error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const user = (users ?? []).find((u: { username: string }) => u.username === username)
  if (!user) {
    return new Response(JSON.stringify({ error: 'User not found' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!user.s_active) {
    return new Response(JSON.stringify({ error: 'Account disabled' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 2. Verify password (SHA-256 hash or plaintext legacy)
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(password))
  const hashed = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('')

  const storedHash = user.password_hash ?? ''
  const isHashed = storedHash.length === 64 && /^[0-9a-f]+$/.test(storedHash)
  const passwordOk = isHashed ? storedHash === hashed : storedHash === password

  if (!passwordOk) {
    return new Response(JSON.stringify({ error: 'Password is incorrect' }), {
      status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Migrate plaintext → hash if needed
  if (!isHashed) {
    await anonClient.from('user_profile').update({ password_hash: hashed }).eq('id', user.id)
  }

  // 4. Ensure Supabase Auth user exists (create if not)
  const email = `${username}@medstock.local`
  const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email)

  if (!existingUser?.user) {
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
  } else {
    // Update password in case it changed
    await adminClient.auth.admin.updateUserById(existingUser.user.id, { password })
  }

  // 5. Sign in to get session
  const anonClientForLogin = createClient(supabaseUrl, anonKey)
  const { data: session, error: signInErr } = await anonClientForLogin.auth.signInWithPassword({ email, password })

  if (signInErr || !session?.session) {
    return new Response(JSON.stringify({ error: 'Sign in failed after migration' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({
    session: session.session,
    profile: {
      id: user.id,
      username: user.username,
      fullname: user.fullname,
      role: user.role,
      s_active: user.s_active,
      allowed_pages: user.allowed_pages,
    },
  }), {
    status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
