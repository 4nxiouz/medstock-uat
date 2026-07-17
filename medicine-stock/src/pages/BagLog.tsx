import * as XLSX from 'xlsx'
import {
    Backpack, ChevronLeft, ClipboardList,
    Download, Edit2, Package, Printer, PlusCircle, Trash2, X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import { canAccessBagLogEdit, canAccessBagLogLog, getCreatedBy } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { BagDispatch, BagDispatchDrug, BagUsageLog, EmkEquipmentCheck } from '../types'

type PageProps = { onLogout: () => void }
type BagFilter = 'ALL' | 'FAK' | 'EMK'
type LogFilter = 'ALL' | 'done' | 'pending'
type ModalTab = 'drugs' | 'edit' | 'log'

function fmt(d: string | null | undefined) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Stat chip ───────────────────────────────────────────────────────────────
function StatChip({ label, value, color }: { label: string; value: number; color: string }) {
    return (
        <div className={`flex items-center gap-2.5 rounded-xl border px-4 py-2.5 ${color}`}>
            <span className="text-xl font-bold tabular-nums leading-none">{value}</span>
            <span className="text-xs font-medium opacity-70 leading-tight">{label}</span>
        </div>
    )
}

// ─── Type badge ──────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
    const cls = type === 'FAK'
        ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-200'
        : 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
    return (
        <span className={`inline-flex h-6 items-center rounded-md px-2 text-[11px] font-bold tracking-wide ${cls}`}>
            {type}
        </span>
    )
}

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
    const cls = status === 'CLOSE'
        ? 'bg-slate-100 text-slate-500'
        : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
    return (
        <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold ${cls}`}>
            {status}
        </span>
    )
}

// ─── Log indicator ───────────────────────────────────────────────────────────
function LogIndicator({ count }: { count: number }) {
    if (count > 0) {
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
                <span className="size-1.5 rounded-full bg-emerald-500 inline-block" />
                {count} log{count > 1 ? 's' : ''}
            </span>
        )
    }
    return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            <span className="size-1.5 rounded-full bg-amber-400 inline-block" />
            No log
        </span>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────
function BagLog({ onLogout }: PageProps) {
    const [bagFilter, setBagFilter] = useState<BagFilter>('ALL')
    const [logFilter, setLogFilter] = useState<LogFilter>('ALL')
    const [bags, setBags] = useState<BagDispatch[]>([])
    const [logCounts, setLogCounts] = useState<Record<number, number>>({})
    const [loading, setLoading] = useState(true)
    const [selectedBag, setSelectedBag] = useState<BagDispatch | null>(null)
    const [modalTab, setModalTab] = useState<ModalTab>('drugs')
    const [dateFrom, setDateFrom] = useState('')
    const [dateTo, setDateTo] = useState('')
    const [searchEqSerial, setSearchEqSerial] = useState('')
    const [exporting, setExporting] = useState(false)

    const canEdit = canAccessBagLogEdit()
    const canLog = canAccessBagLogLog()

    useEffect(() => { void loadBags() }, [])

    async function loadBags() {
        setLoading(true)
        const [bagsRes, logsRes] = await Promise.all([
            supabase.from('bag_dispatch').select('*').order('created_at', { ascending: false }),
            supabase.from('bag_usage_log').select('dispatch_id'),
        ])
        setBags((bagsRes.data || []) as BagDispatch[])
        const counts: Record<number, number> = {}
        for (const row of (logsRes.data || []) as { dispatch_id: number }[])
            counts[row.dispatch_id] = (counts[row.dispatch_id] ?? 0) + 1
        setLogCounts(counts)
        setLoading(false)
    }

    const dateBased = bags.filter((b) => {
        if (!dateFrom && !dateTo) return true
        const day = (b.date_in ?? '').slice(0, 10)
        if (!day) return false
        if (dateFrom && day < dateFrom) return false
        if (dateTo && day > dateTo) return false
        return true
    })

    const filtered = dateBased
        .filter((b) => bagFilter === 'ALL' || b.bag_type === bagFilter)
        .filter((b) => {
            if (logFilter === 'ALL') return true
            const has = (logCounts[b.id] ?? 0) > 0
            return logFilter === 'done' ? has : !has
        })
        .filter((b) => {
            if (!searchEqSerial.trim()) return true
            const q = searchEqSerial.trim().toLowerCase()
            return (b.equipment_no ?? '').toLowerCase().includes(q) || (b.serial_no ?? '').toLowerCase().includes(q)
        })

    const fakCount = dateBased.filter((b) => b.bag_type === 'FAK').length
    const emkCount = dateBased.filter((b) => b.bag_type === 'EMK').length
    const pendingCount = dateBased.filter((b) => (logCounts[b.id] ?? 0) === 0).length

    function openBag(bag: BagDispatch) {
        setSelectedBag(bag)
        setModalTab('drugs')
    }

    function closeModal(dirty = false) {
        setSelectedBag(null)
        if (dirty) void loadBags()
    }

    async function handleExport() {
        if (!dateFrom || !dateTo) return
        setExporting(true)
        const [bagsRes, drugsRes, logsRes] = await Promise.all([
            supabase.from('bag_dispatch').select('*').gte('date_in', dateFrom).lte('date_in', dateTo).order('date_in'),
            supabase.from('bag_dispatch_drug').select('*'),
            supabase.from('bag_usage_log').select('*').order('dispatch_id').order('created_at'),
        ])
        const allBags = (bagsRes.data || []) as BagDispatch[]
        const allDrugs = (drugsRes.data || []) as BagDispatchDrug[]
        const allLogs = (logsRes.data || []) as BagUsageLog[]
        const bagIds = new Set(allBags.map((b) => b.id))
        const relevantDrugs = allDrugs.filter((d) => bagIds.has(d.dispatch_id))
        const drugNames = Array.from(new Set(relevantDrugs.map((d) => d.drug_name)))
        const rows: Record<string, unknown>[] = []
        for (const bag of allBags) {
            const bagDrugs = allDrugs.filter((d) => d.dispatch_id === bag.id)
            const bagLogs = allLogs.filter((l) => l.dispatch_id === bag.id)
            const durationDays = bag.date_in && bag.date_out
                ? Math.abs(Math.round((new Date(bag.date_in).getTime() - new Date(bag.date_out).getTime()) / 86400000))
                : ''
            const row: Record<string, unknown> = {
                'Order No.': bag.order_no ?? '',
                'S/N': bag.serial_no,
                'EQ No.': bag.equipment_no,
                'Seal No.': bag.seal_number ?? '',
                'Type': bag.type ?? '',
                'Status': bag.status,
                '1st Cause': bag.cause_1 ?? '',
                '2nd Cause': bag.cause_2 ?? '',
                'Bag Remark': bag.remark ?? '',
            }
            for (const name of drugNames) {
                const found = bagDrugs.find((d) => d.drug_name === name)
                row[name] = found ? found.qty : ''
            }
            row['Check In'] = bag.date_in ? fmt(bag.date_in) : ''
            row['Check Out'] = bag.date_out ? fmt(bag.date_out) : ''
            row['Duration (Days)'] = durationDays
            const latestLog = bagLogs[bagLogs.length - 1]
            row['Opened Date'] = latestLog?.opened_date ?? ''
            row['Person'] = latestLog?.person ?? ''
            row['Illness'] = latestLog?.illness ?? ''
            row['Used Item'] = latestLog?.used_item ?? ''
            row['FLT.No.'] = latestLog?.flt_no ?? ''
            row['Log Seal No.'] = latestLog?.seal_no ?? ''
            row['Remark'] = latestLog?.remark ?? ''
            rows.push(row)
        }
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Bag Log')
        XLSX.writeFile(wb, `BagLog_${dateFrom}_${dateTo}.xlsx`)
        setExporting(false)
    }

    return (
        <PageLayout title="Bag Log" subtitle="บันทึกการจ่ายยาเข้ากระเป๋า FAK / EMK" onLogout={onLogout}>

            {/* ── Stats strip ── */}
            <div className="mb-5 flex flex-wrap gap-2">
                <StatChip label="Total bags" value={dateBased.length} color="bg-white border-slate-200 text-slate-800" />
                <StatChip label="FAK" value={fakCount} color="bg-blue-50 border-blue-200 text-blue-800" />
                <StatChip label="EMK" value={emkCount} color="bg-violet-50 border-violet-200 text-violet-800" />
                <StatChip label="Reported" value={dateBased.length - pendingCount} color="bg-emerald-50 border-emerald-200 text-emerald-800" />
                <StatChip label="Unreported" value={pendingCount} color="bg-amber-50 border-amber-200 text-amber-800" />
            </div>

            {/* ── Toolbar ── */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                {/* Bag type */}
                <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                    {(['ALL', 'FAK', 'EMK'] as BagFilter[]).map((f) => (
                        <button key={f} type="button" onClick={() => setBagFilter(f)}
                            className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all ${bagFilter === f ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                            {f === 'ALL' ? 'All types' : f}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                {/* Log status */}
                <div className="flex gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5">
                    <button type="button" onClick={() => setLogFilter('ALL')}
                        className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all ${logFilter === 'ALL' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        All status
                    </button>
                    <button type="button" onClick={() => setLogFilter('done')}
                        className={`rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all ${logFilter === 'done' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        Reported
                    </button>
                    <button type="button" onClick={() => setLogFilter('pending')}
                        className={`flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-sm font-semibold transition-all ${logFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                        Unreported
                        {pendingCount > 0 && (
                            <span className={`rounded-full px-1.5 py-px text-[10px] font-bold ${logFilter === 'pending' ? 'bg-white/25 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                {/* Date filter */}
                <div className="flex items-center gap-1.5">
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none focus:border-teal-500" />
                    <span className="text-slate-400 text-sm">→</span>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                        className="h-8 rounded-lg border border-slate-300 bg-white px-2.5 text-sm outline-none focus:border-teal-500" />
                    {(dateFrom || dateTo) && (
                        <button type="button" onClick={() => { setDateFrom(''); setDateTo('') }}
                            className="h-8 px-2 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 text-sm">✕</button>
                    )}
                </div>

                {/* Divider */}
                <div className="h-6 w-px bg-slate-200 hidden sm:block" />

                {/* EQ / Serial search */}
                <div className="relative">
                    <input
                        type="text"
                        value={searchEqSerial}
                        onChange={(e) => setSearchEqSerial(e.target.value)}
                        placeholder="ค้นหา EQ / S/N…"
                        className="h-8 w-44 rounded-lg border border-slate-300 bg-white pl-3 pr-7 text-sm outline-none focus:border-teal-500"
                    />
                    {searchEqSerial && (
                        <button type="button" onClick={() => setSearchEqSerial('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            <X className="size-3.5" />
                        </button>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Export — uses same date range */}
                <button type="button" onClick={() => void handleExport()}
                    disabled={!dateFrom || !dateTo || exporting}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-teal-700 px-3.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300 transition-colors">
                    <Download className="size-3.5" />
                    {exporting ? 'Exporting…' : 'Export Excel'}
                </button>
            </div>

            {/* ── Table ── */}
            {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-400">
                    <Package className="size-8 animate-pulse" />
                    <span className="text-sm">Loading bags…</span>
                </div>
            ) : filtered.length === 0 ? (
                <EmptyState title="No records found" />
            ) : (
                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    {/* Table head */}
                    <div className="hidden md:grid md:grid-cols-[88px_1fr_110px_72px_100px_100px_110px_44px] gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
                        {['Type', 'S/N — EQ', 'Order No', 'Status', 'In Date', 'Out Date', 'Log', ''].map((h, i) => (
                            <div key={i} className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">{h}</div>
                        ))}
                    </div>

                    {/* Rows */}
                    <div className="divide-y divide-slate-100 animate-rows">
                        {filtered.map((bag) => (
                            <button key={bag.id} type="button" onClick={() => openBag(bag)}
                                className="w-full text-left px-4 py-3.5 transition-colors hover:bg-slate-50 active:bg-slate-100 md:grid md:grid-cols-[88px_1fr_110px_72px_100px_100px_110px_44px] md:items-center gap-2 group">

                                {/* Mobile header */}
                                <div className="flex items-center justify-between mb-2 md:mb-0 md:contents">
                                    <div className="md:hidden flex items-center gap-2">
                                        <TypeBadge type={bag.bag_type} />
                                        <span className="font-semibold text-slate-900 text-sm">{bag.serial_no}</span>
                                    </div>
                                    <div className="md:hidden">
                                        <LogIndicator count={logCounts[bag.id] ?? 0} />
                                    </div>
                                </div>

                                {/* Desktop: Type */}
                                <div className="hidden md:block">
                                    <TypeBadge type={bag.bag_type} />
                                </div>

                                {/* S/N + EQ */}
                                <div>
                                    <div className="font-semibold text-slate-900 text-sm hidden md:block">{bag.serial_no}</div>
                                    <div className="text-xs text-slate-400 tabular-nums">EQ: {bag.equipment_no}</div>
                                    {/* Mobile extra */}
                                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 md:hidden text-xs text-slate-500">
                                        <span>{bag.order_no || '—'}</span>
                                        <span>{fmt(bag.date_in)} → {fmt(bag.date_out)}</span>
                                    </div>
                                </div>

                                {/* Order No */}
                                <div className="text-xs text-slate-500 hidden md:block tabular-nums">{bag.order_no || '—'}</div>

                                {/* Status */}
                                <div className="hidden md:block">
                                    <StatusPill status={bag.status} />
                                </div>

                                {/* In Date */}
                                <div className="text-xs text-slate-600 hidden md:block tabular-nums">{fmt(bag.date_in)}</div>

                                {/* Out Date */}
                                <div className="text-xs text-slate-600 hidden md:block tabular-nums">{fmt(bag.date_out)}</div>

                                {/* Log */}
                                <div className="hidden md:block">
                                    <LogIndicator count={logCounts[bag.id] ?? 0} />
                                </div>

                                {/* Arrow */}
                                <div className="hidden md:flex items-center justify-end text-slate-300 group-hover:text-teal-500 transition-colors text-base">›</div>
                            </button>
                        ))}
                    </div>

                    {/* Footer count */}
                    <div className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-400 tabular-nums">
                        Showing {filtered.length} of {bags.length} bags
                    </div>
                </div>
            )}

            {selectedBag && (
                <BagDetailModal
                    bag={selectedBag}
                    tab={modalTab}
                    setTab={setModalTab}
                    canEdit={canEdit}
                    canLog={canLog}
                    onClose={closeModal}
                    onBagUpdated={(updated) => setSelectedBag(updated)}
                />
            )}
        </PageLayout>
    )
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────
function BagDetailModal({
    bag, tab, setTab, canEdit, canLog, onClose, onBagUpdated,
}: {
    bag: BagDispatch; tab: ModalTab; setTab: (t: ModalTab) => void
    canEdit: boolean; canLog: boolean
    onClose: (dirty?: boolean) => void
    onBagUpdated: (b: BagDispatch) => void
}) {
    const [drugs, setDrugs] = useState<BagDispatchDrug[]>([])
    const [logs, setLogs] = useState<BagUsageLog[]>([])
    const [eqChecks, setEqChecks] = useState<EmkEquipmentCheck[]>([])
    const [drugsLoaded, setDrugsLoaded] = useState(false)
    const [logsLoaded, setLogsLoaded] = useState(false)
    const [editForm, setEditForm] = useState({
        order_no: bag.order_no ?? '', serial_no: bag.serial_no,
        equipment_no: bag.equipment_no, seal_number: bag.seal_number ?? '',
        type: bag.type ?? '', status: bag.status,
        cause_1: bag.cause_1 ?? '', cause_2: bag.cause_2 ?? '',
        date_in: bag.date_in ?? '', date_out: bag.date_out ?? '',
        expiry_date: bag.expiry_date ?? '',
        repacked_by: bag.repacked_by ?? '',
        checked_by: bag.checked_by ?? '',
        remark: bag.remark ?? '',
    })
    const [editMsg, setEditMsg] = useState('')
    const [deleting, setDeleting] = useState(false)
    const [logForm, setLogForm] = useState({ opened_date: '', person: '', illness: '', used_item: '', flt_no: '', seal_no: '', remark: '' })
    const [logMsg, setLogMsg] = useState('')

    useEffect(() => { void loadDrugs() }, [])
    useEffect(() => { if (tab === 'log' && !logsLoaded) void loadLogs() }, [tab])

    async function handlePrint() {
        const [drugsRes, logsRes, eqRes] = await Promise.all([
            supabase.from('bag_dispatch_drug').select('*').eq('dispatch_id', bag.id),
            supabase.from('bag_usage_log').select('*').eq('dispatch_id', bag.id).order('created_at'),
            bag.bag_type === 'EMK'
                ? supabase.from('emk_equipment_check').select('*').eq('dispatch_id', bag.id).order('sort_order')
                : Promise.resolve({ data: [] }),
        ])
        const allDrugs = (drugsRes.data || []) as BagDispatchDrug[]
        const allLogs = (logsRes.data || []) as BagUsageLog[]
        const allEq = (eqRes.data || []) as EmkEquipmentCheck[]

        const drugRows = allDrugs.map((d) =>
            `<tr><td>${d.drug_name}</td><td>${d.barcode ?? ''}</td><td style="text-align:center">${d.qty}</td></tr>`
        ).join('')

        const eqRows = allEq.map((eq) =>
            `<tr><td>${eq.item_name}</td><td style="text-align:center">${eq.checked ? '✓' : '○'}</td><td>${eq.remark ?? ''}</td></tr>`
        ).join('')

        const logRows = allLogs.map((l, i) => `
            <tr>
                <td style="text-align:center">${i + 1}</td>
                <td>${l.opened_date ? new Date(l.opened_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''}</td>
                <td>${l.person ?? ''}</td>
                <td>${l.illness ?? ''}</td>
                <td>${l.used_item ?? ''}</td>
                <td>${l.flt_no ?? ''}</td>
                <td>${l.seal_no ?? ''}</td>
                <td>${l.remark ?? ''}</td>
            </tr>`
        ).join('')

        const eqSection = bag.bag_type === 'EMK' && allEq.length > 0 ? `
  <h2>EMK Equipment Checklist (${allEq.filter(e => e.checked).length}/${allEq.length} checked)</h2>
  <table style="font-size:9.5pt">
    <thead><tr><th>Equipment</th><th style="width:60px;text-align:center">Checked</th><th>Remark</th></tr></thead>
    <tbody>${eqRows}</tbody>
  </table>` : ''

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title> </title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Sarabun', sans-serif; font-size: 11pt; margin: 0; padding: 20mm 15mm; color: #111; }
  h1 { font-size: 16pt; margin: 0 0 2mm; }
  .subtitle { font-size: 10pt; color: #555; margin-bottom: 6mm; }
  .meta-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm 4mm; margin-bottom: 6mm; border: 1px solid #ccc; padding: 4mm; border-radius: 3mm; }
  .meta-item label { display: block; font-size: 8pt; color: #888; text-transform: uppercase; letter-spacing: .04em; }
  .meta-item span { font-weight: 700; font-size: 11pt; }
  h2 { font-size: 11pt; border-bottom: 1.5px solid #0f766e; color: #0f766e; padding-bottom: 1mm; margin: 5mm 0 2mm; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  th { background: #f1f5f9; text-align: left; padding: 2mm 3mm; font-size: 9pt; }
  td { padding: 2mm 3mm; border-bottom: 1px solid #eee; vertical-align: top; }
  .badge { display:inline-block; padding: 0.5mm 2mm; border-radius:2mm; font-size:9pt; font-weight:700; }
  .open { background:#d1fae5; color:#065f46; }
  .close { background:#f1f5f9; color:#475569; }
  .footer { margin-top: 10mm; font-size: 9pt; color: #aaa; text-align: right; }
  @media print { @page { size: A4; margin: 15mm; } body { padding: 0; } }
</style>
</head><body>
  <h1>Bag Report — ${bag.bag_type} · ${bag.serial_no}</h1>
  <div class="meta-grid">
    <div class="meta-item"><label>Type</label><span>${bag.bag_type}</span></div>
    <div class="meta-item"><label>Order No</label><span>${bag.order_no ?? '—'}</span></div>
    <div class="meta-item"><label>S/N</label><span>${bag.serial_no}</span></div>
    <div class="meta-item"><label>EQ</label><span>${bag.equipment_no}</span></div>
    <div class="meta-item"><label>Seal No</label><span>${bag.seal_number ?? '—'}</span></div>
    <div class="meta-item"><label>Status</label><span class="badge ${bag.status === 'OPEN' ? 'open' : 'close'}">${bag.status}</span></div>
    ${bag.cause_1 ? `<div class="meta-item"><label>1st Cause</label><span>${bag.cause_1}</span></div>` : ''}
    ${bag.cause_2 ? `<div class="meta-item"><label>2nd Cause</label><span>${bag.cause_2}</span></div>` : ''}
    <div class="meta-item"><label>Received Date</label><span>${bag.date_in ? new Date(bag.date_in).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span></div>
    <div class="meta-item"><label>Released Date</label><span>${bag.date_out ? new Date(bag.date_out).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</span></div>
    ${bag.expiry_date ? `<div class="meta-item"><label>Expiry Date</label><span>${new Date(bag.expiry_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></div>` : ''}
    ${bag.repacked_by ? `<div class="meta-item"><label>Repacked By</label><span>${bag.repacked_by}</span></div>` : ''}
    ${bag.checked_by ? `<div class="meta-item"><label>Checked By</label><span>${bag.checked_by}</span></div>` : ''}
    ${bag.remark ? `<div class="meta-item" style="grid-column:1/-1"><label>Remark</label><span>${bag.remark}</span></div>` : ''}
  </div>

  ${eqSection}

  <h2>Material Name (${allDrugs.length} Items)</h2>
  <table>
    <thead><tr><th>Description</th><th>Barcode</th><th style="text-align:center">QTY</th></tr></thead>
    <tbody>${drugRows || '<tr><td colspan="3" style="color:#aaa">No Record</td></tr>'}</tbody>
  </table>

  <h2>Incident Report</h2>
  <table style="font-size:9pt">
    <thead><tr><th>#</th><th>Opened Date</th><th>Person</th><th>Illness</th><th>Used Item</th><th>FLT.No.</th><th>Seal No.</th><th>Remark</th></tr></thead>
    <tbody>${logRows || '<tr><td colspan="8" style="color:#aaa">No Record</td></tr>'}</tbody>
  </table>

  <div class="footer">MedStock · ID #${bag.id}</div>
<script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; }<\/script>
</body></html>`

        const win = window.open('', '_blank', 'width=900,height=700')
        if (!win) return
        win.document.write(html)
        win.document.close()
    }

    async function loadDrugs() {
        const [drugsRes, eqRes] = await Promise.all([
            supabase.from('bag_dispatch_drug').select('*').eq('dispatch_id', bag.id),
            bag.bag_type === 'EMK'
                ? supabase.from('emk_equipment_check').select('*').eq('dispatch_id', bag.id).order('sort_order')
                : Promise.resolve({ data: [] }),
        ])
        setDrugs((drugsRes.data || []) as BagDispatchDrug[])
        setEqChecks((eqRes.data || []) as EmkEquipmentCheck[])
        setDrugsLoaded(true)
    }

    async function loadLogs() {
        const { data } = await supabase.from('bag_usage_log').select('*').eq('dispatch_id', bag.id).order('created_at', { ascending: false })
        setLogs((data || []) as BagUsageLog[])
        setLogsLoaded(true)
    }

    async function handleSaveEdit() {
        setEditMsg('')
        if (!editForm.serial_no.trim() || !editForm.equipment_no.trim()) {
            setEditMsg('S/N and EQ are required')
            return
        }
        const { data, error } = await supabase.from('bag_dispatch')
            .update({
                order_no: editForm.order_no.trim() || null,
                serial_no: editForm.serial_no.trim(),
                equipment_no: editForm.equipment_no.trim(),
                seal_number: editForm.seal_number.trim() || null,
                type: editForm.type.trim() || null,
                status: editForm.status,
                cause_1: editForm.cause_1 || null,
                cause_2: editForm.cause_2.trim() || null,
                date_in: editForm.date_in || null,
                date_out: editForm.date_out || null,
                expiry_date: editForm.expiry_date || null,
                repacked_by: editForm.repacked_by.trim() || null,
                checked_by: editForm.checked_by.trim() || null,
                remark: editForm.remark.trim() || null,
            })
            .eq('id', bag.id).select('*').single()
        if (error) { setEditMsg('Save failed: ' + error.message); return }
        onBagUpdated(data as BagDispatch)
        setEditMsg('✓ Saved successfully')
        onClose(true)
    }

    async function handleDeleteBag() {
        if (!window.confirm(`ลบ ${bag.bag_type} S/N ${bag.serial_no}?\n\nสต็อกยาทั้งหมดจะถูกคืนกลับเข้าระบบ`)) return
        setDeleting(true)
        // Load drugs in bag to rollback stock
        const { data: bagDrugs } = await supabase
            .from('bag_dispatch_drug').select('*').eq('dispatch_id', bag.id)
        const items = (bagDrugs || []) as BagDispatchDrug[]

        // Rollback stock for each drug
        for (const item of items) {
            const { data: live } = await supabase
                .from('drug_master').select('id, current_stock').eq('barcode', item.barcode).maybeSingle()
            if (live) {
                await supabase.from('drug_master')
                    .update({ current_stock: Number(live.current_stock) + Number(item.qty) })
                    .eq('id', (live as { id: number; current_stock: number }).id)
                await supabase.from('stock_transaction').insert([{
                    barcode: item.barcode,
                    qty: item.qty,
                    action: 'IN',
                    created_by: getCreatedBy() + ` [bag-rollback: ${bag.bag_type} S/N ${bag.serial_no}]`,
                    location_id: bag.location_id,
                }])
            }
        }

        // Delete child records, then the bag itself
        await supabase.from('bag_dispatch_drug').delete().eq('dispatch_id', bag.id)
        await supabase.from('bag_usage_log').delete().eq('dispatch_id', bag.id)
        await supabase.from('bag_dispatch').delete().eq('id', bag.id)

        setDeleting(false)
        onClose(true)
    }

    async function handleAddLog() {
        setLogMsg('')
        const { error } = await supabase.from('bag_usage_log').insert([{
            dispatch_id: bag.id,
            opened_date: logForm.opened_date || null,
            person: logForm.person.trim() || null,
            illness: logForm.illness.trim() || null,
            used_item: logForm.used_item.trim() || null,
            flt_no: logForm.flt_no.trim() || null,
            seal_no: logForm.seal_no.trim() || null,
            remark: logForm.remark.trim() || null,
            created_by: getCreatedBy(),
        }])
        if (error) { setLogMsg('Failed: ' + error.message); return }
        setLogMsg('✓ Log added')
        setLogForm({ opened_date: '', person: '', illness: '', used_item: '', flt_no: '', seal_no: '', remark: '' })
        void loadLogs()
    }

    const tabs: { key: ModalTab; label: string; icon: React.ReactNode }[] = [
        { key: 'drugs', label: 'Drug list', icon: <Package className="size-3.5" /> },
        ...(canEdit ? [{ key: 'edit' as ModalTab, label: 'Edit info', icon: <Edit2 className="size-3.5" /> }] : []),
        ...(canLog ? [{ key: 'log' as ModalTab, label: 'Incident Report', icon: <ClipboardList className="size-3.5" /> }] : []),
    ]

    const badgeCls = bag.bag_type === 'FAK'
        ? 'bg-blue-100 text-blue-700'
        : 'bg-violet-100 text-violet-700'

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: 'calc(100vh - 3rem)' }}>

                {/* ── Modal header ── */}
                <div className="relative flex items-start justify-between gap-4 px-6 py-5 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #0f766e 0%, #1e3a5f 100%)' }}>
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15">
                            <Backpack className="size-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold ${badgeCls}`}>
                                    {bag.bag_type}
                                </span>
                                <span className="font-bold text-white text-base leading-none">{bag.serial_no}</span>
                                <span className="text-white/50 text-sm">·</span>
                                <span className="text-white/70 text-sm">{bag.status}</span>
                            </div>
                            <div className="mt-1 text-xs text-white/60 tabular-nums">
                                EQ: {bag.equipment_no}
                                {bag.order_no ? ` · Order: ${bag.order_no}` : ''}
                                {bag.date_in ? ` · Received: ${fmt(bag.date_in)}` : ''}
                                {bag.date_out ? ` · Released: ${fmt(bag.date_out)}` : ''}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => void handleDeleteBag()} disabled={deleting}
                            className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-1.5 text-xs font-bold text-red-200 hover:bg-red-500/30 transition-colors disabled:opacity-50">
                            <Trash2 className="size-3.5" />
                            {deleting ? 'กำลังลบ…' : 'Delete Bag'}
                        </button>
                        <button type="button" onClick={() => onClose()}
                            className="mt-0.5 shrink-0 flex size-8 items-center justify-center rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex items-center gap-0 border-b border-slate-100 px-6 shrink-0 bg-white">
                    {tabs.map((t) => (
                        <button key={t.key} type="button" onClick={() => setTab(t.key)}
                            className={`flex items-center gap-1.5 px-4 py-3.5 text-sm font-semibold border-b-2 transition-colors -mb-px ${
                                tab === t.key
                                    ? 'border-teal-600 text-teal-700'
                                    : 'border-transparent text-slate-400 hover:text-slate-700'
                            }`}>
                            {t.icon}
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Content ── */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40">

                    {/* Drug list */}
                    {tab === 'drugs' && (
                        !drugsLoaded
                            ? <p className="text-sm text-slate-400">Loading…</p>
                            : (
                                <div className="space-y-4">
                                    {/* EMK Equipment Checklist */}
                                    {bag.bag_type === 'EMK' && eqChecks.length > 0 && (
                                        <div className="overflow-hidden rounded-xl border border-blue-200 bg-blue-50/40">
                                            <div className="flex items-center gap-2 border-b border-blue-100 bg-blue-50 px-4 py-2.5">
                                                <span className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold bg-blue-100 text-blue-700">EMK</span>
                                                <span className="text-sm font-semibold text-blue-900">Equipment Checklist</span>
                                                <span className="ml-auto text-[11px] font-medium text-blue-500">
                                                    {eqChecks.filter(c => c.checked).length}/{eqChecks.length} checked
                                                </span>
                                            </div>
                                            <div className="divide-y divide-blue-100">
                                                {eqChecks.map((eq) => (
                                                    <div key={eq.id} className="flex items-start gap-3 px-4 py-2.5">
                                                        <div className="mt-0.5 shrink-0">
                                                            {eq.checked
                                                                ? <span className="inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-xs">✓</span>
                                                                : <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-slate-300 text-slate-300 text-xs">○</span>
                                                            }
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className={`text-sm font-medium ${eq.checked ? 'text-slate-600' : 'text-slate-800'}`}>
                                                                {eq.item_name}
                                                            </div>
                                                            {eq.remark && (
                                                                <div className="mt-0.5 text-xs text-slate-500 italic">{eq.remark}</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Drug list */}
                                    {drugs.length === 0
                                        ? <p className="text-sm text-slate-400">No drugs in this bag</p>
                                        : (
                                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                                <div className="grid grid-cols-[1fr_auto] border-b border-slate-100 bg-slate-50 px-4 py-2">
                                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Drug name</div>
                                                    <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">Qty</div>
                                                </div>
                                                <div className="divide-y divide-slate-100">
                                                    {drugs.map((d) => (
                                                        <div key={d.id} className="grid grid-cols-[1fr_auto] items-center px-4 py-3">
                                                            <div>
                                                                <div className="font-medium text-slate-900 text-sm">{d.drug_name}</div>
                                                                {d.barcode && <div className="text-xs text-slate-400 tabular-nums">{d.barcode}</div>}
                                                            </div>
                                                            <div className="rounded-lg bg-teal-50 px-3 py-1 text-sm font-bold text-teal-700 tabular-nums ring-1 ring-teal-200">
                                                                {d.qty}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    }
                                </div>
                            )
                    )}

                    {/* Edit form */}
                    {tab === 'edit' && canEdit && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Order No" value={editForm.order_no} onChange={(v) => setEditForm((p) => ({ ...p, order_no: v }))} />
                                <Field label="S/N *" value={editForm.serial_no} onChange={(v) => setEditForm((p) => ({ ...p, serial_no: v }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="EQ *" value={editForm.equipment_no} onChange={(v) => setEditForm((p) => ({ ...p, equipment_no: v }))} />
                                <Field label="Seal Number" value={editForm.seal_number} onChange={(v) => setEditForm((p) => ({ ...p, seal_number: v }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</label>
                                    <select value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition">
                                        <option value="">— select —</option>
                                        <option value="FAK">FAK</option>
                                        <option value="EMK">EMK</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</label>
                                    <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as 'OPEN' | 'CLOSE' }))}
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition">
                                        <option value="OPEN">OPEN</option>
                                        <option value="CLOSE">CLOSE</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">1st Cause</label>
                                    <select value={editForm.cause_1} onChange={(e) => setEditForm((p) => ({ ...p, cause_1: e.target.value }))}
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition">
                                        <option value="">— select —</option>
                                        <option value="Use">Used</option>
                                        <option value="Expire">Expired</option>
                                        <option value="Damage">Damaged</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">2nd Cause</label>
                                    <select value={editForm.cause_2} onChange={(e) => setEditForm((p) => ({ ...p, cause_2: e.target.value }))}
                                        className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition">
                                        <option value="">None</option>
                                        <option value="Expired">Expired</option>
                                        <option value="Damaged">Damaged</option>
                                        <option value="Expired & Damaged">Expired &amp; Damaged</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Received Date" type="date" value={editForm.date_in} onChange={(v) => setEditForm((p) => ({ ...p, date_in: v }))} />
                                <Field label="Released Date" type="date" value={editForm.date_out} onChange={(v) => setEditForm((p) => ({ ...p, date_out: v }))} />
                            </div>
                            <Field label="Expiry Date" type="date" value={editForm.expiry_date} onChange={(v) => setEditForm((p) => ({ ...p, expiry_date: v }))} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Repacked By" value={editForm.repacked_by} onChange={(v) => setEditForm((p) => ({ ...p, repacked_by: v }))} />
                                <Field label="Checked By" value={editForm.checked_by} onChange={(v) => setEditForm((p) => ({ ...p, checked_by: v }))} />
                            </div>
                            <Field label="Remark" value={editForm.remark} onChange={(v) => setEditForm((p) => ({ ...p, remark: v }))} />
                            {editMsg && (
                                <div className={`rounded-lg px-3 py-2.5 text-sm font-medium ${editMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-red-50 text-red-700 ring-1 ring-red-200'}`}>
                                    {editMsg}
                                </div>
                            )}
                            <button type="button" onClick={() => void handleSaveEdit()}
                                className="flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90 active:scale-[.98]"
                                style={{ background: 'linear-gradient(135deg, #0f766e 0%, #1e3a5f 100%)' }}>
                                <Edit2 className="size-4" /> Save changes
                            </button>
                        </div>
                    )}

                    {/* Usage log */}
                    {tab === 'log' && canLog && (
                        <div className="space-y-4">
                            <div className="rounded-xl border border-teal-200 bg-white p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-bold text-teal-800">
                                    <PlusCircle className="size-4 text-teal-500" /> Add usage entry
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="Opened Date" type="date" value={logForm.opened_date} onChange={(v) => setLogForm((p) => ({ ...p, opened_date: v }))} />
                                    <Field label="Person" value={logForm.person} onChange={(v) => setLogForm((p) => ({ ...p, person: v }))} />
                                </div>
                                <Field label="Illness" value={logForm.illness} onChange={(v) => setLogForm((p) => ({ ...p, illness: v }))} />
                                <Field label="Used Item" value={logForm.used_item} onChange={(v) => setLogForm((p) => ({ ...p, used_item: v }))} />
                                <div className="grid grid-cols-2 gap-3">
                                    <Field label="FLT.No." value={logForm.flt_no} onChange={(v) => setLogForm((p) => ({ ...p, flt_no: v }))} />
                                    <Field label="Seal No." value={logForm.seal_no} onChange={(v) => setLogForm((p) => ({ ...p, seal_no: v }))} />
                                </div>
                                <Field label="Remark" value={logForm.remark} onChange={(v) => setLogForm((p) => ({ ...p, remark: v }))} />
                                {logMsg && (
                                    <div className={`rounded-lg px-3 py-2 text-sm font-medium ${logMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {logMsg}
                                    </div>
                                )}
                                <button type="button" onClick={() => void handleAddLog()}
                                    className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-teal-700 text-sm font-bold text-white hover:bg-teal-800 transition-colors active:scale-[.98]">
                                    <PlusCircle className="size-4" /> Add log
                                </button>
                            </div>

                            {!logsLoaded ? (
                                <p className="text-sm text-slate-400">Loading…</p>
                            ) : logs.length === 0 ? (
                                <p className="text-sm text-slate-400">No usage logs yet</p>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map((log) => (
                                        <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-1">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold text-slate-900 text-sm">{log.person || '—'}</span>
                                                {log.opened_date && (
                                                    <span className="text-[10px] text-slate-400 tabular-nums">{new Date(log.opened_date).toLocaleDateString('th-TH')}</span>
                                                )}
                                            </div>
                                            {log.illness && <div className="text-xs text-slate-600">Illness: <span className="font-medium">{log.illness}</span></div>}
                                            {log.used_item && <div className="text-xs text-slate-600">Used item: <span className="font-medium">{log.used_item}</span></div>}
                                            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
                                                {log.flt_no && <div className="text-xs text-slate-500">FLT.No.: {log.flt_no}</div>}
                                                {log.seal_no && <div className="text-xs text-slate-500">Seal: {log.seal_no}</div>}
                                            </div>
                                            {log.remark && <div className="text-xs text-slate-400 italic">{log.remark}</div>}
                                            <div className="pt-1 text-[10px] text-slate-300 tabular-nums">
                                                By {log.created_by} · {log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Footer ── */}
                <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-3 shrink-0">
                    <button type="button" onClick={() => onClose()}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 hover:text-slate-700 transition-colors">
                        <ChevronLeft className="size-4" /> Close
                    </button>
                    <button type="button" onClick={() => void handlePrint()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                        <Printer className="size-3.5" /> Print A4
                    </button>
                </div>
            </div>
        </div>,
        document.body
    )
}

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, type = 'text' }: {
    label: string; value: string; onChange: (v: string) => void; type?: string
}) {
    return (
        <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </div>
    )
}

export default BagLog
