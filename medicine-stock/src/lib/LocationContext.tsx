import { createContext, useContext, useState, type ReactNode } from 'react'
import type { Location } from '../types'

const LOCATION_KEY = 'medstock_location'

type LocationContextType = {
    location: Location | null
    availableLocations: Location[]
    setLocation: (loc: Location) => void
    setAvailableLocations: (locs: Location[]) => void
    clearLocation: () => void
}

const LocationContext = createContext<LocationContextType | null>(null)

export function LocationProvider({ children }: { children: ReactNode }) {
    const [location, setLocationState] = useState<Location | null>(() => {
        try {
            const raw = sessionStorage.getItem(LOCATION_KEY)
            return raw ? (JSON.parse(raw) as Location) : null
        } catch {
            return null
        }
    })
    const [availableLocations, setAvailableLocations] = useState<Location[]>([])

    function setLocation(loc: Location) {
        sessionStorage.setItem(LOCATION_KEY, JSON.stringify(loc))
        setLocationState(loc)
    }

    function clearLocation() {
        sessionStorage.removeItem(LOCATION_KEY)
        setLocationState(null)
    }

    return (
        <LocationContext.Provider value={{ location, availableLocations, setLocation, setAvailableLocations, clearLocation }}>
            {children}
        </LocationContext.Provider>
    )
}

export function useLocation() {
    const ctx = useContext(LocationContext)
    if (!ctx) throw new Error('useLocation must be used within LocationProvider')
    return ctx
}
