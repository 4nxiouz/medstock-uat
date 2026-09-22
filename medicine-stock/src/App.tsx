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

type AppStatus = 'checking' | 'login' | 'ready'

function AppRoutes({ onLogout }: { onLogout: () => void }) {
    return (
        <Routes>
            <Route path="/" element={<Home onLogout={onLogout} />} />
            <Route path="/stock" element={<Guarded path="/stock" element={<Inventory onLogout={onLogout} />} />} />
            <Route path="/in-stock" element={<Guarded path="/in-stock" element={<ReceiveDrug onLogout={onLogout} />} />} />
            <Route path="/out-stock" element={<Guarded path="/out-stock" element={<IssueDrug onLogout={onLogout} />} />} />
            <Route path="/print" element={<Guarded path="/print" element={<PrintBarcode onLogout={onLogout} />} />} />
            <Route path="/user" element={<AdminOnly element={<UserManage onLogout={onLogout} />} />} />
            <Route path="/history" element={<TransactionHistory onLogout={onLogout} />} />
            <Route path="/bag-report" element={<Guarded path="/bag-report" element={<BagLog onLogout={onLogout} />} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function AppInner() {
    const navigate = useNavigate()
    const { setLocation, setAvailableLocations, clearLocation } = useLocation()

    const [status, setStatus] = useState<AppStatus>('checking')
    const [locationError, setLocationError] = useState('')

    // On mount: check if Supabase session is still valid
    useEffect(() => {
        void supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                // No active Supabase session — require re-login
                clearCurrentUser()
                clearLocation()
                localStorage.removeItem('rememberMe')
                sessionStorage.removeItem('sessionActive')
                setStatus('login')
                return
            }

            // Session exists — check remember me flag
            const remembered = localStorage.getItem('rememberMe') === 'true'
            const sessionActive = sessionStorage.getItem('sessionActive') === 'true'

            if (!remembered && !sessionActive) {
                // New browser opened without "remember me" — sign out
                void supabase.auth.signOut().then(() => {
                    clearCurrentUser()
                    clearLocation()
                    setStatus('login')
                })
                return
            }

            const user = getCurrentUser()
            if (!user?.id) {
                setStatus('login')
                return
            }

            // Valid session — load locations and show app
            void loadLocations(user.id, user.role).then((locs) => {
                setAvailableLocations(locs)
                if (locs.length > 0) setLocation(locs[0])
                setStatus('ready')
            })
        })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Listen for token expiry — auto-logout if session cannot be refreshed
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_OUT') {
                clearCurrentUser()
                clearLocation()
                localStorage.removeItem('rememberMe')
                sessionStorage.removeItem('sessionActive')
                setStatus('login')
                navigate('/')
            }
        })
        return () => subscription.unsubscribe()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    async function loadLocations(userId: string, role: string | null | undefined): Promise<Location[]> {
        if (role === 'admin' || role === 'supervisor') {
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
        // Store remember preference
        if (rememberSession) {
            localStorage.setItem('rememberMe', 'true')
        } else {
            localStorage.removeItem('rememberMe')
        }
        // Always mark current browser session as active
        sessionStorage.setItem('sessionActive', 'true')

        const user = getCurrentUser()
        if (!user?.id) return

        const locs = await loadLocations(user.id, user.role)
        setAvailableLocations(locs)

        if (locs.length === 0 && user.role !== 'admin' && user.role !== 'supervisor') {
            setLocationError('No location assigned to your account. Contact an administrator.')
            void supabase.auth.signOut()
            clearCurrentUser()
            localStorage.removeItem('rememberMe')
            sessionStorage.removeItem('sessionActive')
            return
        }

        if (locs.length > 0) setLocation(locs[0])
        setStatus('ready')
        navigate('/')
    }

    function handleLogout() {
        void supabase.auth.signOut()
        clearCurrentUser()
        clearLocation()
        localStorage.removeItem('rememberMe')
        sessionStorage.removeItem('sessionActive')
        setStatus('login')
        navigate('/')
    }

    if (status === 'checking') return null

    const isUAT = window.location.hostname.includes('uat')

    if (status === 'login') {
        return (
            <>
                {isUAT && <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 py-1 text-center text-xs font-bold text-white">⚠ UAT Environment — ข้อมูลทดสอบเท่านั้น ไม่ใช่ระบบจริง</div>}
                <Login onLoginSuccess={handleLoginSuccess} errorMessage={locationError} />
            </>
        )
    }

    return (
        <>
            {isUAT && <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 py-1 text-center text-xs font-bold text-white">⚠ UAT Environment — ข้อมูลทดสอบเท่านั้น ไม่ใช่ระบบจริง</div>}
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
