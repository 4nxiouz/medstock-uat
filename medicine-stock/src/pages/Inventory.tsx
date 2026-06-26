import { AlertTriangle, Boxes, Download, ImagePlus, Package, Pencil, Pill, Printer, SlidersHorizontal, Trash2, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import Barcode from 'react-barcode'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import SearchInput from '../components/SearchInput'
import StatCard from '../components/StatCard'
import { getCreatedBy } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void; onSwitchLocation: () => void }
type EditForm = { drug_name: string; current_stock: string; min_stock: string; unit_per_scan: string }

function downloadCSV(drugs: Drug[], locationCode: string) {
    const header = ['Barcode', 'Name', 'Stock', 'Min Stock', 'Unit/Scan']
    const rows = drugs.map((d) => [d.barcode, d.drug_name, d.current_stock, d.min_stock, d.unit_per_scan].join(','))
    const csv = '﻿' + [header.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `inventory_${locationCode}_${new Date().toISOString().slice(0, 10)}.csv`; a.click()
    URL.revokeObjectURL(url)
}

function Inventory({ onLogout, onSwitchLocation }: PageProps) {
    const { location } = useLocation()
    const [drugs, setDrugs] = useState<Drug[]>([])
    const [search, setSearch] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [editingDrug, setEditingDrug] = useState<Drug | null>(null)
    const [editForm, setEditForm] = useState<EditForm>({ drug_name: '', current_stock: '', min_stock: '', unit_per_scan: '' })
    const [editImage, setEditImage] = useState<File | null>(null)
    const [adjustDrug, setAdjustDrug] = useState<Drug | null>(null)
    const [adjustCount, setAdjustCount] = useState('')
    const [adjustRemark, setAdjustRemark] = useState('')
    const [printDrug, setPrintDrug] = useState<Drug | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

    async function loadDrugs() {
        if (!location) return
        setLoading(true)
        const { data, error } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
            .eq('location_id', location.id)
            .order('drug_name')
        setLoading(false)
        if (!error) setDrugs((data || []) as Drug[])
    }

    useEffect(() => { void loadDrugs() }, [location])

    const filteredDrugs = useMemo(() => {
        const kw = search.toLowerCase()
        return drugs.filter((d) => d.drug_name.toLowerCase().includes(kw) || d.barcode.includes(search))
    }, [drugs, search])

    const lowStock = drugs.filter((d) => Number(d.current_stock) <= Number(d.min_stock))
    const totalStock = drugs.reduce((sum, d) => sum + Number(d.current_stock || 0), 0)

    function openEdit(drug: Drug) {
        setEditingDrug(drug)
        setEditImage(null)
        setEditForm({ drug_name: drug.drug_name, current_stock: String(drug.current_stock), min_stock: String(drug.min_stock), unit_per_scan: String(drug.unit_per_scan) })
    }

    async function handleSaveEdit() {
        if (!editingDrug) return
        setMessage('')
        let imageUrl = editingDrug.image_url || ''
        if (editImage) {
            const fileName = `${Date.now()}-${editImage.name}`
            const { error: upErr } = await supabase.storage.from('drug-image').upload(fileName, editImage)
            if (!upErr) {
                const { data } = supabase.storage.from('drug-image').getPublicUrl(fileName)
                imageUrl = data.publicUrl
            }
        }
        const { error } = await supabase.from('drug_master').update({
            drug_name: editForm.drug_name.trim(),
            current_stock: Number(editForm.current_stock),
            min_stock: Number(editForm.min_stock),
            unit_per_scan: Number(editForm.unit_per_scan),
            image_url: imageUrl,
        }).eq('id', editingDrug.id)
        if (error) { setMessage('Update failed.'); return }
        setDrugs((cur) => cur.map((d) => d.id === editingDrug.id ? { ...d, ...editForm, current_stock: Number(editForm.current_stock), min_stock: Number(editForm.min_stock), unit_per_scan: Number(editForm.unit_per_scan), image_url: imageUrl } : d))
        setEditingDrug(null)
        setMessage('Updated.')
    }

    async function handleDelete(id: number) {
        if (!window.confirm('Delete this item?')) return
        setMessage('')
        const { error } = await supabase.from('drug_master').delete().eq('id', id)
        if (error) { setMessage('Delete failed.'); return }
        setDrugs((cur) => cur.filter((d) => d.id !== id))
        setMessage('Deleted.')
    }

    async function handleAdjust() {
        if (!adjustDrug || !location) return
        const newStock = Number(adjustCount)
        if (!Number.isFinite(newStock) || newStock < 0) return
        const diff = newStock - Number(adjustDrug.current_stock)
        const { error } = await supabase.from('drug_master').update({ current_stock: newStock }).eq('id', adjustDrug.id)
        if (error) { setMessage('Adjust failed.'); return }
        if (diff !== 0) {
            await supabase.from('stock_transaction').insert([{
                barcode: adjustDrug.barcode,
                qty: Math.abs(diff),
                action: diff > 0 ? 'IN' : 'OUT',
                created_by: getCreatedBy() + (adjustRemark ? ` [${adjustRemark}]` : ' [adjust]'),
                location_id: location.id,
            }])
        }
        setDrugs((cur) => cur.map((d) => d.id === adjustDrug.id ? { ...d, current_stock: newStock } : d))
        setAdjustDrug(null)
        setAdjustCount('')
        setAdjustRemark('')
        setMessage(`Stock adjusted to ${newStock}.`)
    }

    function handlePrint(drug: Drug) {
        setPrintDrug(drug)
        setTimeout(() => window.print(), 100)
    }

    return (
        <PageLayout title="Inventory" subtitle={`All items at ${location?.name ?? '—'}`} onLogout={onLogout} onSwitchLocation={onSwitchLocation}>
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Items" value={drugs.length} tone="blue" icon={Package} />
                <StatCard title="Total Stock" value={totalStock} tone="green" icon={Boxes} />
                <StatCard title="Low Stock" value={lowStock.length} tone="red" icon={AlertTriangle} />
            </div>

            <Card className="mt-6 p-5">
                <div className="mb-5 flex flex-wrap items-center gap-3">
                    <div className="flex-1 min-w-[200px]"><SearchInput value={search} onChange={setSearch} placeholder="Search item or barcode" /></div>
                    <button type="button" onClick={() => downloadCSV(filteredDrugs, location?.code ?? 'export')}
                        className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 hover:bg-emerald-100">
                        <Download className="size-4" />CSV
                    </button>
                    {message && <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">{message}</div>}
                </div>

                {loading ? (
                    <div className="py-16 text-center text-sm text-slate-500">Loading...</div>
                ) : filteredDrugs.length === 0 ? (
                    <EmptyState title="No items found" />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredDrugs.map((drug) => {
                            const isLow = Number(drug.current_stock) <= Number(drug.min_stock)
                            return (
                                <article key={drug.id} className={`overflow-hidden rounded-xl border bg-white shadow-sm ${isLow ? 'border-red-200' : 'border-slate-200'}`}>
                                    <div className="aspect-[4/3] bg-slate-50">
                                        {drug.image_url ? (
                                            <img src={drug.image_url} alt={drug.drug_name} className="size-full object-cover" />
                                        ) : (
                                            <div className="flex size-full flex-col items-center justify-center text-slate-400">
                                                <Pill className="size-10" /><span className="mt-2 text-xs">No image</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold text-slate-950">{drug.drug_name}</h3>
                                                <p className="mt-1 break-all text-xs text-slate-500">{drug.barcode}</p>
                                            </div>
                                            {isLow && <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase text-red-700">Low</span>}
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            {[['Stock', drug.current_stock, isLow ? 'text-red-700' : 'text-slate-950'], ['Min', drug.min_stock, 'text-slate-950'], ['Unit', drug.unit_per_scan, 'text-slate-950']].map(([label, val, cls]) => (
                                                <div key={String(label)} className="rounded-md bg-slate-50 p-2">
                                                    <div className="text-[10px] uppercase text-slate-500">{label}</div>
                                                    <div className={`text-lg font-semibold ${cls}`}>{val}</div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="grid grid-cols-3 gap-1.5">
                                            <button type="button" onClick={() => openEdit(drug)} className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-200 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                                <Pencil className="size-3" />Edit
                                            </button>
                                            <button type="button" onClick={() => { setAdjustDrug(drug); setAdjustCount(String(drug.current_stock)); setAdjustRemark('') }}
                                                className="inline-flex items-center justify-center gap-1 rounded-md border border-amber-200 py-2 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                                                <SlidersHorizontal className="size-3" />Adjust
                                            </button>
                                            <button type="button" onClick={() => handlePrint(drug)}
                                                className="inline-flex items-center justify-center gap-1 rounded-md border border-blue-200 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50">
                                                <Printer className="size-3" />Print
                                            </button>
                                        </div>
                                        <button type="button" onClick={() => void handleDelete(drug.id)} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 py-2 text-xs font-semibold text-red-700 hover:bg-red-50">
                                            <Trash2 className="size-3" />Delete
                                        </button>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </Card>

            {/* Edit Modal */}
            {editingDrug && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
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
                            <div className="grid grid-cols-3 gap-3">
                                <FormInput label="Stock" type="number" value={editForm.current_stock} onChange={(e) => setEditForm((c) => ({ ...c, current_stock: e.target.value }))} />
                                <FormInput label="Min" type="number" value={editForm.min_stock} onChange={(e) => setEditForm((c) => ({ ...c, min_stock: e.target.value }))} />
                                <FormInput label="Unit" type="number" value={editForm.unit_per_scan} onChange={(e) => setEditForm((c) => ({ ...c, unit_per_scan: e.target.value }))} />
                            </div>
                            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-3 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50">
                                <ImagePlus className="size-4 text-slate-400 shrink-0" />
                                <span className="truncate">{editImage ? editImage.name : (editingDrug.image_url ? 'Replace image…' : 'Add image (optional)')}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => setEditImage(e.target.files?.[0] || null)} />
                            </label>
                        </div>
                        <div className="mt-5 flex gap-2">
                            <button type="button" onClick={() => setEditingDrug(null)} className="flex-1 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void handleSaveEdit()} className="flex-1 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Adjust Stock Modal */}
            {adjustDrug && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
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
                            <div><div className="text-xs text-slate-500">After</div>
                                <div className={`text-2xl font-bold ${Number(adjustCount) > Number(adjustDrug.current_stock) ? 'text-emerald-600' : Number(adjustCount) < Number(adjustDrug.current_stock) ? 'text-red-600' : 'text-slate-900'}`}>
                                    {adjustCount !== '' ? adjustCount : '—'}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-3">
                            <FormInput label="Actual stock count" type="number" value={adjustCount} onChange={(e) => setAdjustCount(e.target.value)} />
                            <FormInput label="Reason (optional)" placeholder="e.g. physical count, expired items removed" value={adjustRemark} onChange={(e) => setAdjustRemark(e.target.value)} />
                        </div>
                        <div className="mt-4 flex gap-2">
                            <button type="button" onClick={() => setAdjustDrug(null)} className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-semibold text-slate-700">Cancel</button>
                            <button type="button" onClick={() => void handleAdjust()} disabled={adjustCount === ''}
                                className="flex-1 rounded-lg bg-amber-600 py-2.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:bg-slate-300">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Print single label — hidden until print */}
            {printDrug && (
                <div ref={printRef} className="hidden print:block print:text-center">
                    <div style={{ fontWeight: 700, fontSize: '11pt', marginBottom: '3mm' }}>{printDrug.drug_name}</div>
                    <Barcode value={printDrug.barcode} format="CODE128" height={56} displayValue fontSize={10} />
                    <div style={{ fontSize: '9pt', color: '#555', marginTop: '2mm' }}>{location?.code}</div>
                </div>
            )}
        </PageLayout>
    )
}

export default Inventory
