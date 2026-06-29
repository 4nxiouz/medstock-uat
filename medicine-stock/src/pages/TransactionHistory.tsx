import { Download, Filter } from 'lucide-react'
import { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import SearchInput from '../components/SearchInput'
import Table from '../components/Table'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { StockTransaction } from '../types'

type PageProps = { onLogout: () => void }

function formatDate(raw?: string | null) {
    if (!raw) return '-'
    return new Date(raw).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function exportXlsx(rows: StockTransaction[], nameMap: Record<string, string>, locationCode?: string) {
    const data = rows.map((r) => ({
        'ID': r.id,
        'Drug Name': nameMap[r.barcode] ?? '(deleted)',
        'Barcode': r.barcode,
        'Action': r.action,
        'Qty': r.qty,
        'By': r.created_by ?? 'system',
        'Date/Time': r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Transactions')
    XLSX.writeFile(wb, `transactions_${locationCode ?? 'export'}_${new Date().toISOString().slice(0, 10)}.xlsx`)
}

function TransactionHistory({ onLogout }: PageProps) {
    const { location } = useLocation()

    const [transactions, setTransactions] = useState<StockTransaction[]>([])
    const [drugNameMap, setDrugNameMap] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [actionFilter, setActionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 50

    useEffect(() => { void load() }, [location])

    async function load() {
        setLoading(true)

        const txPromise = supabase
            .from('stock_transaction')
            .select('id, barcode, qty, action, created_by, created_at, location_id')
            .order('id', { ascending: false })
            .limit(5000)
            .then((r) => location ? supabase
                .from('stock_transaction')
                .select('id, barcode, qty, action, created_by, created_at, location_id')
                .eq('location_id', location.id)
                .order('id', { ascending: false })
                .limit(5000) : r)

        const drugPromise = location
            ? supabase.from('drug_master').select('barcode, drug_name').eq('location_id', location.id)
            : Promise.resolve({ data: [] as { barcode: string; drug_name: string }[] })

        const [txRes, drugRes] = await Promise.all([txPromise, drugPromise])
        const { data: txData } = await txRes
        setTransactions((txData || []) as StockTransaction[])

        const map: Record<string, string> = {}
        for (const d of (drugRes.data || []) as { barcode: string; drug_name: string }[]) {
            map[d.barcode] = d.drug_name
        }
        setDrugNameMap(map)
        setLoading(false)
    }

    const filtered = transactions.filter((tx) => {
        if (actionFilter !== 'ALL' && tx.action !== actionFilter) return false
        if (search) {
            const q = search.toLowerCase()
            const nameMatch = (drugNameMap[tx.barcode] ?? '').toLowerCase().includes(q)
            const barcodeMatch = tx.barcode.toLowerCase().includes(q)
            const userMatch = (tx.created_by ?? '').toLowerCase().includes(q)
            if (!nameMatch && !barcodeMatch && !userMatch) return false
        }
        if (dateFrom && tx.created_at && new Date(tx.created_at) < new Date(dateFrom)) return false
        if (dateTo && tx.created_at && new Date(tx.created_at) > new Date(dateTo + 'T23:59:59')) return false
        return true
    })

    const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

    return (
        <PageLayout title="Transaction History" subtitle="All stock movements" onLogout={onLogout}>
            <Card className="p-5">
                <div className="mb-5 flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }} placeholder="Search drug name, barcode or user" />
                    </div>
                    <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                        {(['ALL', 'IN', 'OUT'] as const).map((a) => (
                            <button key={a} type="button" onClick={() => { setActionFilter(a); setPage(0) }}
                                className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${actionFilter === a ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
                                {a}
                            </button>
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="size-4 text-slate-400" />
                        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(0) }}
                            className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-500" />
                        <span className="text-slate-400">—</span>
                        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(0) }}
                            className="h-9 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-500" />
                    </div>
                    <button type="button" onClick={() => exportXlsx(filtered, drugNameMap, location?.code)}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                        <Download className="size-4" />Export Excel
                    </button>
                </div>

                <div className="mb-3 flex items-center justify-between text-sm text-slate-500">
                    <span>{filtered.length.toLocaleString()} records</span>
                    {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                                className="rounded-md border border-slate-200 px-3 py-1 text-xs disabled:opacity-40">← Prev</button>
                            <span className="text-xs">{page + 1} / {totalPages}</span>
                            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
                                className="rounded-md border border-slate-200 px-3 py-1 text-xs disabled:opacity-40">Next →</button>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="py-16 text-center text-sm text-slate-500">Loading...</div>
                ) : paged.length === 0 ? (
                    <EmptyState title="No transactions found" />
                ) : (
                    <Table>
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">#</th>
                                <th className="px-4 py-3 text-left font-semibold">Drug Name</th>
                                <th className="px-4 py-3 text-left font-semibold">Barcode</th>
                                <th className="px-4 py-3 text-left font-semibold">Action</th>
                                <th className="px-4 py-3 text-left font-semibold">Qty</th>
                                <th className="px-4 py-3 text-left font-semibold">By</th>
                                <th className="px-4 py-3 text-left font-semibold">Date/Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {paged.map((tx) => {
                                const drugName = drugNameMap[tx.barcode]
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 text-xs text-slate-400">{tx.id}</td>
                                        <td className="px-4 py-3">
                                            {drugName
                                                ? <span className="font-medium text-slate-900">{drugName}</span>
                                                : <span className="text-xs text-slate-400 italic">deleted</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{tx.barcode}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tx.action === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                {tx.action === 'IN' ? '▲ IN' : '▼ OUT'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 tabular-nums text-slate-700">{tx.qty}</td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{tx.created_by || 'system'}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500">{formatDate(tx.created_at)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                )}
            </Card>
        </PageLayout>
    )
}

export default TransactionHistory
