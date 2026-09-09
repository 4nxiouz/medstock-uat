import { AlertTriangle, Boxes, Camera, ClipboardList, Download, Package, Pencil, Printer, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import CameraScanner from '../components/CameraScanner'
import DrugIcon from '../components/DrugIcon'
import EmptyState from '../components/EmptyState'
import FormInput from '../components/FormInput'
import IconPicker from '../components/IconPicker'
import PageLayout from '../components/PageLayout'
import SearchInput from '../components/SearchInput'
import StatCard from '../components/StatCard'
import { getCreatedBy, isAdmin, isSupervisor } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type AdjustLog = { id: number; barcode: string; qty: number; action: string; created_by: string; created_at: string }

type PageProps = { onLogout: () => void }
type EditForm = { drug_name: string; current_stock: string; min_stock: string; unit_per_scan: string; unit_per_scan_in: string; category: string; icon_type: string }

function downloadCSV(drugs: Drug[], locationCode: string) {
    const header = ['Barcode', 'Name', 'Category', 'Stock', 'Min Stock', 'Unit/Scan']
    const rows = drugs.map((d) => [d.barcode, d.drug_name, d.category ?? '', d.current_stock, d.min_stock, d.unit_per_scan].join(','))
    const csv = '﻿' + [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `inventory_${locationCode}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
}

function Inventory({ onLogout }: PageProps) {
    const { location } = useLocation()
    const [drugs, setDrugs] = useState<Drug[]>([])
    const [search, setSearch] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [editingDrug, setEditingDrug] = useState<Drug | null>(null)
    const [editForm, setEditForm] = useState<EditForm>({ drug_name: '', current_stock: '', min_stock: '', unit_per_scan: '', unit_per_scan_in: '', category: '', icon_type: '' })
    const [adjustDrug, setAdjustDrug] = useState<Drug | null>(null)
    const [adjustCount, setAdjustCount] = useState('')
    const [adjustRemark, setAdjustRemark] = useState('')
    const [adjustError, setAdjustError] = useState('')
    const [showAdjustLog, setShowAdjustLog] = useState(false)
    const [adjustLogs, setAdjustLogs] = useState<AdjustLog[]>([])
    const [adjustLogsLoading, setAdjustLogsLoading] = useState(false)
    const [cameraOpen, setCameraOpen] = useState(false)
    const admin = isAdmin()
    const supervisor = isSupervisor()
    const [activeCategory, setActiveCategory] = useState<string>('ทั้งหมด')
    const [showLowOnly, setShowLowOnly] = useState(false)

    async function loadDrugs() {
        if (!location) return
        setLoading(true)
        const { data, error } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, unit_per_scan_in, image_url, category, icon_type')
            .eq('location_id', location.id)
            .order('drug_name')
        setLoading(false)
        if (!error) setDrugs((data || []) as Drug[])
    }

    useEffect(() => { void loadDrugs() }, [location])

    const categories = useMemo(() => {
        const cats = Array.from(new Set(drugs.map((d) => d.category || 'อื่นๆ'))).sort()
        return ['ทั้งหมด', ...cats]
    }, [drugs])

    const filteredDrugs = useMemo(() => {
        const kw = search.toLowerCase()
        return drugs.filter((d) => {
            const matchSearch = d.drug_name.toLowerCase().includes(kw) || d.barcode.includes(search)
            const matchCat = activeCategory === 'ทั้งหมด' || (d.category || 'อื่นๆ') === activeCategory
            const matchLow = !showLowOnly || (Number(d.min_stock) > 0 && Number(d.current_stock) <= Number(d.min_stock))
            return matchSearch && matchCat && matchLow
        })
    }, [drugs, search, activeCategory, showLowOnly])

    // Group by category when viewing all
    const grouped = useMemo(() => {
        if (activeCategory !== 'ทั้งหมด') return null
        const map = new Map<string, Drug[]>()
        for (const d of filteredDrugs) {
            const cat = d.category || 'อื่นๆ'
            if (!map.has(cat)) map.set(cat, [])
            map.get(cat)!.push(d)
        }
        return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b, 'th'))
    }, [filteredDrugs, activeCategory])

    const lowStock = drugs.filter((d) => Number(d.min_stock) > 0 && Number(d.current_stock) <= Number(d.min_stock))
    const totalStock = drugs.reduce((sum, d) => sum + Number(d.current_stock || 0), 0)

    function openEdit(drug: Drug) {
        setEditingDrug(drug)
        setEditForm({
            drug_name: drug.drug_name,
            current_stock: String(drug.current_stock),
            min_stock: String(drug.min_stock),
            unit_per_scan: String(drug.unit_per_scan),
            unit_per_scan_in: String(drug.unit_per_scan_in ?? drug.unit_per_scan),
            category: drug.category ?? '',
            icon_type: drug.icon_type ?? '',
        })
    }

    async function handleSaveEdit() {
        if (!editingDrug) return
        setMessage('')
        const newStock = Number(editForm.current_stock)
        const diff = newStock - Number(editingDrug.current_stock)
        if (diff !== 0) {
            await supabase.from('stock_transaction').insert([{
                barcode: editingDrug.barcode,
                qty: Math.abs(diff),
                action: diff > 0 ? 'IN' : 'OUT',
                created_by: getCreatedBy() + ' [edit]',
                location_id: location?.id,
            }])
        }
        const { error } = await supabase.from('drug_master').update({
            drug_name: editForm.drug_name.trim(),
            current_stock: newStock,
            min_stock: Number(editForm.min_stock),
            unit_per_scan: Number(editForm.unit_per_scan),
            unit_per_scan_in: Number(editForm.unit_per_scan_in) || null,
            category: editForm.category.trim() || null,
            icon_type: editForm.icon_type.trim() || null,
        }).eq('id', editingDrug.id)
        if (error) { setMessage('Update failed.'); return }
        setDrugs((cur) => cur.map((d) => d.id === editingDrug.id
            ? { ...d, drug_name: editForm.drug_name, current_stock: newStock, min_stock: Number(editForm.min_stock), unit_per_scan: Number(editForm.unit_per_scan), unit_per_scan_in: Number(editForm.unit_per_scan_in) || null, category: editForm.category || null, icon_type: editForm.icon_type || null }
            : d))
        setEditingDrug(null)
        setMessage('Updated.')
    }

    const [confirmDeleteDrug, setConfirmDeleteDrug] = useState<Drug | null>(null)

    async function handleDelete(drug: Drug) {
        setMessage('')
        if (drug.current_stock > 0) {
            await supabase.from('stock_transaction').insert([{
                barcode: drug.barcode, qty: drug.current_stock, action: 'OUT',
                created_by: getCreatedBy() + ' [deleted]', location_id: location?.id,
            }])
        }
        const { error } = await supabase.from('drug_master').delete().eq('id', drug.id)
        if (error) { setMessage('Delete failed.'); return }
        setDrugs((cur) => cur.filter((d) => d.id !== drug.id))
        setConfirmDeleteDrug(null)
        setMessage('Deleted.')
    }

    async function handleAdjust() {
        if (!adjustDrug || !location) return
        setAdjustError('')
        if (!adjustRemark.trim()) { setAdjustError('กรุณาระบุเหตุผลในการปรับสต็อก'); return }
        const newStock = Number(adjustCount)
        if (!Number.isFinite(newStock) || newStock < 0) return
        const diff = newStock - Number(adjustDrug.current_stock)
        const { error } = await supabase.from('drug_master').update({ current_stock: newStock }).eq('id', adjustDrug.id)
        if (error) { setMessage('Adjust failed.'); return }
        if (diff !== 0) {
            await supabase.from('stock_transaction').insert([{
                barcode: adjustDrug.barcode, qty: Math.abs(diff),
                action: diff > 0 ? 'IN' : 'OUT',
                created_by: getCreatedBy() + ` [adjust: ${adjustRemark.trim()}]`,
                location_id: location.id,
            }])
        } else {
            await supabase.from('stock_transaction').insert([{
                barcode: adjustDrug.barcode, qty: 0,
                action: 'IN',
                created_by: getCreatedBy() + ` [adjust: ${adjustRemark.trim()}]`,
                location_id: location.id,
            }])
        }
        setDrugs((cur) => cur.map((d) => d.id === adjustDrug.id ? { ...d, current_stock: newStock } : d))
        setAdjustDrug(null); setAdjustCount(''); setAdjustRemark(''); setAdjustError('')
        setMessage(`Stock adjusted to ${newStock}.`)
    }

    async function loadAdjustLogs() {
        if (!location) return
        setAdjustLogsLoading(true)
        const { data } = await supabase
            .from('stock_transaction')
            .select('id, barcode, qty, action, created_by, created_at')
            .eq('location_id', location.id)
            .ilike('created_by', '%[adjust%')
            .order('created_at', { ascending: false })
            .limit(200)
        setAdjustLogs((data || []) as AdjustLog[])
        setAdjustLogsLoading(false)
    }

    function handlePrint(drug: Drug) {
        const win = window.open('', '_blank', 'width=400,height=300')
        if (!win) return
        win.document.write(`<!DOCTYPE html><html><head><title>Label</title>
<style>
  body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: sans-serif; }
  .name { font-weight: 700; font-size: 13pt; margin-bottom: 6px; text-align: center; }
  .loc { font-size: 9pt; color: #666; margin-top: 4px; }
  @media print { @page { margin: 8mm; } }
</style>
</head><body>
<div class="name">${drug.drug_name}</div>
<svg id="bc"></svg>
<div class="loc">${location?.code ?? ''}</div>
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"><\/script>
<script>
  window.onload = function() {
    JsBarcode("#bc", "${drug.barcode}", { format:"CODE128", height:56, displayValue:true, fontSize:11, margin:4 });
    window.print();
    window.onafterprint = function() { window.close(); };
  };
<\/script>
</body></html>`)
        win.document.close()
    }

    function DrugCard({ drug }: { drug: Drug }) {
        const isLow = Number(drug.min_stock) > 0 && Number(drug.current_stock) <= Number(drug.min_stock)
        return (
            <article className={`flex flex-col rounded-xl border bg-white shadow-sm ${isLow ? 'border-red-200' : 'border-slate-200'}`}>
                <div className="flex min-h-[4.5rem] items-center gap-3 p-3">
                    {/* Small square icon */}
                    <div className="size-12 shrink-0 overflow-hidden rounded-lg bg-slate-50">
                        {drug.image_url
                            ? <img src={drug.image_url} alt={drug.drug_name} className="size-full object-cover" />
                            : <DrugIcon name={drug.drug_name} category={drug.category} iconType={drug.icon_type} />
                        }
                    </div>
                    {/* Name + meta */}
                    <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-1">
                            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">{drug.drug_name}</h3>
                            {isLow && <span className="shrink-0 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-600">Low</span>}
                        </div>
                        <p className="text-[11px] text-slate-400">{drug.barcode}</p>
                    </div>
                </div>

                <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                        {([['STOCK', drug.current_stock, isLow ? 'text-red-600' : 'text-slate-900'], ['MIN', drug.min_stock, 'text-slate-900'], ['UNIT', drug.unit_per_scan, 'text-slate-900']] as [string, number, string][]).map(([label, val, cls]) => (
                            <div key={label} className="rounded-lg bg-slate-50 py-1.5">
                                <div className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</div>
                                <div className={`text-base font-bold ${cls}`}>{val}</div>
                            </div>
                        ))}
                    </div>
                    {/* Action buttons */}
                    <div className={`grid gap-1 ${admin ? 'grid-cols-3' : supervisor ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {admin && (
                            <button type="button" onClick={() => openEdit(drug)} className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                                <Pencil className="size-3" />Edit
                            </button>
                        )}
                        {!supervisor && (
                            <button type="button" onClick={() => { setAdjustDrug(drug); setAdjustCount(String(drug.current_stock)); setAdjustRemark(''); setAdjustError('') }}
                                className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                                <SlidersHorizontal className="size-3" />Adjust
                            </button>
                        )}
                        <button type="button" onClick={() => handlePrint(drug)}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-teal-200 py-1.5 text-xs font-semibold text-teal-700 hover:bg-teal-50">
                            <Printer className="size-3" />Print
                        </button>
                    </div>
                    {/* Delete — icon only, admin */}
                    {admin && (
                        <div className="flex justify-end pt-0.5">
                            <button type="button" onClick={() => setConfirmDeleteDrug(drug)}
                                title="Delete"
                                className="flex items-center justify-center rounded-md p-1 text-red-300 hover:bg-red-50 hover:text-red-600 transition-colors">
                                <Trash2 className="size-3.5" />
                            </button>
                        </div>
                    )}
                </div>
            </article>
        )
    }

    return (
        <PageLayout title="Stock" subtitle="All items" onLogout={onLogout}>
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Items" value={drugs.length} tone="blue" icon={Package} />
                <StatCard title="Total Stock" value={totalStock} tone="green" icon={Boxes} />
                <StatCard title="Low Stock" value={lowStock.length} tone="red" icon={AlertTriangle} />
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {/* Toolbar */}
                <div className="flex items-center gap-3 bg-slate-100 px-5 py-3 border-b border-slate-200">
                    <div className="flex-1">
                        <SearchInput value={search} onChange={setSearch} placeholder="พิมพ์ชื่อยา หรือ scan barcode" />
                    </div>
                    <button type="button" onClick={() => setCameraOpen(true)} title="สแกนด้วยกล้อง"
                        className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm font-semibold text-cyan-700 hover:bg-cyan-100">
                        <Camera className="size-4" /><span className="hidden sm:inline">กล้อง</span>
                    </button>
                    <CameraScanner open={cameraOpen} onClose={() => setCameraOpen(false)} onScan={(code) => { setSearch(code); setCameraOpen(false) }} />
                    <button type="button" onClick={() => { setShowAdjustLog(true); void loadAdjustLogs() }}
                        className="inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 text-sm font-semibold text-violet-700 hover:bg-violet-100">
                        <ClipboardList className="size-4" /><span className="hidden sm:inline">Adjust Log</span>
                    </button>
                    <button type="button" onClick={() => downloadCSV(filteredDrugs, location?.code ?? 'export')}
                        className="ml-auto inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                        <Download className="size-4" />CSV
                    </button>
                    {message && <div className="rounded-md bg-white px-3 py-2 text-sm text-slate-700">{message}</div>}
                </div>

                {/* Category tabs */}
                <div className="flex gap-2 overflow-x-auto border-b border-slate-200 px-5 py-2.5 scrollbar-none">
                    {categories.map((cat) => (
                        <button key={cat} type="button" onClick={() => setActiveCategory(cat)}
                            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${activeCategory === cat ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {cat}
                            {cat !== 'ทั้งหมด' && (
                                <span className={`ml-1.5 ${activeCategory === cat ? 'text-white/70' : 'text-slate-400'}`}>
                                    {drugs.filter((d) => (d.category || 'อื่นๆ') === cat).length}
                                </span>
                            )}
                        </button>
                    ))}
                    <button type="button" onClick={() => setShowLowOnly((v) => !v)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${showLowOnly ? 'bg-red-500 text-white' : 'bg-red-50 text-red-500 hover:bg-red-100'}`}>
                        ⚠ Low
                        <span className={`ml-1.5 ${showLowOnly ? 'text-white/70' : 'text-red-400'}`}>{lowStock.length}</span>
                    </button>
                </div>

                {/* Drug cards */}
                <div className="p-5">
                    {loading ? (
                        <div className="py-16 text-center text-sm text-slate-500">Loading...</div>
                    ) : filteredDrugs.length === 0 ? (
                        <EmptyState title="No items found" />
                    ) : grouped ? (
                        /* Grouped view (ทั้งหมด) */
                        <div className="space-y-8">
                            {grouped.map(([cat, items]) => (
                                <div key={cat}>
                                    <div className="mb-3 flex items-center gap-3">
                                        <h2 className="text-sm font-bold text-slate-700">{cat}</h2>
                                        <span className="text-xs text-slate-400">{items.length} รายการ</span>
                                        <div className="flex-1 border-t border-slate-200" />
                                    </div>
                                    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                                        {items.map((drug) => <DrugCard key={drug.id} drug={drug} />)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        /* Filtered single-category view */
                        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                            {filteredDrugs.map((drug) => <DrugCard key={drug.id} drug={drug} />)}
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal — portal to escape any parent stacking context */}
            {editingDrug && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-950">Edit Item</h3>
                                <p className="text-sm text-slate-500">{editingDrug.barcode}</p>
                            </div>
                            <button type="button" onClick={() => setEditingDrug(null)} className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="size-4" /></button>
                        </div>
                        <div className="space-y-3">
                            <FormInput label="Name" value={editForm.drug_name} onChange={(e) => setEditForm((c) => ({ ...c, drug_name: e.target.value }))} />
                            <div>
                                <label className="mb-1 block text-xs font-semibold text-slate-500 uppercase tracking-wide">Category (หมวดยา)</label>
                                <select
                                    value={editForm.category}
                                    onChange={(e) => setEditForm((c) => ({ ...c, category: e.target.value }))}
                                    className="h-9 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                                >
                                    <option value="">— ไม่ระบุ —</option>
                                    {categories.filter((c) => c !== 'ทั้งหมด').map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <IconPicker
                                label="รูปไอคอน"
                                value={editForm.icon_type}
                                onChange={(v) => setEditForm((c) => ({ ...c, icon_type: v }))}
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <FormInput label="Stock" type="number" value={editForm.current_stock} onChange={(e) => setEditForm((c) => ({ ...c, current_stock: e.target.value }))} />
                                <FormInput label="Min" type="number" value={editForm.min_stock} onChange={(e) => setEditForm((c) => ({ ...c, min_stock: e.target.value }))} />
                                <div />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormInput label="Unit/Scan (IN)" type="number" value={editForm.unit_per_scan_in} onChange={(e) => setEditForm((c) => ({ ...c, unit_per_scan_in: e.target.value }))} />
                                <FormInput label="Unit/Scan (OUT)" type="number" value={editForm.unit_per_scan} onChange={(e) => setEditForm((c) => ({ ...c, unit_per_scan: e.target.value }))} />
                            </div>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button type="button" onClick={() => setEditingDrug(null)} className="flex-1 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void handleSaveEdit()} className="flex-1 rounded-md bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800">Save</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Adjust Stock Modal — portal */}
            {adjustDrug && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl">
                        <div className="mb-4 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-slate-900">Stock Adjustment</h3>
                                <p className="text-sm text-slate-500">{adjustDrug.drug_name}</p>
                            </div>
                            <button type="button" onClick={() => setAdjustDrug(null)} className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500"><X className="size-4" /></button>
                        </div>
                        <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-center text-sm">
                            <div><div className="text-xs text-slate-500">Current</div><div className="text-2xl font-bold text-slate-900">{adjustDrug.current_stock}</div></div>
                            <div>
                                <div className="text-xs text-slate-500">After</div>
                                <div className={`text-2xl font-bold ${Number(adjustCount) > Number(adjustDrug.current_stock) ? 'text-emerald-600' : Number(adjustCount) < Number(adjustDrug.current_stock) ? 'text-red-600' : 'text-slate-900'}`}>
                                    {adjustCount !== '' ? adjustCount : '—'}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <FormInput label="Actual stock count" type="number" value={adjustCount} onChange={(e) => setAdjustCount(e.target.value)} />
                            <div>
                                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                                    เหตุผล <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="เช่น นับสต็อกจริง, ของหมดอายุ, ปรับแก้ข้อมูล"
                                    value={adjustRemark}
                                    onChange={(e) => { setAdjustRemark(e.target.value); setAdjustError('') }}
                                    className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition"
                                />
                                {adjustError && <p className="mt-1 text-xs text-red-600">{adjustError}</p>}
                            </div>
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => { setAdjustDrug(null); setAdjustError('') }} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void handleAdjust()} disabled={adjustCount === ''}
                                className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-300">Confirm</button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
            {/* Delete confirmation */}
            {confirmDeleteDrug && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-xs rounded-xl bg-white p-5 shadow-2xl">
                        <div className="mb-1 flex items-center gap-2 text-red-600">
                            <Trash2 className="size-4" />
                            <span className="font-bold text-sm">ลบรายการยา</span>
                        </div>
                        <p className="mb-4 text-sm text-slate-600">
                            ยืนยันลบ <span className="font-semibold">{confirmDeleteDrug.drug_name}</span>?<br />
                            <span className="text-xs text-slate-400">การกระทำนี้ไม่สามารถเรียกคืนได้</span>
                        </p>
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setConfirmDeleteDrug(null)}
                                className="flex-1 rounded-lg border border-slate-200 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                Cancel
                            </button>
                            <button type="button" onClick={() => void handleDelete(confirmDeleteDrug)}
                                className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700">
                                Delete
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Adjust Log Modal */}
            {showAdjustLog && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="flex w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl" style={{ maxHeight: 'calc(100vh - 3rem)' }}>
                        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                            <div className="flex items-center gap-2">
                                <ClipboardList className="size-4 text-violet-600" />
                                <h3 className="font-semibold text-slate-900">Stock Adjust Log</h3>
                                <span className="rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-semibold text-violet-700">ประวัติการปรับสต็อก</span>
                            </div>
                            <button type="button" onClick={() => setShowAdjustLog(false)}
                                className="inline-flex size-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50">
                                <X className="size-4" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5">
                            {adjustLogsLoading ? (
                                <p className="text-center text-sm text-slate-400 py-8">Loading…</p>
                            ) : adjustLogs.length === 0 ? (
                                <p className="text-center text-sm text-slate-400 py-8">ยังไม่มีประวัติการปรับสต็อก</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-slate-200 bg-slate-50 text-left">
                                                <th className="px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">วันที่</th>
                                                <th className="px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Barcode</th>
                                                <th className="px-3 py-2.5 text-xs font-semibold uppercase text-slate-500 text-right">จำนวน</th>
                                                <th className="px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">Action</th>
                                                <th className="px-3 py-2.5 text-xs font-semibold uppercase text-slate-500">ผู้ปรับ / เหตุผล</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {adjustLogs.map((log) => {
                                                const match = log.created_by.match(/^(.+?)\s*\[adjust:\s*(.+)\]$/)
                                                const who = match ? match[1] : log.created_by
                                                const reason = match ? match[2] : ''
                                                return (
                                                    <tr key={log.id} className="hover:bg-slate-50">
                                                        <td className="px-3 py-2.5 text-xs text-slate-500 tabular-nums whitespace-nowrap">
                                                            {new Date(log.created_at).toLocaleString('th-TH', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="px-3 py-2.5 font-mono text-xs text-slate-700">{log.barcode}</td>
                                                        <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                                                            <span className={log.action === 'IN' ? 'text-emerald-600' : 'text-red-600'}>
                                                                {log.action === 'IN' ? '+' : '-'}{log.qty}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-bold ${log.action === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                                                {log.action}
                                                            </span>
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            <div className="font-medium text-slate-900">{who}</div>
                                                            {reason && <div className="text-xs text-slate-500">{reason}</div>}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </PageLayout>
    )
}

export default Inventory
