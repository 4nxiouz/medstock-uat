import {
    Barcode,
    ClipboardList,
    Home,
    LogOut,
    PackageMinus,
    PackagePlus,
    Pill,
    Printer,
    Users,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'

type SidebarProps = {
    onLogout: () => void
}

const menuItems = [
    { label: 'Dashboard', path: '/', icon: Home },
    { label: 'Inventory', path: '/inventory', icon: Pill },
    { label: 'Dispense', path: '/issue', icon: PackageMinus },
    { label: 'Receive Medicine', path: '/receive', icon: PackagePlus },
    { label: 'Stock Lookup', path: '/scan', icon: Barcode },
    { label: 'Print Barcode', path: '/print', icon: Printer },
    { label: 'User Management', path: '/user', icon: Users },
]

function Sidebar({ onLogout }: SidebarProps) {
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
