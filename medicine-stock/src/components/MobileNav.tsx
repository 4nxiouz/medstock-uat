import {
    Barcode,
    Home,
    Menu,
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

const mainItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Inventory', path: '/inventory', icon: Pill },
    { label: 'Receive', path: '/receive', icon: PackagePlus },
    { label: 'Lookup', path: '/scan', icon: Barcode },
]

function MobileNav() {
    const [menuOpen, setMenuOpen] = useState(false)
    const isAdmin = getCurrentUser()?.role === 'admin'

    const moreItems = [
        { label: 'Dispense', path: '/issue', icon: PackageMinus },
        { label: 'Print', path: '/print', icon: Printer },
        ...(isAdmin ? [{ label: 'Users', path: '/user', icon: Users }] : []),
    ]

    return (
        <>
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
                <div className="grid grid-cols-5">
                    {mainItems.map((item) => {
                        const Icon = item.icon

                        return (
                            <NavLink
                                key={item.path}
                                to={item.path}
                                end={item.path === '/'}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium ${
                                        isActive ? 'text-blue-700' : 'text-slate-500'
                                    }`
                                }
                            >
                                <Icon className="size-5" />
                                {item.label}
                            </NavLink>
                        )
                    })}

                    <button
                        type="button"
                        onClick={() => setMenuOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-slate-500"
                    >
                        <Menu className="size-5" />
                        More
                    </button>
                </div>
            </nav>

            {menuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button
                        type="button"
                        aria-label="Close menu"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setMenuOpen(false)}
                    />
                    <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div className="text-sm font-semibold text-slate-900">More menus</div>
                            <button
                                type="button"
                                onClick={() => setMenuOpen(false)}
                                className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="grid gap-2">
                            {moreItems.map((item) => {
                                const Icon = item.icon

                                return (
                                    <NavLink
                                        key={item.path}
                                        to={item.path}
                                        onClick={() => setMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${
                                                isActive
                                                    ? 'bg-blue-50 text-blue-800'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`
                                        }
                                    >
                                        <Icon className="size-4" />
                                        {item.label}
                                    </NavLink>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}

export default MobileNav
