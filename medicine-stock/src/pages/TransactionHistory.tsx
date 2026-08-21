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

// ── Parse created_by field ────────────────────────────────────────────────────
type ParsedTx = {
    user: string        // clean username
    opType: string      // Edit / Adjust / Deleted / Bag Rollback / IN / OUT
    detail: string      // reason or bag info (if any)
}

function parseCreatedBy(raw: string | null | undefined, action: string): ParsedTx {
    const s = raw ?? ''
    // [adjust: <reason>]
    const adjustMatch = s.match(/^(.+?)\s*\[adjust:\s*(.+?)\]\s*$/)
    if (adjustMatch) return { user: adjustMatch[1].trim(), opType: 'Adjust', detail: adjustMatch[2].trim() }
    // [bag-rollback: <info>]
    const rollbackMatch = s.match(/^(.+?)\s*\[bag-rollback:\s*(.+?)\]\s*$/)
    if (rollbackMatch) return { user: rollbackMatch[1].trim(), opType: 'Bag Rollback', detail: rollbackMatch[2].trim() }
    // [edit]
    const editMatch = s.match(/^(.+?)\s*\[edit\]\s*$/)
    if (editMatch) return { user: editMatch[1].trim(), opType: 'Edit', detail: '' }
    // [deleted]
    const deletedMatch = s.match(/^(.+?)\s*\[deleted?\]\s*$/)
    if (deletedMatch) return { user: deletedMatch[1].trim(), opType: 'Deleted', detail: '' }
    // plain username — use action
    return { user: s || 'system', opType: action === 'IN' ? 'IN' : 'OUT', detail: '' }
}

const OP_TYPE_STYLES: Record<string, string> = {
    'IN':           'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    'OUT':          'bg-red-50 text-red-600 ring-1 ring-red-200',
    'Edit':         'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    'Adjust':       'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    'Deleted':      'bg-red-100 text-red-700 ring-1 ring-red-300',
    'Bag Rollback': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
}

const ALL_OP_TYPES = ['ALL', 'IN', 'OUT', 'Edit', 'Adjust', 'Deleted', 'Bag Rollback'] as const
type OpTypeFilter = typeof ALL_OP_TYPES[number]

function formatDate(raw?: string | null) {
    if (!raw) return '-'
    return new Date(raw).toLocaleString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function exportXlsx(rows: StockTransaction[], nameMap: Record<string, string>, locationCode?: string) {
    const data = rows.map((r) => {
        const p = parseCreatedBy(r.created_by, r.action)
        return {
            'ID': r.id,
            'Drug Name': nameMap[r.barcode] ?? '(deleted)',
            'Barcode': r.barcode,
            'IN/OUT': r.action,
            'Type': p.opType,
            'Detail / Reason': p.detail,
            'Qty': r.qty,
            'By': p.user,
            'Date/Time': r.created_at ? new Date(r.created_at).toLocaleString('th-TH') : '',
        }
    })
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
    const [opFilter, setOpFilter] = useState<OpTypeFilter>('ALL')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 50

    useEffect(() => { void load() }, [location])

    async function load() {
        setLoading(true)

        // Fetch all pages (Supabase caps at 1000/request)
        const CHUNK = 1000
        let all: StockTransaction[] = []
        let from = 0
        while (true) {
            const q = location
                ? supabase.from('stock_transaction')
                    .select('id, barcode, qty, action, created_by, created_at, location_id')
                    .eq('location_id', location.id)
                    .order('id', { ascending: false })
                    .range(from, from + CHUNK - 1)
                : supabase.from('stock_transaction')
                    .select('id, barcode, qty, action, created_by, created_at, location_id')
                    .order('id', { ascending: false })
                    .range(from, from + CHUNK - 1)
            const { data } = await q
            const rows = (data || []) as StockTransaction[]
            all = all.concat(rows)
            if (rows.length < CHUNK) break
            from += CHUNK
        }
        setTransactions(all)

        const drugRes = location
            ? await supabase.from('drug_master').select('barcode, drug_name').eq('location_id', location.id)
            : { data: [] as { barcode: string; drug_name: string }[] }

        const map: Record<string, string> = {}
        for (const d of (drugRes.data || []) as { barcode: string; drug_name: string }[])
            map[d.barcode] = d.drug_name
        setDrugNameMap(map)
        setLoading(false)
    }

    const filtered = transactions.filter((tx) => {
        const p = parseCreatedBy(tx.created_by, tx.action)
        if (opFilter !== 'ALL' && p.opType !== opFilter) return false
        if (search) {
            const q = search.toLowerCase()
            const nameMatch = (drugNameMap[tx.barcode] ?? '').toLowerCase().includes(q)
            const barcodeMatch = tx.barcode.toLowerCase().includes(q)
            const userMatch = p.user.toLowerCase().includes(q)
            const detailMatch = p.detail.toLowerCase().includes(q)
            if (!nameMatch && !barcodeMatch && !userMatch && !detailMatch) return false
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
                {/* ── Toolbar ── */}
                <div className="mb-4 flex flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                        <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(0) }}
                            placeholder="ชื่อยา, barcode, ผู้ทำรายการ, เหตุผล" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Filter className="size-4 text-slate-400 shrink-0" />
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

                {/* ── Type filter chips ── */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                    {ALL_OP_TYPES.map((t) => (
                        <button key={t} type="button"
                            onClick={() => { setOpFilter(t); setPage(0) }}
                            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                                opFilter === t
                                    ? t === 'ALL' ? 'bg-slate-800 text-white'
                                    : `${OP_TYPE_STYLES[t]} !ring-2`
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                            }`}>
                            {t}
                        </button>
                    ))}
                </div>

                {/* ── Record count + pagination ── */}
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

                {/* ── Table ── */}
                {loading ? (
                    <div className="py-16 text-center text-sm text-slate-500">Loading...</div>
                ) : paged.length === 0 ? (
                    <EmptyState title="No transactions found" />
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold">#</th>
                                    <th className="px-4 py-3 text-left font-semibold">Drug Name</th>
                                    <th className="px-4 py-3 text-left font-semibold">Barcode</th>
                                    <th className="px-4 py-3 text-left font-semibold">IN/OUT</th>
                                    <th className="px-4 py-3 text-left font-semibold">Type</th>
                                    <th className="px-4 py-3 text-left font-semibold">Detail / Reason</th>
                                    <th className="px-4 py-3 text-right font-semibold">Qty</th>
                                    <th className="px-4 py-3 text-left font-semibold">By</th>
                                    <th className="px-4 py-3 text-left font-semibold">Date/Time</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 animate-rows">
                                {paged.map((tx) => {
                                    const drugName = drugNameMap[tx.barcode]
                                    const p = parseCreatedBy(tx.created_by, tx.action)
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-xs text-slate-400 tabular-nums">{tx.id}</td>
                                            <td className="px-4 py-3">
                                                {drugName
                                                    ? <span className="font-medium text-slate-900">{drugName}</span>
                                                    : <span className="text-xs text-slate-400 italic">deleted</span>
                                                }
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 font-mono">{tx.barcode}</td>
                                            <td className="px-4 py-3">
                                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tx.action === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                    {tx.action === 'IN' ? '▲ IN' : '▼ OUT'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${OP_TYPE_STYLES[p.opType] ?? 'bg-slate-100 text-slate-600'}`}>
                                                    {p.opType}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 max-w-[200px] truncate" title={p.detail}>
                                                {p.detail || <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-700">{tx.qty}</td>
                                            <td className="px-4 py-3">
                                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{p.user}</span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </Table>
                    </div>
                )}
            </Card>
        </PageLayout>
    )
}

export default TransactionHistory
