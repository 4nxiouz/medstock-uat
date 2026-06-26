import { AlertTriangle, ArrowRight, Boxes, Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import PageLayout from '../components/PageLayout'
import { useLocation as useLocationCtx } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Location } from '../types'

type PageProps = { onLogout: () => void; onSwitchLocation: () => void }

type DrugRow = { id: number; drug_name: string; current_stock: number; min_stock: number }

type LocationStat = {
    location: Location
    totalItems: number
    totalStock: number
    lowItems: DrugRow[]
    lastActivity: string | null
}

function AdminOverview({ onLogout, onSwitchLocation }: PageProps) {
    const navigate = useNavigate()
    const { availableLocations, setLocation } = useLocationCtx()
    const [stats, setStats] = useState<LocationStat[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function loadStats() {
            setLoading(true)
            const results: LocationStat[] = await Promise.all(
                availableLocations.map(async (loc) => {
                    const [drugRes, txRes] = await Promise.all([
                        supabase
                            .from('drug_master')
                            .select('id, drug_name, current_stock, min_stock')
                            .eq('location_id', loc.id),
                        supabase
                            .from('stock_transaction')
                            .select('created_at')
                            .eq('location_id', loc.id)
                            .order('created_at', { ascending: false })
                            .limit(1),
                    ])
                    const drugs = (drugRes.data || []) as DrugRow[]
                    const totalStock = drugs.reduce((s, d) => s + Number(d.current_stock || 0), 0)
                    const lowItems = drugs
                        .filter((d) => Number(d.current_stock) <= Number(d.min_stock))
                        .sort((a, b) => Number(a.current_stock) - Number(b.current_stock))
                    const lastActivity = (txRes.data?.[0] as { created_at: string } | undefined)?.created_at ?? null
                    return { location: loc, totalItems: drugs.length, totalStock, lowItems, lastActivity }
                })
            )
            setStats(results)
            setLoading(false)
        }
        void loadStats()
    }, [availableLocations])

    function handleGoTo(loc: Location) {
        setLocation(loc)
        navigate('/')
    }

    function formatDate(raw: string | null) {
        if (!raw) return 'No activity'
        return new Date(raw).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
    }

    const totalLow = stats.reduce((s, st) => s + st.lowItems.length, 0)

    return (
        <PageLayout title="Overview" subtitle="Summary of all locations" onLogout={onLogout} onSwitchLocation={onSwitchLocation}>
            {loading ? (
                <div className="py-20 text-center text-sm text-slate-500">Loading...</div>
            ) : (
                <>
                    {totalLow > 0 && (
                        <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                            <AlertTriangle className="size-5 shrink-0 text-red-600" />
                            <span className="text-sm font-semibold text-red-700">{totalLow} items are running low across all locations</span>
                        </div>
                    )}

                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                        {stats.map(({ location, totalItems, totalStock, lowItems, lastActivity }) => (
                            <Card key={location.id} className="flex flex-col p-5">
                                {/* Header */}
                                <div className="mb-4 flex items-start justify-between">
                                    <div>
                                        <div className="text-xl font-bold text-slate-900">{location.code}</div>
                                        {location.name !== location.code && (
                                            <div className="text-sm text-slate-500">{location.name}</div>
                                        )}
                                    </div>
                                    {lowItems.length > 0 && (
                                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                            <AlertTriangle className="size-3" />{lowItems.length} low
                                        </span>
                                    )}
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Package className="size-3.5" />Items
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</div>
                                    </div>
                                    <div className="rounded-lg bg-slate-50 p-3">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                            <Boxes className="size-3.5" />Total Stock
                                        </div>
                                        <div className="mt-1 text-2xl font-bold text-slate-900">{totalStock}</div>
                                    </div>
                                </div>

                                {/* Low stock list */}
                                {lowItems.length > 0 ? (
                                    <div className="mt-4 rounded-lg border border-red-100 bg-red-50 p-3">
                                        <div className="mb-2 text-xs font-bold uppercase tracking-wide text-red-700">
                                            Running Low
                                        </div>
                                        <div className="space-y-1.5">
                                            {lowItems.slice(0, 5).map((item) => (
                                                <div key={item.id} className="flex items-center justify-between gap-2">
                                                    <span className="truncate text-xs text-slate-700">{item.drug_name}</span>
                                                    <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold tabular-nums ${item.current_stock === 0 ? 'bg-red-600 text-white' : 'bg-red-100 text-red-700'}`}>
                                                        {item.current_stock === 0 ? 'OUT' : item.current_stock}
                                                    </span>
                                                </div>
                                            ))}
                                            {lowItems.length > 5 && (
                                                <div className="text-[11px] text-red-400">+{lowItems.length - 5} more…</div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2.5 text-xs font-medium text-emerald-700">
                                        ✓ All items well stocked
                                    </div>
                                )}

                                <div className="mt-3 text-xs text-slate-400">Last activity: {formatDate(lastActivity)}</div>

                                <button
                                    type="button"
                                    onClick={() => handleGoTo(location)}
                                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                                >
                                    Go to {location.code} <ArrowRight className="size-4" />
                                </button>
                            </Card>
                        ))}
                    </div>
                </>
            )}
        </PageLayout>
    )
}

export default AdminOverview
