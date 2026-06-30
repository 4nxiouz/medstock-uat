import { ClipboardList, LogOut, UserCircle } from 'lucide-react'
import { getCurrentUser } from '../lib/auth'

type HeaderProps = {
    title: string
    subtitle?: string
    onLogout: () => void
}

function Header({ title, subtitle, onLogout }: HeaderProps) {
    const user = getCurrentUser()
    const displayName = user?.fullname || user?.username || 'Staff'

    return (
        <header>
            {/* Mobile header — teal gradient */}
            <div className="lg:hidden" style={{ background: 'linear-gradient(160deg, #0f766e 0%, #1e3a5f 100%)' }}>
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2.5">
                        <div className="flex size-8 items-center justify-center rounded-md bg-white/15">
                            <ClipboardList className="size-4 text-white" />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">MedStock HIS</div>
                            <div className="text-[10px] text-white/50">IS-C · Information Systems</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5">
                            <UserCircle className="size-4 text-white/70" />
                            <span className="text-xs font-medium text-white/90">{displayName}</span>
                        </div>
                        <button type="button" onClick={onLogout} title="Logout"
                            className="inline-flex size-8 items-center justify-center rounded-md bg-white/10 text-white/70 hover:bg-red-500/30 hover:text-red-200">
                            <LogOut className="size-4" />
                        </button>
                    </div>
                </div>
                <div className="border-t border-white/10 px-4 py-2.5">
                    <h1 className="text-base font-bold text-white">{title}</h1>
                    {subtitle && <p className="text-xs text-white/55">{subtitle}</p>}
                </div>
            </div>

            {/* Desktop header — white, sidebar handles the brand */}
            <div className="hidden border-b border-slate-200 bg-white lg:block">
                <div className="flex items-center justify-between px-8 py-4">
                    <div>
                        <div className="text-xs font-semibold uppercase tracking-widest text-teal-700">IS-C · MedStock</div>
                        <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
                        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                            <UserCircle className="size-5 text-teal-600" />
                            <div className="text-right">
                                <div className="text-sm font-semibold text-slate-900">{displayName}</div>
                                <div className="text-xs text-emerald-600">● Online</div>
                            </div>
                        </div>
                        <button type="button" onClick={onLogout} title="Logout"
                            className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600">
                            <LogOut className="size-4" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
