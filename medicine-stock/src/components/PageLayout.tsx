import type { ReactNode } from 'react'
import Header from './Header'
import MobileNav from './MobileNav'
import Sidebar from './Sidebar'

type Props = {
    title: string
    subtitle?: string
    children: ReactNode
    onLogout: () => void
}

function PageLayout({ title, subtitle, children, onLogout }: Props) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <Sidebar onLogout={onLogout} />
            <div className="lg:pl-[17rem]">
                <Header title={title} subtitle={subtitle} onLogout={onLogout} />
                <main className="mx-auto max-w-7xl px-5 py-6 pb-24 lg:px-8 lg:pb-6">
                    {children}
                </main>
            </div>
            <MobileNav />
        </div>
    )
}

export default PageLayout
