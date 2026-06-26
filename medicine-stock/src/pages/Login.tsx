import { Lock, PillBottle, ShieldCheck, User, Zap } from 'lucide-react'
import { useState } from 'react'
import { setCurrentUser } from '../lib/auth'
import { hashPassword, isHashed } from '../lib/crypto'
import { supabase } from '../lib/supabase'
import type { UserProfile } from '../types'

type LoginProps = {
    onLoginSuccess: (rememberSession: boolean) => void
    errorMessage?: string
}

function Login({ onLoginSuccess, errorMessage }: LoginProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [rememberSession, setRememberSession] = useState(true)
    const [message, setMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleLogin() {
        const cleanUsername = username.trim()
        setMessage('')
        if (!cleanUsername || !password) { setMessage('Please enter username and password.'); return }
        setIsSubmitting(true)
        const { data, error } = await supabase.from('user_profile').select('id, username, password_hash, fullname, role, s_active, allowed_pages')
        setIsSubmitting(false)
        if (error) { setMessage('Cannot connect to user database.'); return }
        const users = (data || []) as UserProfile[]
        const user = users.find((item) => item.username === cleanUsername)
        if (!user) { setMessage('User not found.'); return }
        if (!user.s_active) { setMessage('This account is disabled.'); return }

        const hashed = await hashPassword(password)
        const storedHash = user.password_hash

        if (isHashed(storedHash)) {
            // Normal hashed comparison
            if (storedHash !== hashed) { setMessage('Password is incorrect.'); return }
        } else {
            // Plaintext (legacy) — compare then silently migrate to hash
            if (storedHash !== password) { setMessage('Password is incorrect.'); return }
            await supabase.from('user_profile').update({ password_hash: hashed }).eq('id', user.id!)
        }

        setCurrentUser(user)
        onLoginSuccess(rememberSession)
    }

    return (
        <main className="flex min-h-screen bg-slate-50">
            {/* Left panel */}
            <div className="relative hidden w-[480px] shrink-0 overflow-hidden bg-blue-950 lg:flex lg:flex-col">
                {/* Decorative circles */}
                <div className="pointer-events-none absolute -left-20 -top-20 size-80 rounded-full bg-blue-800/40" />
                <div className="pointer-events-none absolute -bottom-16 -right-16 size-64 rounded-full bg-blue-900/60" />
                <div className="pointer-events-none absolute right-8 top-32 size-40 rounded-full bg-blue-700/20" />

                <div className="relative flex flex-1 flex-col justify-between p-12">
                    {/* Logo block */}
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="flex size-11 items-center justify-center rounded-xl bg-blue-500 shadow-lg shadow-blue-900/50">
                                <PillBottle className="size-5 text-white" />
                            </div>
                            <div>
                                <div className="text-lg font-extrabold tracking-tight text-white">MedStock HIS</div>
                                <div className="text-xs font-medium text-blue-400">IS-C · Information Systems</div>
                            </div>
                        </div>

                        <div className="mt-14">
                            <h1 className="text-4xl font-extrabold leading-tight text-white">
                                Pharmacy<br />Inventory<br />
                                <span className="text-blue-400">Made Simple.</span>
                            </h1>
                            <p className="mt-5 text-sm leading-7 text-blue-300">
                                Real-time stock control, barcode scanning, and multi-location visibility — built for hospital pharmacy teams.
                            </p>
                        </div>
                    </div>

                    {/* Feature badges */}
                    <div className="space-y-3">
                        {[
                            { icon: Zap, text: 'Real-time stock across all locations' },
                            { icon: ShieldCheck, text: 'Role-based access control' },
                            { icon: Lock, text: 'Secure · Lightweight · Fast' },
                        ].map(({ icon: Icon, text }) => (
                            <div key={text} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                                <Icon className="size-4 shrink-0 text-blue-400" />
                                <span className="text-sm text-blue-200">{text}</span>
                            </div>
                        ))}
                        <div className="pt-4 text-xs text-blue-500">
                            © IS-C Department · Hospital Information System
                        </div>
                    </div>
                </div>
            </div>

            {/* Right panel — login form */}
            <div className="flex flex-1 items-center justify-center px-6 py-12">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-700">
                            <PillBottle className="size-5 text-white" />
                        </div>
                        <div>
                            <div className="font-extrabold text-slate-900">MedStock HIS</div>
                            <div className="text-xs text-slate-500">IS-C · Information Systems</div>
                        </div>
                    </div>

                    <div className="mb-8">
                        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">IS-C Department</p>
                        <h2 className="mt-2 text-3xl font-extrabold text-slate-900">Welcome back</h2>
                        <p className="mt-2 text-sm text-slate-500">Sign in to your pharmacy inventory account.</p>
                    </div>

                    <div className="space-y-5">
                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700">Username</span>
                            <div className="relative">
                                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter your username"
                                    value={username}
                                    autoComplete="username"
                                    onChange={(e) => setUsername(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') void handleLogin() }}
                                />
                            </div>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-semibold text-slate-700">Password</span>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    className="h-12 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter your password"
                                    value={password}
                                    autoComplete="current-password"
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') void handleLogin() }}
                                />
                            </div>
                        </label>

                        <label className="flex items-center gap-2.5 text-sm text-slate-600 select-none cursor-pointer">
                            <input type="checkbox" checked={rememberSession} onChange={(e) => setRememberSession(e.target.checked)}
                                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                            Remember me on this device
                        </label>

                        {(message || errorMessage) && (
                            <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                <span className="mt-0.5 shrink-0">⚠</span>
                                <span>{message || errorMessage}</span>
                            </div>
                        )}

                        <button type="button" onClick={() => void handleLogin()} disabled={isSubmitting}
                            className="h-12 w-full rounded-xl bg-blue-700 text-sm font-bold text-white shadow-md shadow-blue-200 transition hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-slate-400">
                            {isSubmitting ? 'Signing in…' : 'Sign In'}
                        </button>
                    </div>

                    <p className="mt-8 text-center text-xs text-slate-400">
                        MedStock HIS · IS-C Department<br />
                        <span className="text-slate-300">Hospital Information System</span>
                    </p>
                </div>
            </div>
        </main>
    )
}

export default Login
