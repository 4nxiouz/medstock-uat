import {
    Backpack,
    ClipboardList,
    History,
    Home,
    KeyRound,
    LogOut,
    PackageMinus,
    PackagePlus,
    Pill,
    Printer,
    Users,
    X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getCurrentUser } from '../lib/auth'
import { hashPassword, isHashed } from '../lib/crypto'
import { supabase } from '../lib/supabase'
import FormInput from './FormInput'

type SidebarProps = {
    onLogout: () => void
}

const baseItems = [
    { label: 'Dashboard', path: '/', icon: Home, adminOnly: false },
    { label: 'In Stock', path: '/receive', icon: PackagePlus, adminOnly: false },
    { label: 'Stock', path: '/inventory', icon: Pill, adminOnly: false },
    { label: 'Out Stock', path: '/issue', icon: PackageMinus, adminOnly: false },
    { label: 'Print Barcode', path: '/print', icon: Printer, adminOnly: false },
    { label: 'Transaction History', path: '/history', icon: History, adminOnly: false },
    { label: 'Bag Log', path: '/baglog', icon: Backpack, adminOnly: false },
    { label: 'User Management', path: '/user', icon: Users, adminOnly: true },
]

function Sidebar({ onLogout }: SidebarProps) {
    const user = getCurrentUser()
    const isAdmin = user?.role === 'admin'
    const allowedPages = user?.allowed_pages
    const menuItems = baseItems.filter((item) => {
        if (item.adminOnly) return isAdmin
        if (item.path === '/') return true
        if (!allowedPages) return true
        return allowedPages.includes(item.path)
    })
    const [changePwOpen, setChangePwOpen] = useState(false)
    const [oldPw, setOldPw] = useState('')
    const [newPw, setNewPw] = useState('')
    const [pwMsg, setPwMsg] = useState('')
    const [pwMsgType, setPwMsgType] = useState<'ok' | 'error'>('ok')

    async function handleChangePw() {
        setPwMsg('')
        const user = getCurrentUser()
        if (!user?.username) return
        if (!oldPw || !newPw) { setPwMsg('Fill in both fields.'); setPwMsgType('error'); return }
        const { data } = await supabase.from('user_profile').select('password_hash').eq('username', user.username).single()
        if (!data) { setPwMsg('User not found.'); setPwMsgType('error'); return }
        const stored = data.password_hash as string
        const oldHashed = await hashPassword(oldPw)
        const matches = isHashed(stored) ? stored === oldHashed : stored === oldPw
        if (!matches) { setPwMsg('Current password is incorrect.'); setPwMsgType('error'); return }
        const { error } = await supabase.from('user_profile').update({ password_hash: await hashPassword(newPw) }).eq('username', user.username)
        if (error) { setPwMsg('Update failed.'); setPwMsgType('error'); return }
        setPwMsg('Password changed successfully.'); setPwMsgType('ok')
        setOldPw(''); setNewPw('')
    }

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-[17rem] flex-col lg:flex" style={{background: 'linear-gradient(160deg, #0f766e 0%, #1e3a5f 100%)'}}>
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-teal-600">
                            <ClipboardList className="size-5 text-white" />
                        </div>
                        <div>
                            <div className="text-base font-bold tracking-wide text-white">MedStock HIS</div>
                            <div className="text-xs text-white/50">IS-C · Information Systems</div>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
                    {menuItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <NavLink key={item.path} to={item.path} end={item.path === '/'}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-white/16 text-white' : 'text-white/65 hover:bg-white/10 hover:text-white'}`
                                }>
                                <Icon className="size-4" />{item.label}
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="border-t border-white/10 p-3">
                    <div className="mb-1 px-3 py-1.5">
                        <div className="text-xs text-white/50">Signed in as <span className="font-semibold text-white/80">{getCurrentUser()?.username}</span></div>
                        <div className="text-[10px] capitalize text-white/40">{getCurrentUser()?.role ?? 'user'}</div>
                    </div>
                    <button type="button" onClick={() => { setChangePwOpen(true); setPwMsg(''); setOldPw(''); setNewPw('') }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-white/65 transition hover:bg-white/10 hover:text-white">
                        <KeyRound className="size-4" />Change Password
                    </button>
                    <button type="button" onClick={onLogout}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-white/65 transition hover:bg-red-500/20 hover:text-red-300">
                        <LogOut className="size-4" />Logout
                    </button>
                </div>
            </aside>

            {/* Change Password Modal */}
            {changePwOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <h3 className="font-semibold text-slate-900">Change Password</h3>
                            <button type="button" onClick={() => setChangePwOpen(false)}
                                className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500">
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <FormInput label="Current Password" type="password" placeholder="Enter current password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} />
                            <FormInput label="New Password" type="password" placeholder="Enter new password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                        </div>
                        {pwMsg && (
                            <div className={`mt-3 rounded-md px-3 py-2.5 text-sm ${pwMsgType === 'error' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{pwMsg}</div>
                        )}
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => setChangePwOpen(false)}
                                className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void handleChangePw()}
                                className="flex-1 rounded-lg bg-teal-700 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Sidebar
