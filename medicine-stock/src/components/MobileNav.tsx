import {
    Backpack,
    History,
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
    { label: 'In Stock', path: '/receive', icon: PackagePlus },
    { label: 'Stock', path: '/inventory', icon: Pill },
    { label: 'Out Stock', path: '/issue', icon: PackageMinus },
]

function MobileNav() {
    const [menuOpen, setMenuOpen] = useState(false)
    const user = getCurrentUser()
    const isAdmin = user?.role === 'admin'
    const allowedPages = user?.allowed_pages

    function canSee(path: string) {
        if (!allowedPages) return true
        if (allowedPages.includes(path)) return true
        // Dashboard visible to all when no restriction (null), but not if explicit list excludes it
        return false
    }

    const filteredMainItems = mainItems.filter((item) =>
        canSee(item.path)
    )

    const moreItems = [
        ...(canSee('/baglog') ? [{ label: 'Bag Log', path: '/baglog', icon: Backpack }] : []),
        ...(canSee('/print') ? [{ label: 'Print Barcode', path: '/print', icon: Printer }] : []),
        ...(canSee('/history') ? [{ label: 'Transaction History', path: '/history', icon: History }] : []),
        ...(isAdmin ? [{ label: 'User Management', path: '/user', icon: Users }] : []),
    ]

    return (
        <>
            {/* Bottom nav bar */}
            <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white lg:hidden">
                <div className="grid grid-cols-5">
                    {filteredMainItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <NavLink key={item.path} to={item.path} end={item.path === '/'}
                                className={({ isActive }) =>
                                    `flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium transition-colors ${
                                        isActive ? 'text-teal-700' : 'text-slate-400'
                                    }`
                                }>
                                {({ isActive }) => (
                                    <>
                                        <div className={`rounded-lg px-3 py-1 ${isActive ? 'bg-teal-50' : ''}`}>
                                            <Icon className="size-5" />
                                        </div>
                                        <span>{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        )
                    })}

                    <button type="button" onClick={() => setMenuOpen(true)}
                        className="flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-slate-400">
                        <div className="rounded-lg px-3 py-1">
                            <Menu className="size-5" />
                        </div>
                        <span>More</span>
                    </button>
                </div>
            </nav>

            {/* More menu sheet */}
            {menuOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <button type="button" aria-label="Close menu"
                        className="absolute inset-0 bg-black/40"
                        onClick={() => setMenuOpen(false)} />

                    <div className="absolute inset-x-0 bottom-0 rounded-t-2xl overflow-hidden shadow-2xl">
                        {/* Sheet header — teal gradient */}
                        <div style={{ background: 'linear-gradient(160deg, #0f766e 0%, #1e3a5f 100%)' }}
                            className="flex items-center justify-between px-5 py-4">
                            <div className="text-sm font-semibold text-white">เมนูเพิ่มเติม</div>
                            <button type="button" onClick={() => setMenuOpen(false)}
                                className="inline-flex size-8 items-center justify-center rounded-md bg-white/15 text-white">
                                <X className="size-4" />
                            </button>
                        </div>

                        {/* Menu items */}
                        <div className="bg-white p-3 pb-8">
                            {moreItems.map((item) => {
                                const Icon = item.icon
                                return (
                                    <NavLink key={item.path} to={item.path}
                                        onClick={() => setMenuOpen(false)}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-medium transition-colors ${
                                                isActive
                                                    ? 'bg-teal-50 text-teal-800'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                            }`
                                        }>
                                        {({ isActive }) => (
                                            <>
                                                <div className={`flex size-9 items-center justify-center rounded-lg ${isActive ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                                    <Icon className="size-4" />
                                                </div>
                                                {item.label}
                                            </>
                                        )}
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
