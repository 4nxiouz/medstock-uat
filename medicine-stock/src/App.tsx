import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useEffect, useState, type ReactElement } from 'react'

import { clearCurrentUser, getCurrentUser } from './lib/auth'
import { LocationProvider, useLocation } from './lib/LocationContext'
import { supabase } from './lib/supabase'

import Home from './pages/Home'
import Inventory from './pages/Inventory'
import IssueDrug from './pages/IssueDrug'
import LocationManage from './pages/LocationManage'
import LocationSelect from './pages/LocationSelect'
import Login from './pages/Login'
import PrintBarcode from './pages/PrintBarcode'
import ReceiveDrug from './pages/ReceiveDrug'
import ScanBarcode from './pages/ScanBarcode'
import UserManage from './pages/UserManage'
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

type AppStatus = 'login' | 'pick-location' | 'ready'

function AppRoutes({ onLogout, onSwitchLocation }: { onLogout: () => void; onSwitchLocation: () => void }) {
    return (
        <Routes>
            <Route path="/" element={<Home onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />
            <Route path="/inventory" element={<Guarded path="/inventory" element={<Inventory onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />} />
            <Route path="/receive" element={<Guarded path="/receive" element={<ReceiveDrug onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />} />
            <Route path="/issue" element={<Guarded path="/issue" element={<IssueDrug onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />} />
            <Route path="/scan" element={<Guarded path="/scan" element={<ScanBarcode onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />} />
            <Route path="/print" element={<Guarded path="/print" element={<PrintBarcode onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />} />
            <Route path="/user" element={<AdminOnly element={<UserManage onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />} />
            <Route path="/locations" element={<AdminOnly element={<LocationManage onLogout={onLogout} onSwitchLocation={onSwitchLocation} />} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

function AppInner() {
    const navigate = useNavigate()
    const { setLocation, setAvailableLocations, availableLocations, clearLocation } = useLocation()

    const [status, setStatus] = useState<AppStatus>(() => {
        const loggedIn = localStorage.getItem('isLogin') === 'true' || sessionStorage.getItem('isLogin') === 'true'
        if (!loggedIn) return 'login'
        const locRaw = sessionStorage.getItem('medstock_location')
        return locRaw ? 'ready' : 'pick-location'
    })

    const [locationError, setLocationError] = useState('')

    // On page refresh: status='pick-location' but locations not loaded yet → load them now
    useEffect(() => {
        if (status !== 'pick-location') return
        const user = getCurrentUser()
        if (!user?.id) { setStatus('login'); return }
        void loadLocations(user.id, user.role).then((locs) => {
            setAvailableLocations(locs)
            if (locs.length === 0) {
                if (user.role === 'admin') { setStatus('ready'); navigate('/locations'); return }
                setLocationError('No location assigned to your account. Contact an administrator.')
                localStorage.removeItem('isLogin'); sessionStorage.removeItem('isLogin')
                clearCurrentUser(); setStatus('login')
            } else if (locs.length === 1) {
                setLocation(locs[0]); setStatus('ready'); navigate('/')
            }
            // else: >1 location → stay on pick-location with cards
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
            localStorage.setItem('isLogin', 'true')
        } else {
            sessionStorage.setItem('isLogin', 'true')
        }

        const user = getCurrentUser()
        if (!user?.id) return

        const locs = await loadLocations(user.id, user.role)
        setAvailableLocations(locs)

        if (locs.length === 0) {
            if (user.role === 'admin') {
                // Admin with no locations yet → go straight to app so they can add locations
                setStatus('ready')
                navigate('/locations')
                return
            }
            setLocationError('No location assigned to your account. Contact an administrator.')
            localStorage.removeItem('isLogin')
            sessionStorage.removeItem('isLogin')
            clearCurrentUser()
            return
        }

        if (locs.length === 1) {
            setLocation(locs[0])
            setStatus('ready')
            navigate('/')
        } else {
            setStatus('pick-location')
        }
    }

    function handleSelectLocation(loc: Location) {
        setLocation(loc)
        setStatus('ready')
        navigate('/')
    }

    async function handleSwitchLocation() {
        const user = getCurrentUser()
        if (!user?.id) return

        clearLocation()

        let locs = availableLocations
        if (locs.length === 0) {
            locs = await loadLocations(user.id, user.role)
            setAvailableLocations(locs)
        }

        if (locs.length === 0 && user.role === 'admin') {
            setStatus('ready')
            navigate('/locations')
            return
        }

        setStatus('pick-location')
    }

    function handleLogout() {
        localStorage.removeItem('isLogin')
        sessionStorage.removeItem('isLogin')
        clearCurrentUser()
        clearLocation()
        setStatus('login')
        navigate('/')
    }

    if (status === 'login') {
        return <Login onLoginSuccess={handleLoginSuccess} errorMessage={locationError} />
    }

    if (status === 'pick-location') {
        const user = getCurrentUser()
        return (
            <LocationSelect
                locations={availableLocations}
                onSelect={handleSelectLocation}
                username={user?.fullname || user?.username || 'User'}
            />
        )
    }

    return <AppRoutes onLogout={handleLogout} onSwitchLocation={handleSwitchLocation} />
}

function App() {
    return (
        <LocationProvider>
            <AppInner />
        </LocationProvider>
    )
}

export default App
