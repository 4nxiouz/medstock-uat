import { AlertTriangle, ArrowRight, Boxes, Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Card from '../components/Card'
import PageLayout from '../components/PageLayout'
import { useLocation as useLocationCtx } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Location } from '../types'

type PageProps = { onLogout: () => void; onSwitchLocation: () => void }

type LocationStat = {
    location: Location
    totalMedicines: number
    totalStock: number
    lowStock: number
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
                        supabase.from('drug_master').select('id, current_stock, min_stock').eq('location_id', loc.id),
                        supabase.from('stock_transaction').select('created_at').eq('location_id', loc.id).order('created_at', { ascending: false }).limit(1),
                    ])
                    const drugs = drugRes.data || []
                    const totalStock = drugs.reduce((s, d) => s + Number(d.current_stock || 0), 0)
                    const lowStock = drugs.filter((d) => Number(d.current_stock) <= Number(d.min_stock)).length
                    const lastActivity = (txRes.data?.[0] as { created_at: string } | undefined)?.created_at ?? null
                    return { location: loc, totalMedicines: drugs.length, totalStock, lowStock, lastActivity }
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

    return (
        <PageLayout title="Overview" subtitle="Summary of all locations" onLogout={onLogout} onSwitchLocation={onSwitchLocation}>
            {loading ? (
                <div className="py-20 text-center text-sm text-slate-500">Loading...</div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {stats.map(({ location, totalMedicines, totalStock, lowStock, lastActivity }) => (
                        <Card key={location.id} className="p-5">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <div className="text-xl font-bold text-slate-900">{location.code}</div>
                                    {location.name !== location.code && <div className="text-sm text-slate-500">{location.name}</div>}
                                </div>
                                {lowStock > 0 && (
                                    <span className="flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                                        <AlertTriangle className="size-3" />{lowStock} low
                                    </span>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg bg-slate-50 p-3">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500"><Package className="size-3.5" />Medicines</div>
                                    <div className="mt-1 text-2xl font-bold text-slate-900">{totalMedicines}</div>
                                </div>
                                <div className="rounded-lg bg-slate-50 p-3">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-500"><Boxes className="size-3.5" />Total Stock</div>
                                    <div className="mt-1 text-2xl font-bold text-slate-900">{totalStock}</div>
                                </div>
                            </div>

                            <div className="mt-3 text-xs text-slate-400">Last activity: {formatDate(lastActivity)}</div>

                            <button type="button" onClick={() => handleGoTo(location)}
                                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-700 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
                                Go to {location.code} <ArrowRight className="size-4" />
                            </button>
                        </Card>
                    ))}
                </div>
            )}
        </PageLayout>
    )
}

export default AdminOverview
