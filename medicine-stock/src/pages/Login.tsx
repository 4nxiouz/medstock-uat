import { Activity, KeyRound, Lock, User } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { setCurrentUser } from '../lib/auth'
import type { UserProfile } from '../types'

type LoginProps = {
    onLoginSuccess: (rememberSession: boolean) => void
}

function Login({ onLoginSuccess }: LoginProps) {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [rememberSession, setRememberSession] = useState(true)
    const [message, setMessage] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    async function handleLogin() {
        const cleanUsername = username.trim()

        setMessage('')

        if (!cleanUsername || !password) {
            setMessage('Please enter username and password.')
            return
        }

        setIsSubmitting(true)

        const { data, error } = await supabase
            .from('user_profile')
            .select('id, username, password_hash, fullname, role, s_active')

        setIsSubmitting(false)

        if (error) {
            setMessage('Cannot connect to user database.')
            return
        }

        const users = (data || []) as UserProfile[]
        const user = users.find((item) => item.username === cleanUsername)

        if (!user) {
            setMessage('User not found.')
            return
        }

        if (!user.s_active) {
            setMessage('This account is disabled.')
            return
        }

        if (user.password_hash !== password) {
            setMessage('Password is incorrect.')
            return
        }

        setCurrentUser(user)
        onLoginSuccess(rememberSession)
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
            <section className="grid w-full max-w-5xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl lg:grid-cols-[1fr_420px]">
                <div className="hidden bg-blue-950 p-10 text-white lg:flex lg:flex-col">
                    <div className="flex size-12 items-center justify-center rounded-lg bg-blue-500">
                        <KeyRound className="size-6" />
                    </div>
                    <h1 className="mt-8 text-4xl font-bold">MedStock HIS</h1>
                    <p className="mt-3 max-w-md text-sm leading-6 text-blue-200">
                        Hospital pharmacy inventory control for stock receiving,
                        withdrawal, barcode scanning, and operational monitoring.
                    </p>

                    <div className="mt-10 flex-1 space-y-3">
                        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                            <Activity className="mt-0.5 size-4 shrink-0 text-blue-400" />
                            <span className="text-sm text-blue-100">Real-time stock visibility through Supabase</span>
                        </div>
                        <div className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
                            <Lock className="mt-0.5 size-4 shrink-0 text-blue-400" />
                            <span className="text-sm text-blue-100">Secure role-based access for pharmacy staff</span>
                        </div>
                    </div>

                    <div className="mt-8 text-xs text-blue-400">
                        Hospital Information System · Pharmacy Module
                    </div>
                </div>

                <div className="p-8 sm:p-10">
                    <div className="mb-8">
                        <div className="text-xs font-bold uppercase tracking-widest text-blue-600">
                            Pharmacy Inventory
                        </div>
                        <h2 className="mt-2 text-3xl font-bold text-slate-900">
                            Sign in
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Use your hospital inventory account.
                        </p>
                    </div>

                    <div className="space-y-5">
                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Username
                            </span>
                            <div className="relative">
                                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter username"
                                    value={username}
                                    onChange={(event) => setUsername(event.target.value)}
                                />
                            </div>
                        </label>

                        <label className="block">
                            <span className="mb-2 block text-sm font-medium text-slate-700">
                                Password
                            </span>
                            <div className="relative">
                                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="password"
                                    className="h-11 w-full rounded-lg border border-slate-300 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter') {
                                            void handleLogin()
                                        }
                                    }}
                                />
                            </div>
                        </label>

                        <label className="flex items-center gap-2 text-sm text-slate-600">
                            <input
                                type="checkbox"
                                checked={rememberSession}
                                onChange={(event) => setRememberSession(event.target.checked)}
                                className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            Remember session
                        </label>

                        {message && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {message}
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => void handleLogin()}
                            disabled={isSubmitting}
                            className="h-11 w-full rounded-lg bg-blue-700 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
                        >
                            {isSubmitting ? 'Signing in...' : 'Login'}
                        </button>
                    </div>
                </div>
            </section>
        </main>
    )
}

export default Login
