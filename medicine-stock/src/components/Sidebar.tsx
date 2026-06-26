import {
    Barcode,
    Building2,
    ClipboardList,
    History,
    Home,
    KeyRound,
    LayoutDashboard,
    LogOut,
    MapPin,
    PackageMinus,
    PackagePlus,
    Pill,
    Printer,
    RefreshCw,
    Users,
    X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { getCurrentUser } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import FormInput from './FormInput'

type SidebarProps = {
    onLogout: () => void
    onSwitchLocation: () => void
}

const baseItems = [
    { label: 'Dashboard', path: '/', icon: Home, adminOnly: false },
    { label: 'Inventory', path: '/inventory', icon: Pill, adminOnly: false },
    { label: 'Dispense', path: '/issue', icon: PackageMinus, adminOnly: false },
    { label: 'Receive Medicine', path: '/receive', icon: PackagePlus, adminOnly: false },
    { label: 'Stock Lookup', path: '/scan', icon: Barcode, adminOnly: false },
    { label: 'Print Barcode', path: '/print', icon: Printer, adminOnly: false },
    { label: 'Transaction History', path: '/history', icon: History, adminOnly: false },
    { label: 'Overview', path: '/overview', icon: LayoutDashboard, adminOnly: true },
    { label: 'Manage Locations', path: '/locations', icon: Building2, adminOnly: true },
    { label: 'User Management', path: '/user', icon: Users, adminOnly: true },
]

function Sidebar({ onLogout, onSwitchLocation }: SidebarProps) {
    const isAdmin = getCurrentUser()?.role === 'admin'
    const { location, availableLocations } = useLocation()
    const menuItems = baseItems.filter((item) => !item.adminOnly || isAdmin)
    const canSwitch = availableLocations.length > 1 || isAdmin
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
        if (!data || data.password_hash !== oldPw) { setPwMsg('Current password is incorrect.'); setPwMsgType('error'); return }
        const { error } = await supabase.from('user_profile').update({ password_hash: newPw }).eq('username', user.username)
        if (error) { setPwMsg('Update failed.'); setPwMsgType('error'); return }
        setPwMsg('Password changed successfully.'); setPwMsgType('ok')
        setOldPw(''); setNewPw('')
    }

    return (
        <>
            <aside className="fixed inset-y-0 left-0 z-20 hidden w-[17rem] flex-col bg-blue-950 text-white lg:flex">
                <div className="border-b border-white/10 px-6 py-5">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-md bg-blue-500">
                            <ClipboardList className="size-5" />
                        </div>
                        <div>
                            <div className="text-base font-bold tracking-wide">MedStock HIS</div>
                            <div className="text-xs text-blue-300">IS-C · Information Systems</div>
                        </div>
                    </div>

                    <div className="mt-4 rounded-lg bg-white/10 px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <MapPin className="size-3.5 shrink-0 text-blue-300" />
                                <div className="min-w-0">
                                    <div className="text-xs font-bold text-white truncate">{location?.code ?? '—'}</div>
                                    <div className="text-[10px] text-blue-300 truncate">{location?.name ?? 'No location'}</div>
                                </div>
                            </div>
                            {canSwitch && (
                                <button type="button" onClick={onSwitchLocation} title="Switch location"
                                    className="shrink-0 rounded-md p-1.5 text-blue-300 hover:bg-white/10 hover:text-white transition">
                                    <RefreshCw className="size-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
                    {menuItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <NavLink key={item.path} to={item.path} end={item.path === '/'}
                                className={({ isActive }) =>
                                    `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-blue-200 hover:bg-white/10 hover:text-white'}`
                                }>
                                <Icon className="size-4" />{item.label}
                            </NavLink>
                        )
                    })}
                </nav>

                <div className="border-t border-white/10 p-3">
                    <div className="mb-1 px-3 py-1.5">
                        <div className="text-xs text-blue-400">Signed in as <span className="font-semibold text-blue-200">{getCurrentUser()?.username}</span></div>
                        <div className="text-[10px] capitalize text-blue-500">{getCurrentUser()?.role ?? 'user'}</div>
                    </div>
                    <button type="button" onClick={() => { setChangePwOpen(true); setPwMsg(''); setOldPw(''); setNewPw('') }}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-blue-200 transition hover:bg-white/10 hover:text-white">
                        <KeyRound className="size-4" />Change Password
                    </button>
                    <button type="button" onClick={onLogout}
                        className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-blue-200 transition hover:bg-red-500/15 hover:text-red-200">
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
                                className="flex-1 rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default Sidebar
