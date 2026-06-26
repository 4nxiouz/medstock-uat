import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { useState, type ReactElement } from 'react'

import { clearCurrentUser, getCurrentUser } from './lib/auth'

import Home from './pages/Home'
import Inventory from './pages/Inventory'
import IssueDrug from './pages/IssueDrug'
import Login from './pages/Login'
import PrintBarcode from './pages/PrintBarcode'
import ReceiveDrug from './pages/ReceiveDrug'
import ScanBarcode from './pages/ScanBarcode'
import UserManage from './pages/UserManage'

function canAccess(path: string): boolean {
    const user = getCurrentUser()
    if (!user?.allowed_pages) return true
    return user.allowed_pages.includes(path)
}

function Guarded({ path, element }: { path: string; element: ReactElement }) {
    return canAccess(path) ? element : <Navigate to="/" replace />
}

function App() {
    const navigate = useNavigate()
    const [isLogin, setIsLogin] = useState(
        () => localStorage.getItem('isLogin') === 'true' || sessionStorage.getItem('isLogin') === 'true',
    )

    function handleLoginSuccess(rememberSession: boolean) {
        if (rememberSession) {
            localStorage.setItem('isLogin', 'true')
        } else {
            sessionStorage.setItem('isLogin', 'true')
        }
        setIsLogin(true)
        navigate('/')
    }

    function handleLogout() {
        localStorage.removeItem('isLogin')
        sessionStorage.removeItem('isLogin')
        clearCurrentUser()
        setIsLogin(false)
        navigate('/')
    }

    if (!isLogin) {
        return <Login onLoginSuccess={handleLoginSuccess} />
    }

    return (
        <Routes>
            <Route path="/" element={<Home onLogout={handleLogout} />} />
            <Route path="/inventory" element={<Guarded path="/inventory" element={<Inventory onLogout={handleLogout} />} />} />
            <Route path="/receive" element={<Guarded path="/receive" element={<ReceiveDrug onLogout={handleLogout} />} />} />
            <Route path="/issue" element={<Guarded path="/issue" element={<IssueDrug onLogout={handleLogout} />} />} />
            <Route path="/scan" element={<Guarded path="/scan" element={<ScanBarcode onLogout={handleLogout} />} />} />
            <Route path="/print" element={<Guarded path="/print" element={<PrintBarcode onLogout={handleLogout} />} />} />
            <Route path="/user" element={<UserManage onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}

export default App
