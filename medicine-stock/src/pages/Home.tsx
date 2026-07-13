import { AlertTriangle, Boxes, Package, TrendingDown, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
    Bar,
    BarChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import RecentTransaction from '../components/RecentTransaction'
import StatCard from '../components/StatCard'
import Table from '../components/Table'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug, StockTransaction } from '../types'

type PageProps = { onLogout: () => void }
type DayBar = { label: string; inn: number; out: number }

function getLast7Days(): string[] {
    return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (6 - i))
        return d.toISOString().slice(0, 10)
    })
}

function Home({ onLogout }: PageProps) {
    const { location } = useLocation()
    const [totalDrug, setTotalDrug] = useState(0)
    const [totalStock, setTotalStock] = useState(0)
    const [totalIn, setTotalIn] = useState(0)
    const [totalOut, setTotalOut] = useState(0)
    const [lowStock, setLowStock] = useState<Drug[]>([])
    const [chart, setChart] = useState<DayBar[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!location) return
        void loadDashboard()
    }, [location])

    async function loadDashboard() {
        setLoading(true)
        const [drugRes, txRes] = await Promise.all([
            supabase.from('drug_master')
                .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan')
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
        setTotalIn(txs.filter((t) => t.action === 'IN').reduce((s, t) => s + Number(t.qty), 0))
        setTotalOut(txs.filter((t) => t.action === 'OUT').reduce((s, t) => s + Number(t.qty), 0))

        const days = getLast7Days()
        setChart(days.map((day) => {
            const dayTxs = txs.filter((t) => t.created_at?.slice(0, 10) === day)
            return {
                label: new Date(day + 'T00:00:00').toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' }),
                inn: dayTxs.filter((t) => t.action === 'IN').reduce((s, t) => s + Number(t.qty), 0),
                out: dayTxs.filter((t) => t.action === 'OUT').reduce((s, t) => s + Number(t.qty), 0),
            }
        }))
        setLoading(false)
    }

    const hasActivity = chart.some((d) => d.inn > 0 || d.out > 0)

    return (
        <PageLayout title="Dashboard" subtitle="Stock overview" onLogout={onLogout}>

            {/* Stat cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Items" value={totalDrug} tone="blue" icon={Package} subtitle="รายการยาทั้งหมด" />
                <StatCard title="Total Stock" value={totalStock} tone="green" icon={Boxes} subtitle="หน่วยรวมในคลัง" />
                <StatCard title="รับเข้า 7 วัน" value={totalIn} tone="amber" icon={TrendingUp} subtitle="หน่วยที่รับเข้า" />
                <StatCard title="Low Stock" value={lowStock.length} tone="red" icon={AlertTriangle} subtitle="รายการที่ต่ำกว่า min" />
            </div>

            {/* Chart */}
            <Card className="mt-5 p-5">
                <div className="mb-5 flex items-center justify-between">
                    <div>
                        <h2 className="font-bold text-slate-900">Stock Movement</h2>
                        <p className="mt-0.5 text-xs text-slate-400">7 วันล่าสุด</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block size-3 rounded-sm bg-emerald-400" />
                            <span className="font-medium text-emerald-600">IN {totalIn}</span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block size-3 rounded-sm bg-red-400" />
                            <span className="font-medium text-red-500">OUT {totalOut}</span>
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="flex h-48 items-center justify-center">
                        <div className="flex gap-1.5">
                            {[0,1,2].map((i) => (
                                <div key={i} className="size-2.5 rounded-full bg-teal-300 animate-bounce"
                                    style={{ animationDelay: `${i * 0.15}s` }} />
                            ))}
                        </div>
                    </div>
                ) : !hasActivity ? (
                    <div className="flex h-48 items-center justify-center text-sm text-slate-400">
                        ยังไม่มี activity ใน 7 วันที่ผ่านมา
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={chart} barGap={4} barCategoryGap="30%">
                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                            <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={30} />
                            <Tooltip
                                cursor={{ fill: '#f8fafc', radius: 6 }}
                                contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                                formatter={(value, name) => [Number(value), name === 'inn' ? 'รับเข้า' : 'จ่ายออก']}
                            />
                            <Bar dataKey="inn" fill="#34d399" radius={[6, 6, 0, 0]} name="inn" />
                            <Bar dataKey="out" fill="#f87171" radius={[6, 6, 0, 0]} name="out" />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </Card>

            {/* Low stock */}
            <Card className="mt-5 overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                    <div className="flex items-center gap-2">
                        <TrendingDown className="size-4 text-red-500" />
                        <h2 className="font-bold text-slate-900">Low Stock Alert</h2>
                    </div>
                    <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
                        stock ≤ minimum
                    </span>
                </div>

                {lowStock.length === 0 ? (
                    <div className="p-5">
                        <EmptyState title="All items well stocked" description="Nothing is below minimum stock." />
                    </div>
                ) : (
                    <Table>
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-5 py-3 text-left font-semibold">ยา</th>
                                <th className="px-5 py-3 text-left font-semibold">Barcode</th>
                                <th className="px-5 py-3 text-right font-semibold">Stock</th>
                                <th className="px-5 py-3 text-right font-semibold">Min</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {lowStock.map((drug) => (
                                <tr key={drug.id} className="hover:bg-red-50/40 transition-colors">
                                    <td className="px-5 py-3 font-medium text-slate-900">{drug.drug_name}</td>
                                    <td className="px-5 py-3 text-sm text-slate-400">{drug.barcode}</td>
                                    <td className="px-5 py-3 text-right">
                                        {drug.current_stock === 0
                                            ? <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">OUT</span>
                                            : <span className="font-bold text-red-600">{drug.current_stock}</span>
                                        }
                                    </td>
                                    <td className="px-5 py-3 text-right text-sm text-slate-400">{drug.min_stock}</td>
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
