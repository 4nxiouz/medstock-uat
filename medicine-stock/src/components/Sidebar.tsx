import {
    Barcode,
    Building2,
    ClipboardList,
    Home,
    LogOut,
    MapPin,
    PackageMinus,
    PackagePlus,
    Pill,
    Printer,
    RefreshCw,
    Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getCurrentUser } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'

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
    { label: 'Manage Locations', path: '/locations', icon: Building2, adminOnly: true },
    { label: 'User Management', path: '/user', icon: Users, adminOnly: true },
]

function Sidebar({ onLogout, onSwitchLocation }: SidebarProps) {
    const isAdmin = getCurrentUser()?.role === 'admin'
    const { location, availableLocations } = useLocation()
    const menuItems = baseItems.filter((item) => !item.adminOnly || isAdmin)
    const canSwitch = availableLocations.length > 1 || isAdmin

    return (
        <aside className="fixed inset-y-0 left-0 z-20 hidden w-[17rem] flex-col bg-blue-950 text-white lg:flex">
            <div className="border-b border-white/10 px-6 py-5">
                <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-md bg-blue-500">
                        <ClipboardList className="size-5" />
                    </div>
                    <div>
                        <div className="text-base font-bold tracking-wide">MedStock HIS</div>
                        <div className="text-xs text-blue-300">Pharmacy Inventory</div>
                    </div>
                </div>

                {/* Current location */}
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
                            <button
                                type="button"
                                onClick={onSwitchLocation}
                                title="Switch location"
                                className="shrink-0 rounded-md p-1.5 text-blue-300 hover:bg-white/10 hover:text-white transition"
                            >
                                <RefreshCw className="size-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <nav className="flex-1 space-y-0.5 px-3 py-4">
                {menuItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                                    isActive
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'text-blue-200 hover:bg-white/10 hover:text-white'
                                }`
                            }
                        >
                            <Icon className="size-4" />
                            {item.label}
                        </NavLink>
                    )
                })}
            </nav>

            <div className="border-t border-white/10 p-3">
                <div className="mb-1 px-3 py-1.5">
                    <div className="text-xs text-blue-400">
                        Signed in as <span className="font-semibold text-blue-200">{getCurrentUser()?.username}</span>
                    </div>
                    <div className="text-[10px] capitalize text-blue-500">{getCurrentUser()?.role ?? 'user'}</div>
                </div>
                <button
                    type="button"
                    onClick={onLogout}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-blue-200 transition hover:bg-red-500/15 hover:text-red-200"
                >
                    <LogOut className="size-4" />
                    Logout
                </button>
            </div>
        </aside>
    )
}

export default Sidebar
