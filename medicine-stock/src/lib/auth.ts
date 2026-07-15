import type { UserProfile } from '../types'

const USER_KEY = 'medstock_user'

export function setCurrentUser(user: UserProfile) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user))
    localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function getCurrentUser(): UserProfile | null {
    const raw =
        sessionStorage.getItem(USER_KEY) ||
        localStorage.getItem(USER_KEY)

    if (!raw) {
        return null
    }

    try {
        return JSON.parse(raw) as UserProfile
    } catch {
        return null
    }
}

export function clearCurrentUser() {
    sessionStorage.removeItem(USER_KEY)
    localStorage.removeItem(USER_KEY)
}

export function getCreatedBy(): string {
    const user = getCurrentUser()
    return user?.username || user?.fullname || 'system'
}

export function isAdmin(): boolean {
    return getCurrentUser()?.role === 'admin'
}

export function isPrivileged(): boolean {
    const role = getCurrentUser()?.role
    return role === 'admin' || role === 'supervisor'
}

export function canAccessBagLogEdit(): boolean {
    const user = getCurrentUser()
    if (user?.role === 'admin') return true
    return user?.allowed_pages?.includes('/baglog/edit') ?? false
}

export function canAccessBagLogLog(): boolean {
    const user = getCurrentUser()
    if (user?.role === 'admin') return true
    return user?.allowed_pages?.includes('/baglog/log') ?? false
}
