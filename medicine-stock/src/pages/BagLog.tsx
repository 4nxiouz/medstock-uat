import * as XLSX from 'xlsx'
import { Backpack, ChevronLeft, Download, Edit2, PlusCircle, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import { getCreatedBy, isPrivileged } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { BagDispatch, BagDispatchDrug, BagUsageLog } from '../types'

type PageProps = { onLogout: () => void }
type BagFilter = 'ALL' | 'FAK' | 'EMK'
type LogFilter = 'ALL' | 'done' | 'pending'
type ModalTab = 'drugs' | 'edit' | 'log'

function formatDate(d: string | null | undefined) {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
}

function BagLog({ onLogout }: PageProps) {
    const [bagFilter, setBagFilter] = useState<BagFilter>('ALL')
    const [logFilter, setLogFilter] = useState<LogFilter>('ALL')
    const [bags, setBags] = useState<BagDispatch[]>([])
    const [logCounts, setLogCounts] = useState<Record<number, number>>({})
    const [loading, setLoading] = useState(true)
    const [selectedBag, setSelectedBag] = useState<BagDispatch | null>(null)
    const [modalTab, setModalTab] = useState<ModalTab>('drugs')

    // Export state
    const [exportFrom, setExportFrom] = useState('')
    const [exportTo, setExportTo] = useState('')
    const [exporting, setExporting] = useState(false)

    const privileged = isPrivileged()

    useEffect(() => {
        void loadBags()
    }, [])

    async function loadBags() {
        setLoading(true)
        const [bagsRes, logsRes] = await Promise.all([
            supabase.from('bag_dispatch').select('*').order('created_at', { ascending: false }),
            supabase.from('bag_usage_log').select('dispatch_id'),
        ])
        setBags((bagsRes.data || []) as BagDispatch[])

        const counts: Record<number, number> = {}
        for (const row of (logsRes.data || []) as { dispatch_id: number }[]) {
            counts[row.dispatch_id] = (counts[row.dispatch_id] ?? 0) + 1
        }
        setLogCounts(counts)
        setLoading(false)
    }

    const filtered = bags
        .filter((b) => bagFilter === 'ALL' || b.bag_type === bagFilter)
        .filter((b) => {
            if (logFilter === 'ALL') return true
            const hasDone = (logCounts[b.id] ?? 0) > 0
            return logFilter === 'done' ? hasDone : !hasDone
        })

    const pendingCount = bags.filter((b) => (logCounts[b.id] ?? 0) === 0).length

    function openBag(bag: BagDispatch) {
        setSelectedBag(bag)
        setModalTab('drugs')
    }

    function closeModal() {
        setSelectedBag(null)
        void loadBags()
    }

    async function handleExport() {
        if (!exportFrom || !exportTo) return
        setExporting(true)

        const from = exportFrom + 'T00:00:00'
        const to = exportTo + 'T23:59:59'

        const [bagsRes, drugsRes, logsRes] = await Promise.all([
            supabase.from('bag_dispatch').select('*').gte('created_at', from).lte('created_at', to).order('created_at'),
            supabase.from('bag_dispatch_drug').select('*'),
            supabase.from('bag_usage_log').select('*').order('created_at'),
        ])

        const allBags = (bagsRes.data || []) as BagDispatch[]
        const allDrugs = (drugsRes.data || []) as BagDispatchDrug[]
        const allLogs = (logsRes.data || []) as BagUsageLog[]

        // Sheet 1: Dispatch + Drugs
        const dispatchRows: Record<string, unknown>[] = []
        for (const bag of allBags) {
            const drugs = allDrugs.filter((d) => d.dispatch_id === bag.id)
            if (drugs.length === 0) {
                dispatchRows.push(bagRow(bag, null))
            } else {
                for (const drug of drugs) {
                    dispatchRows.push(bagRow(bag, drug))
                }
            }
        }

        // Sheet 2: Usage Logs
        const logRows: Record<string, unknown>[] = []
        for (const log of allLogs) {
            const bag = allBags.find((b) => b.id === log.dispatch_id)
            logRows.push({
                'Bag Type': bag?.bag_type ?? '',
                'S/N': bag?.serial_no ?? '',
                'EQ': bag?.equipment_no ?? '',
                'Out Date': bag?.date_out ? formatDate(bag.date_out) : '',
                'ชื่อยา': log.drug_name ?? '',
                'จำนวนที่ใช้': log.qty_used ?? '',
                'อาการผู้ป่วย': log.patient_condition ?? '',
                'เหตุผล': log.reason ?? '',
                'หมายเหตุ': log.notes ?? '',
                'บันทึกโดย': log.created_by ?? '',
                'วันที่บันทึก': log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : '',
            })
        }

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dispatchRows), 'Dispatch')
        if (logRows.length > 0) {
            XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logRows), 'Usage Log')
        }
        XLSX.writeFile(wb, `BagLog_${exportFrom}_${exportTo}.xlsx`)
        setExporting(false)
    }

    function bagRow(bag: BagDispatch, drug: BagDispatchDrug | null) {
        return {
            'Bag Type': bag.bag_type,
            'Order No': bag.order_no ?? '',
            'S/N': bag.serial_no,
            'EQ': bag.equipment_no,
            'Seal Number': bag.seal_number ?? '',
            'Type': bag.type ?? '',
            'Status': bag.status,
            'Cause 1': bag.cause_1 ?? '',
            'Cause 2': bag.cause_2 ?? '',
            'In Date': bag.date_in ? formatDate(bag.date_in) : '',
            'Out Date': bag.date_out ? formatDate(bag.date_out) : '',
            'ชื่อยา': drug?.drug_name ?? '',
            'Barcode': drug?.barcode ?? '',
            'จำนวน (หน่วย)': drug?.qty ?? '',
        }
    }

    return (
        <PageLayout title="Bag Log" subtitle="บันทึกการจ่ายยาเข้ากระเป๋า FAK / EMK" onLogout={onLogout}>
            {/* Filter row */}
            <div className="mb-4 flex flex-wrap items-center gap-3">
                {/* Bag type filter */}
                <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                    {(['ALL', 'FAK', 'EMK'] as BagFilter[]).map((f) => (
                        <button key={f} type="button" onClick={() => setBagFilter(f)}
                            className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${bagFilter === f ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {f === 'ALL' ? 'ทั้งหมด' : f}
                        </button>
                    ))}
                </div>

                {/* Log status filter */}
                <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
                    <button type="button" onClick={() => setLogFilter('ALL')}
                        className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${logFilter === 'ALL' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                        ทุกสถานะ
                    </button>
                    <button type="button" onClick={() => setLogFilter('done')}
                        className={`rounded-md px-4 py-1.5 text-sm font-semibold transition ${logFilter === 'done' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                        มีบันทึกแล้ว
                    </button>
                    <button type="button" onClick={() => setLogFilter('pending')}
                        className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-semibold transition ${logFilter === 'pending' ? 'bg-amber-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                        ยังไม่มีบันทึก
                        {pendingCount > 0 && (
                            <span className={`rounded-full px-1.5 text-[10px] font-bold ${logFilter === 'pending' ? 'bg-white/30 text-white' : 'bg-amber-100 text-amber-700'}`}>
                                {pendingCount}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Export row */}
            <div className="mb-5 flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3">
                <span className="text-sm font-medium text-slate-600">Export Excel:</span>
                <input type="date" value={exportFrom} onChange={(e) => setExportFrom(e.target.value)}
                    className="h-8 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-500" />
                <span className="text-sm text-slate-400">ถึง</span>
                <input type="date" value={exportTo} onChange={(e) => setExportTo(e.target.value)}
                    className="h-8 rounded-lg border border-slate-300 px-2 text-sm outline-none focus:border-teal-500" />
                <button type="button" onClick={() => void handleExport()}
                    disabled={!exportFrom || !exportTo || exporting}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                    <Download className="size-3.5" />
                    {exporting ? 'กำลัง Export...' : 'Export'}
                </button>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-sm text-slate-400">กำลังโหลด...</div>
            ) : filtered.length === 0 ? (
                <EmptyState title="ยังไม่มีบันทึก" />
            ) : (
                <Card className="overflow-hidden p-0">
                    <div className="hidden md:grid md:grid-cols-[80px_1fr_120px_80px_100px_100px_120px_60px] bg-slate-50 border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase text-slate-500">
                        <div>Type</div>
                        <div>S/N — EQ</div>
                        <div>Order No</div>
                        <div>Status</div>
                        <div>In Date</div>
                        <div>Out Date</div>
                        <div>Supervisor</div>
                        <div></div>
                    </div>
                    <div className="divide-y divide-slate-100">
                        {filtered.map((bag) => {
                            const hasDone = (logCounts[bag.id] ?? 0) > 0
                            return (
                                <button key={bag.id} type="button" onClick={() => openBag(bag)}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 transition md:grid md:grid-cols-[80px_1fr_120px_80px_100px_100px_120px_60px] md:items-center">
                                    <div className="flex items-center gap-2 mb-1 md:mb-0">
                                        <span className={`inline-flex h-6 items-center rounded-full px-2.5 text-[11px] font-bold ${bag.bag_type === 'FAK' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                            {bag.bag_type}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-900 text-sm">{bag.serial_no}</div>
                                        <div className="text-xs text-slate-500">EQ: {bag.equipment_no}</div>
                                    </div>
                                    <div className="text-xs text-slate-500 hidden md:block">{bag.order_no || '-'}</div>
                                    <div className="text-xs text-slate-700 hidden md:block font-medium">{bag.status}</div>
                                    <div className="text-xs text-slate-600 hidden md:block">{formatDate(bag.date_in)}</div>
                                    <div className="text-xs text-slate-600 hidden md:block">{formatDate(bag.date_out)}</div>
                                    <div className="hidden md:block">
                                        {hasDone ? (
                                            <span className="inline-flex h-6 items-center rounded-full bg-emerald-50 px-2.5 text-[11px] font-semibold text-emerald-700">
                                                ✓ มีบันทึกแล้ว
                                            </span>
                                        ) : (
                                            <span className="inline-flex h-6 items-center rounded-full bg-amber-50 px-2.5 text-[11px] font-semibold text-amber-600">
                                                ยังไม่มีบันทึก
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-teal-600 text-xs font-medium hidden md:block">ดูรายละเอียด →</div>
                                </button>
                            )
                        })}
                    </div>
                </Card>
            )}

            {selectedBag && (
                <BagDetailModal
                    bag={selectedBag}
                    tab={modalTab}
                    setTab={setModalTab}
                    privileged={privileged}
                    onClose={closeModal}
                    onBagUpdated={(updated) => setSelectedBag(updated)}
                />
            )}
        </PageLayout>
    )
}

function BagDetailModal({
    bag,
    tab,
    setTab,
    privileged,
    onClose,
    onBagUpdated,
}: {
    bag: BagDispatch
    tab: ModalTab
    setTab: (t: ModalTab) => void
    privileged: boolean
    onClose: () => void
    onBagUpdated: (b: BagDispatch) => void
}) {
    const [drugs, setDrugs] = useState<BagDispatchDrug[]>([])
    const [logs, setLogs] = useState<BagUsageLog[]>([])
    const [drugsLoaded, setDrugsLoaded] = useState(false)
    const [logsLoaded, setLogsLoaded] = useState(false)

    const [editForm, setEditForm] = useState({
        order_no: bag.order_no ?? '',
        serial_no: bag.serial_no,
        equipment_no: bag.equipment_no,
        seal_number: bag.seal_number ?? '',
        type: bag.type ?? '',
        status: bag.status,
        cause_1: bag.cause_1 ?? '',
        cause_2: bag.cause_2 ?? '',
        date_in: bag.date_in ?? '',
        date_out: bag.date_out ?? '',
    })
    const [editMsg, setEditMsg] = useState('')

    const [logForm, setLogForm] = useState({ drug_name: '', qty_used: '', patient_condition: '', reason: '', notes: '' })
    const [logMsg, setLogMsg] = useState('')

    useEffect(() => { void loadDrugs() }, [])
    useEffect(() => { if (tab === 'log' && !logsLoaded) void loadLogs() }, [tab])

    async function loadDrugs() {
        const { data } = await supabase.from('bag_dispatch_drug').select('*').eq('dispatch_id', bag.id)
        setDrugs((data || []) as BagDispatchDrug[])
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
            setEditMsg('S/N และ EQ จำเป็นต้องกรอก')
            return
        }
        const { data, error } = await supabase
            .from('bag_dispatch')
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
            })
            .eq('id', bag.id)
            .select('*')
            .single()
        if (error) { setEditMsg('บันทึกล้มเหลว: ' + error.message); return }
        onBagUpdated(data as BagDispatch)
        setEditMsg('✓ บันทึกสำเร็จ')
    }

    async function handleAddLog() {
        setLogMsg('')
        const { error } = await supabase.from('bag_usage_log').insert([{
            dispatch_id: bag.id,
            drug_name: logForm.drug_name.trim(),
            qty_used: logForm.qty_used ? Number(logForm.qty_used) : null,
            patient_condition: logForm.patient_condition.trim() || null,
            reason: logForm.reason.trim() || null,
            notes: logForm.notes.trim() || null,
            created_by: getCreatedBy(),
        }])
        if (error) { setLogMsg('บันทึกล้มเหลว: ' + error.message); return }
        setLogMsg('✓ เพิ่มบันทึกสำเร็จ')
        setLogForm({ drug_name: '', qty_used: '', patient_condition: '', reason: '', notes: '' })
        void loadLogs()
    }

    const tabs: { key: ModalTab; label: string }[] = [
        { key: 'drugs', label: 'รายการยา' },
        ...(privileged ? [{ key: 'edit' as ModalTab, label: 'แก้ไขข้อมูล' }] : []),
        ...(privileged ? [{ key: 'log' as ModalTab, label: 'Usage Log' }] : []),
    ]

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 flex-wrap">
                        <Backpack className="size-5 text-teal-600 shrink-0" />
                        <div>
                            <div className="font-semibold text-slate-900">{bag.bag_type} · {bag.serial_no}</div>
                            <div className="text-xs text-slate-500">EQ: {bag.equipment_no} · In: {formatDate(bag.date_in)} · Out: {formatDate(bag.date_out)}</div>
                        </div>
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-2.5 py-0.5">{bag.status}</span>
                    </div>
                    <button type="button" onClick={onClose}
                        className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50 shrink-0">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-0.5 border-b border-slate-100 px-5 pt-3">
                    {tabs.map((t) => (
                        <button key={t.key} type="button" onClick={() => setTab(t.key)}
                            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition ${tab === t.key ? 'bg-teal-700 text-white' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'}`}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5">

                    {/* Drugs tab */}
                    {tab === 'drugs' && (
                        !drugsLoaded ? <p className="text-sm text-slate-400">กำลังโหลด...</p>
                        : drugs.length === 0 ? <p className="text-sm text-slate-400">ไม่มีรายการยา</p>
                        : (
                            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
                                {drugs.map((d) => (
                                    <div key={d.id} className="flex items-center justify-between px-4 py-3">
                                        <div>
                                            <div className="font-medium text-slate-900 text-sm">{d.drug_name}</div>
                                            <div className="text-xs text-slate-400">{d.barcode}</div>
                                        </div>
                                        <div className="rounded-lg bg-teal-50 px-3 py-1 text-sm font-semibold text-teal-700">{d.qty} หน่วย</div>
                                    </div>
                                ))}
                            </div>
                        )
                    )}

                    {/* Edit tab */}
                    {tab === 'edit' && privileged && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <MiniField label="Order No" value={editForm.order_no} onChange={(v) => setEditForm((p) => ({ ...p, order_no: v }))} />
                                <MiniField label="S/N *" value={editForm.serial_no} onChange={(v) => setEditForm((p) => ({ ...p, serial_no: v }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MiniField label="EQ *" value={editForm.equipment_no} onChange={(v) => setEditForm((p) => ({ ...p, equipment_no: v }))} />
                                <MiniField label="Seal Number" value={editForm.seal_number} onChange={(v) => setEditForm((p) => ({ ...p, seal_number: v }))} />
                            </div>
                            {/* Type between Seal Number and Status */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Type</label>
                                    <select value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}
                                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-500">
                                        <option value="">-- เลือก --</option>
                                        <option value="FAK">FAK</option>
                                        <option value="EMK">EMK</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                                    <select value={editForm.status} onChange={(e) => setEditForm((p) => ({ ...p, status: e.target.value as 'OPEN' | 'CLOSE' }))}
                                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-500">
                                        <option value="OPEN">OPEN</option>
                                        <option value="CLOSE">CLOSE</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">1 Cause</label>
                                    <select value={editForm.cause_1} onChange={(e) => setEditForm((p) => ({ ...p, cause_1: e.target.value as 'Use' | 'Expire' | '' }))}
                                        className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-500">
                                        <option value="">-- เลือก --</option>
                                        <option value="Use">Use</option>
                                        <option value="Expire">Expire</option>
                                    </select>
                                </div>
                                <MiniField label="2 Cause" value={editForm.cause_2} onChange={(v) => setEditForm((p) => ({ ...p, cause_2: v }))} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <MiniField label="In Date" type="date" value={editForm.date_in} onChange={(v) => setEditForm((p) => ({ ...p, date_in: v }))} />
                                <MiniField label="Out Date" type="date" value={editForm.date_out} onChange={(v) => setEditForm((p) => ({ ...p, date_out: v }))} />
                            </div>
                            {editMsg && (
                                <div className={`rounded-md px-3 py-2 text-sm ${editMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {editMsg}
                                </div>
                            )}
                            <button type="button" onClick={() => void handleSaveEdit()}
                                className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white"
                                style={{ background: 'linear-gradient(160deg, #0f766e 0%, #1e3a5f 100%)' }}>
                                <Edit2 className="size-4" /> บันทึกการแก้ไข
                            </button>
                        </div>
                    )}

                    {/* Usage log tab */}
                    {tab === 'log' && privileged && (
                        <div className="space-y-5">
                            <div className="rounded-xl border-2 border-teal-100 bg-teal-50/40 p-4 space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-teal-800">
                                    <PlusCircle className="size-4" /> เพิ่มบันทึกการใช้ยา
                                </div>
                                <MiniField label="ชื่อยา" value={logForm.drug_name} onChange={(v) => setLogForm((p) => ({ ...p, drug_name: v }))} />
                                <div className="grid grid-cols-2 gap-3">
                                    <MiniField label="จำนวนที่ใช้" type="number" value={logForm.qty_used} onChange={(v) => setLogForm((p) => ({ ...p, qty_used: v }))} />
                                    <MiniField label="อาการผู้ป่วย" value={logForm.patient_condition} onChange={(v) => setLogForm((p) => ({ ...p, patient_condition: v }))} />
                                </div>
                                <MiniField label="เหตุผล" value={logForm.reason} onChange={(v) => setLogForm((p) => ({ ...p, reason: v }))} />
                                <MiniField label="หมายเหตุ" value={logForm.notes} onChange={(v) => setLogForm((p) => ({ ...p, notes: v }))} />
                                {logMsg && (
                                    <div className={`rounded-md px-3 py-2 text-sm ${logMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                        {logMsg}
                                    </div>
                                )}
                                <button type="button" onClick={() => void handleAddLog()}
                                    className="h-9 w-full rounded-lg bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800">
                                    บันทึก
                                </button>
                            </div>

                            {!logsLoaded ? (
                                <p className="text-sm text-slate-400">กำลังโหลด...</p>
                            ) : logs.length === 0 ? (
                                <p className="text-sm text-slate-400">ยังไม่มีบันทึก</p>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map((log) => (
                                        <div key={log.id} className="rounded-xl border border-slate-200 p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="font-medium text-slate-900 text-sm">{log.drug_name}</div>
                                                {log.qty_used != null && (
                                                    <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 shrink-0">{log.qty_used} หน่วย</span>
                                                )}
                                            </div>
                                            {log.patient_condition && <div className="mt-1 text-xs text-slate-500">อาการ: {log.patient_condition}</div>}
                                            {log.reason && <div className="text-xs text-slate-500">เหตุผล: {log.reason}</div>}
                                            {log.notes && <div className="text-xs text-slate-400">{log.notes}</div>}
                                            <div className="mt-1.5 text-[10px] text-slate-300">โดย {log.created_by} · {log.created_at ? new Date(log.created_at).toLocaleString('th-TH') : ''}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="border-t border-slate-100 px-5 py-3">
                    <button type="button" onClick={onClose}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
                        <ChevronLeft className="size-4" /> ปิด
                    </button>
                </div>
            </div>
        </div>
    )
}

function MiniField({ label, value, onChange, type = 'text' }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
    return (
        <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">{label}</label>
            <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100" />
        </div>
    )
}

export default BagLog
