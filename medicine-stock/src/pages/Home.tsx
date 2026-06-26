import { AlertTriangle, Boxes, Package } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import RecentTransaction from '../components/RecentTransaction'
import StatCard from '../components/StatCard'
import Table from '../components/Table'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void; onSwitchLocation: () => void }

function Home({ onLogout, onSwitchLocation }: PageProps) {
    const { location } = useLocation()
    const [totalDrug, setTotalDrug] = useState(0)
    const [totalStock, setTotalStock] = useState(0)
    const [lowStock, setLowStock] = useState<Drug[]>([])

    useEffect(() => {
        if (!location) return

        async function loadDashboard() {
            const { data, error } = await supabase
                .from('drug_master')
                .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
                .eq('location_id', location!.id)
                .order('drug_name')

            if (error) return

            const drugs = (data || []) as Drug[]
            setTotalDrug(drugs.length)
            setTotalStock(drugs.reduce((sum, d) => sum + Number(d.current_stock || 0), 0))
            setLowStock(drugs.filter((d) => Number(d.current_stock) <= Number(d.min_stock)))
        }

        void loadDashboard()
    }, [location])

    return (
        <PageLayout title="Dashboard" subtitle={`Stock overview for ${location?.name ?? '—'}`} onLogout={onLogout} onSwitchLocation={onSwitchLocation}>
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Medicines" value={totalDrug} tone="blue" icon={Package} />
                <StatCard title="Total Stock" value={totalStock} tone="green" icon={Boxes} />
                <StatCard title="Low Stock" value={lowStock.length} tone="red" icon={AlertTriangle} />
            </div>

            <Card className="mt-6 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Low Stock Alert</h2>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">stock ≤ minimum</span>
                </div>

                {lowStock.length === 0 ? (
                    <EmptyState title="No low stock items" description="All medicines are above minimum stock." />
                ) : (
                    <Table>
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Image</th>
                                <th className="px-4 py-3 text-left font-semibold">Barcode</th>
                                <th className="px-4 py-3 text-left font-semibold">Medicine Name</th>
                                <th className="px-4 py-3 text-left font-semibold">Stock</th>
                                <th className="px-4 py-3 text-left font-semibold">Min</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lowStock.map((drug) => (
                                <tr key={drug.id}>
                                    <td className="px-4 py-3">
                                        {drug.image_url ? (
                                            <img src={drug.image_url} className="size-14 rounded-md border border-slate-200 object-cover" alt={drug.drug_name} />
                                        ) : (
                                            <div className="flex size-14 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-400">No img</div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{drug.barcode}</td>
                                    <td className="px-4 py-3">{drug.drug_name}</td>
                                    <td className="px-4 py-3 font-semibold text-red-700">{drug.current_stock}</td>
                                    <td className="px-4 py-3">{drug.min_stock}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>

            <RecentTransaction locationId={location?.id ?? null} />
        </PageLayout>
    )
}

export default Home
