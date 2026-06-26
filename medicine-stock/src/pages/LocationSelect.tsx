import { Building2, LayoutDashboard, MapPin } from 'lucide-react'
import type { Location } from '../types'

type Props = {
    locations: Location[]
    onSelect: (loc: Location) => void
    onOverview?: () => void
    username: string
    isAdmin?: boolean
}

function LocationSelect({ locations, onSelect, onOverview, username, isAdmin }: Props) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 px-5 py-10">
            <div className="w-full max-w-2xl">
                <div className="mb-8 text-center">
                    <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-xl bg-blue-700">
                        <Building2 className="size-7 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900">Select Location</h1>
                    <p className="mt-1 text-xs font-semibold uppercase tracking-widest text-blue-600">IS-C · MedStock HIS</p>
                    <p className="mt-3 text-sm text-slate-500">
                        Welcome, <span className="font-semibold text-slate-700">{username}</span>. Select the location to work with.
                    </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                    {locations.map((loc) => (
                        <button
                            key={loc.id}
                            type="button"
                            onClick={() => onSelect(loc)}
                            className="flex items-center gap-4 rounded-xl border-2 border-slate-200 bg-white p-5 text-left transition hover:border-blue-500 hover:bg-blue-50 hover:shadow-sm"
                        >
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                                <MapPin className="size-5" />
                            </div>
                            <div>
                                <div className="text-lg font-bold text-slate-900">{loc.code}</div>
                                {loc.name !== loc.code && <div className="text-sm text-slate-500">{loc.name}</div>}
                            </div>
                        </button>
                    ))}
                </div>

                {isAdmin && onOverview && (
                    <div className="mt-6 text-center">
                        <button type="button" onClick={onOverview}
                            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50">
                            <LayoutDashboard className="size-4 text-blue-600" />
                            View All Locations Overview
                        </button>
                    </div>
                )}
            </div>
        </main>
    )
}

export default LocationSelect
