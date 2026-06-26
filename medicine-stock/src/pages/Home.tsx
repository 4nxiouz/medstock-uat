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
import type { Drug, StockTransaction } from '../types'

type PageProps = { onLogout: () => void; onSwitchLocation: () => void }
type DayBar = { label: string; inn: number; out: number }

function getLast7Days(): string[] {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return d.toISOString().slice(0, 10)
    })
}

function Home({ onLogout, onSwitchLocation }: PageProps) {
    const { location } = useLocation()
    const [totalDrug, setTotalDrug] = useState(0)
    const [totalStock, setTotalStock] = useState(0)
    const [lowStock, setLowStock] = useState<Drug[]>([])
    const [chart, setChart] = useState<DayBar[]>([])

    useEffect(() => {
        if (!location) return

        async function loadDashboard() {
            const [drugRes, txRes] = await Promise.all([
                supabase.from('drug_master')
                    .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
                    .eq('location_id', location!.id).order('drug_name'),
                supabase.from('stock_transaction')
                    .select('qty, action, created_at')
                    .eq('location_id', location!.id)
                    .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
            ])

            if (!drugRes.error) {
                const drugs = (drugRes.data || []) as Drug[]
                setTotalDrug(drugs.length)
                setTotalStock(drugs.reduce((s, d) => s + Number(d.current_stock || 0), 0))
                setLowStock(drugs.filter((d) => Number(d.current_stock) <= Number(d.min_stock)))
            }

            const txs = (txRes.data || []) as StockTransaction[]
            const days = getLast7Days()
            setChart(days.map((day) => {
                const dayTxs = txs.filter((t) => t.created_at?.slice(0, 10) === day)
                return {
                    label: new Date(day).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }),
                    inn: dayTxs.filter((t) => t.action === 'IN').reduce((s, t) => s + Number(t.qty), 0),
                    out: dayTxs.filter((t) => t.action === 'OUT').reduce((s, t) => s + Number(t.qty), 0),
                }
            }))
        }

        void loadDashboard()
    }, [location])

    const chartMax = Math.max(1, ...chart.map((d) => Math.max(d.inn, d.out)))

    return (
        <PageLayout title="Dashboard" subtitle={`Stock overview — ${location?.name ?? '—'}`} onLogout={onLogout} onSwitchLocation={onSwitchLocation}>
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Items" value={totalDrug} tone="blue" icon={Package} />
                <StatCard title="Total Stock" value={totalStock} tone="green" icon={Boxes} />
                <StatCard title="Low Stock" value={lowStock.length} tone="red" icon={AlertTriangle} />
            </div>

            {/* Activity chart */}
            <Card className="mt-5 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-bold text-slate-900">Stock Movement — Last 7 Days</h2>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-emerald-400" />IN</span>
                        <span className="flex items-center gap-1.5"><span className="inline-block size-2.5 rounded-sm bg-red-400" />OUT</span>
                    </div>
                </div>
                {chart.every((d) => d.inn === 0 && d.out === 0) ? (
                    <div className="py-8 text-center text-sm text-slate-400">No activity in the last 7 days</div>
                ) : (
                    <div className="flex items-end justify-between gap-1 h-32">
                        {chart.map((day) => (
                            <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
                                <div className="flex w-full items-end justify-center gap-0.5" style={{ height: '96px' }}>
                                    <div className="w-2.5 rounded-t bg-emerald-400 transition-all"
                                        style={{ height: `${(day.inn / chartMax) * 96}px`, minHeight: day.inn > 0 ? '3px' : '0' }} />
                                    <div className="w-2.5 rounded-t bg-red-400 transition-all"
                                        style={{ height: `${(day.out / chartMax) * 96}px`, minHeight: day.out > 0 ? '3px' : '0' }} />
                                </div>
                                <span className="text-[10px] text-slate-400">{day.label}</span>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            {/* Low stock table */}
            <Card className="mt-5 p-5">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900">Low Stock Alert</h2>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">stock ≤ minimum</span>
                </div>

                {lowStock.length === 0 ? (
                    <EmptyState title="All items well stocked" description="Nothing is below minimum stock." />
                ) : (
                    <Table>
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Item</th>
                                <th className="px-4 py-3 text-left font-semibold">Barcode</th>
                                <th className="px-4 py-3 text-left font-semibold">Stock</th>
                                <th className="px-4 py-3 text-left font-semibold">Min</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lowStock.map((drug) => (
                                <tr key={drug.id}>
                                    <td className="px-4 py-3 font-medium text-slate-900">{drug.drug_name}</td>
                                    <td className="px-4 py-3 text-sm text-slate-500">{drug.barcode}</td>
                                    <td className="px-4 py-3 font-bold text-red-700">{drug.current_stock === 0 ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs">OUT</span> : drug.current_stock}</td>
                                    <td className="px-4 py-3 text-slate-500">{drug.min_stock}</td>
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
