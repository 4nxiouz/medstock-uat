import { LogOut, UserCircle } from 'lucide-react'
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
        <header className="border-b border-slate-200 bg-white">
            <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-8">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-teal-700">
                        IS-C · MedStock
                    </div>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">{title}</h1>
                    {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
                </div>

                <div className="flex items-center gap-3">
                    <div className="hidden items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 sm:flex">
                        <UserCircle className="size-5 text-teal-600" />
                        <div className="text-right">
                            <div className="text-sm font-semibold text-slate-900">{displayName}</div>
                            <div className="text-xs text-emerald-600">● Online</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onLogout}
                        title="Logout"
                        className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                    >
                        <LogOut className="size-4" />
                    </button>
                </div>
            </div>
        </header>
    )
}

export default Header
