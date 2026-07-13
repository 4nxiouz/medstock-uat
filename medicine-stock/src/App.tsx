import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactElement } from 'react'

import { clearCurrentUser, getCurrentUser } from './lib/auth'
import { LocationProvider, useLocation } from './lib/LocationContext'
import { supabase } from './lib/supabase'

import Home from './pages/Home'
import TransactionHistory from './pages/TransactionHistory'
import Inventory from './pages/Inventory'
import IssueDrug from './pages/IssueDrug'
import BagLog from './pages/BagLog'
import Login from './pages/Login'
import PrintBarcode from './pages/PrintBarcode'
import ReceiveDrug from './pages/ReceiveDrug'
import UserManage from './pages/UserManage'
import InstallPrompt from './components/InstallPrompt'
import type { Location } from './types'

function isAdmin(): boolean {
    return getCurrentUser()?.role === 'admin'
}

function canAccess(path: string): boolean {
    const user = getCurrentUser()
    if (!user?.allowed_pages) return true
    return user.allowed_pages.includes(path)
}

function Guarded({ path, element }: { path: string; element: ReactElement }) {
    return canAccess(path) ? element : <Navigate to="/" replace />
}

function AdminOnly({ element }: { element: ReactElement }) {
    return isAdmin() ? element : <Navigate to="/" replace />
}

type AppStatus = 'login' | 'ready'

function AppRoutes({ onLogout }: { onLogout: () => void }) {
    return (
        <Routes>
            <Route path="/" element={<Home onLogout={onLogout} />} />
            <Route path="/inventory" element={<Guarded path="/inventory" element={<Inventory onLogout={onLogout} />} />} />
            <Route path="/receive" element={<Guarded path="/receive" element={<ReceiveDrug onLogout={onLogout} />} />} />
            <Route path="/issue" element={<Guarded path="/issue" element={<IssueDrug onLogout={onLogout} />} />} />
<Route path="/print" element={<Guarded path="/print" element={<PrintBarcode onLogout={onLogout} />} />} />
            <Route path="/user" element={<AdminOnly element={<UserManage onLogout={onLogout} />} />} />
            <Route path="/history" element={<TransactionHistory onLogout={onLogout} />} />
            <Route path="/baglog" element={<Guarded path="/baglog" element={<BagLog onLogout={onLogout} />} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function AppInner() {
    const navigate = useNavigate()
    const { setLocation, setAvailableLocations, clearLocation } = useLocation()

    const [status, setStatus] = useState<AppStatus>(() => {
        // Check session storage (tab-scoped, no expiry needed)
        const sessionLogin = sessionStorage.getItem('isLogin') === 'true'
        // Check localStorage with 12-hour expiry
        let localLogin = false
        const expiry = localStorage.getItem('isLoginExpiry')
        if (localStorage.getItem('isLogin') === 'true' && expiry) {
            if (Date.now() < parseInt(expiry)) {
                localLogin = true
            } else {
                // Expired — clear it
                localStorage.removeItem('isLogin')
                localStorage.removeItem('isLoginExpiry')
            }
        }
        if (!sessionLogin && !localLogin) return 'login'
        return 'ready'
    })

    const [locationError, setLocationError] = useState('')

    // On mount when already logged in: auto-pick the first available location
    useEffect(() => {
        if (status !== 'ready') return
        const user = getCurrentUser()
        if (!user?.id) return
        void loadLocations(user.id, user.role).then((locs) => {
            setAvailableLocations(locs)
            if (locs.length > 0) setLocation(locs[0])
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function loadLocations(userId: string, role: string | null | undefined): Promise<Location[]> {
        if (role === 'admin') {
            const { data } = await supabase
                .from('location')
                .select('id, code, name, s_active')
                .eq('s_active', true)
                .order('code')
            return (data || []) as Location[]
        }

        const { data } = await supabase
            .from('user_location')
            .select('location_id, location:location(id, code, name, s_active)')
            .eq('user_id', userId)

        return ((data || []) as unknown as { location: Location }[])
            .map((row) => row.location)
            .filter((loc) => loc?.s_active)
    }

    async function handleLoginSuccess(rememberSession: boolean) {
        if (rememberSession) {
            const expiry = Date.now() + 12 * 60 * 60 * 1000 // 12 hours
            localStorage.setItem('isLogin', 'true')
            localStorage.setItem('isLoginExpiry', String(expiry))
        } else {
            sessionStorage.setItem('isLogin', 'true')
        }

        const user = getCurrentUser()
        if (!user?.id) return

        const locs = await loadLocations(user.id, user.role)
        setAvailableLocations(locs)

        if (locs.length === 0 && user.role !== 'admin' && user.role !== 'supervisor') {
            setLocationError('No location assigned to your account. Contact an administrator.')
            localStorage.removeItem('isLogin')
            localStorage.removeItem('isLoginExpiry')
            sessionStorage.removeItem('isLogin')
            clearCurrentUser()
            return
        }

        if (locs.length > 0) setLocation(locs[0])
        setStatus('ready')
        navigate('/')
    }

    function handleLogout() {
        localStorage.removeItem('isLogin')
        localStorage.removeItem('isLoginExpiry')
        sessionStorage.removeItem('isLogin')
        clearCurrentUser()
        clearLocation()
        setStatus('login')
        navigate('/')
    }

    if (status === 'login') {
        return <Login onLoginSuccess={handleLoginSuccess} errorMessage={locationError} />
    }

    return (
        <>
            <AppRoutes onLogout={handleLogout} />
            <InstallPrompt />
        </>
    )
}

function App() {
    return (
        <LocationProvider>
            <AppInner />
        </LocationProvider>
    )
}

export default App
