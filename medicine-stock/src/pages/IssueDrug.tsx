import { Backpack, ChevronLeft, PackageMinus, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import BarcodeInput from '../components/BarcodeInput'
import Card from '../components/Card'
import PageLayout from '../components/PageLayout'
import { getCreatedBy, isSupervisor } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void }
type CartItem = { drug: Drug; qty: number }
type Step = 'bag' | 'form' | 'scan'
type BagType = 'FAK' | 'EMK'
type EqCheck = { item: string; checked: boolean; remark: string }

const EMK_EQUIPMENT: string[] = [
    'Sphygmomanometer (Blood Pressure Monitor)',
    'Stethoscope',
    'Battery AA',
    'Battery AAA',
    'Battery CR2032',
    'Flashlight',
    'Blood Glucose Monitoring System',
    'Pulse Oximeter',
]

type DispatchForm = {
    order_no: string
    serial_no: string
    equipment_no: string
    seal_number: string
    type: string
    status: 'OPEN' | 'CLOSE'
    cause_1: 'Use' | 'Expire' | 'Damage' | ''
    cause_2: string
    date_in: string
    date_out: string
    expiry_date: string
    repacked_by: string
    checked_by: string
}

function makeEmptyForm(): DispatchForm {
    const nextYear = new Date()
    nextYear.setFullYear(nextYear.getFullYear() + 1)
    return {
        order_no: '',
        serial_no: '',
        equipment_no: '',
        seal_number: '',
        type: '',
        status: 'OPEN',
        cause_1: '',
        cause_2: '',
        date_in: '',
        date_out: '',
        expiry_date: '',
        repacked_by: '',
        checked_by: '',
    }
}

const ISSUE_DRAFT_KEY = 'medstock_issue_draft'

function saveDraft(step: Step, bagType: BagType | null, form: DispatchForm, cart: CartItem[], eqChecks: EqCheck[]) {
    sessionStorage.setItem(ISSUE_DRAFT_KEY, JSON.stringify({ step, bagType, form, cart, eqChecks }))
}

function loadDraft(): { step: Step; bagType: BagType | null; form: DispatchForm; cart: CartItem[]; eqChecks: EqCheck[] } | null {
    try {
        const raw = sessionStorage.getItem(ISSUE_DRAFT_KEY)
        return raw ? JSON.parse(raw) : null
    } catch { return null }
}

function clearDraft() {
    sessionStorage.removeItem(ISSUE_DRAFT_KEY)
}

function IssueDrug({ onLogout }: PageProps) {
    const { location } = useLocation()
    const draft = loadDraft()
    const [step, setStep] = useState<Step>(draft?.step ?? 'bag')
    const [bagType, setBagType] = useState<BagType | null>(draft?.bagType ?? null)
    const [form, setForm] = useState<DispatchForm>(draft?.form ?? makeEmptyForm())
    const [formError, setFormError] = useState('')

    const [barcode, setBarcode] = useState('')
    const [cart, setCart] = useState<CartItem[]>(draft?.cart ?? [])
    const [scanMsg, setScanMsg] = useState('')
    const [confirmMsg, setConfirmMsg] = useState('')
    const [confirming, setConfirming] = useState(false)
    const [suggestions, setSuggestions] = useState<Drug[]>([])
    const [eqChecks, setEqChecks] = useState<EqCheck[]>(draft?.eqChecks ?? [])
    const barcodeRef = useRef<HTMLInputElement>(null)

    // Save draft only when on scan step (to preserve cart when navigating away)
    useEffect(() => {
        if (step === 'scan') {
            saveDraft(step, bagType, form, cart, eqChecks)
        } else {
            clearDraft()
        }
    }, [step, bagType, form, cart, eqChecks])

    useEffect(() => {
        const hasLetter = /[a-zA-Z]/.test(barcode)
        if (!hasLetter || barcode.trim().length < 2 || !location) {
            setSuggestions([])
            return
        }
        const timer = setTimeout(async () => {
            const { data } = await supabase
                .from('drug_master')
                .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
                .eq('location_id', location.id)
                .ilike('drug_name', `%${barcode.trim()}%`)
                .limit(8)
            setSuggestions((data || []) as Drug[])
        }, 200)
        return () => clearTimeout(timer)
    }, [barcode, location])

    function handleBagSelect(type: BagType) {
        handleBagSelectAndSetType(type)
    }

    function handleFormNext() {
        setFormError('')
        if (!form.serial_no.trim()) { setFormError('S/N is required'); return }
        if (!form.equipment_no.trim()) { setFormError('EQ is required'); return }
        if (!form.date_in) { setFormError('In date is required'); return }
        setStep('scan')
    }

    function handleBagSelectAndSetType(type: BagType) {
        setBagType(type)
        setForm((prev) => ({ ...prev, type }))
        setEqChecks(type === 'EMK' ? EMK_EQUIPMENT.map((item) => ({ item, checked: false, remark: '' })) : [])
        setStep('form')
    }

    function setField<K extends keyof DispatchForm>(key: K, value: DispatchForm[K]) {
        setForm((prev) => ({ ...prev, [key]: value }))
    }

    async function handleBarcodeScan(code: string) {
        setScanMsg('')
        setConfirmMsg('')
        const trimmed = code.trim()
        if (!trimmed || !location) return

        const { data } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
            .eq('barcode', trimmed)
            .eq('location_id', location.id)
            .maybeSingle()

        if (!data) { setScanMsg(`ไม่พบยา: ${trimmed}`); return }
        const drug = data as Drug

        setCart((prev) => {
            const existing = prev.find((c) => c.drug.barcode === drug.barcode)
            if (existing) return prev.map((c) => c.drug.barcode === drug.barcode ? { ...c, qty: c.qty + 1 } : c)
            return [...prev, { drug, qty: 1 }]
        })
        setBarcode('')
        setScanMsg(`✓ ${drug.drug_name}`)
        setTimeout(() => setScanMsg(''), 2000)
        barcodeRef.current?.focus()
    }

    function updateQty(barcode: string, val: string) {
        const n = parseInt(val)
        if (!Number.isFinite(n) || n < 1) return
        setCart((prev) => prev.map((c) => c.drug.barcode === barcode ? { ...c, qty: n } : c))
    }

    function removeItem(barcode: string) {
        setCart((prev) => prev.filter((c) => c.drug.barcode !== barcode))
    }

    async function handleConfirm() {
        if (cart.length === 0 || !location || !bagType || confirming) return
        setConfirming(true)
        setConfirmMsg('')

        // Fetch live stock for all items before deducting
        const barcodes = cart.map((c) => c.drug.barcode)
        const { data: liveData } = await supabase
            .from('drug_master')
            .select('id, barcode, current_stock, unit_per_scan')
            .eq('location_id', location.id)
            .in('barcode', barcodes)

        const liveMap = Object.fromEntries(
            ((liveData || []) as { id: number; barcode: string; current_stock: number; unit_per_scan: number }[])
                .map((d) => [d.barcode, d])
        )

        for (const item of cart) {
            const live = liveMap[item.drug.barcode]
            const totalQty = item.qty * Number(live?.unit_per_scan ?? item.drug.unit_per_scan ?? 1)
            if (!live || Number(live.current_stock) < totalQty) {
                setConfirmMsg(`สต็อกไม่พอ: ${item.drug.drug_name} (มี ${live?.current_stock ?? 0}, ต้องการ ${totalQty})`)
                setConfirming(false)
                return
            }
        }

        // Insert bag_dispatch record
        const { data: dispatchData, error: dispatchError } = await supabase
            .from('bag_dispatch')
            .insert([{
                bag_type: bagType,
                order_no: form.order_no.trim() || null,
                serial_no: form.serial_no.trim(),
                equipment_no: form.equipment_no.trim(),
                seal_number: form.seal_number.trim() || null,
                type: form.type.trim() || null,
                status: form.status,
                cause_1: form.cause_1 || null,
                cause_2: form.cause_2.trim() || null,
                date_in: form.date_in || null,
                date_out: form.date_out || null,
                expiry_date: form.expiry_date || null,
                repacked_by: form.repacked_by.trim() || null,
                checked_by: form.checked_by.trim() || null,
                location_id: location.id,
                created_by: getCreatedBy(),
            }])
            .select('id')
            .single()

        if (dispatchError || !dispatchData) {
            setConfirmMsg('บันทึก Dispatch ล้มเหลว: ' + (dispatchError?.message ?? 'unknown'))
            setConfirming(false)
            return
        }

        const dispatchId = (dispatchData as { id: number }).id

        // Insert bag_dispatch_drug rows + deduct stock using live values
        for (const item of cart) {
            const live = liveMap[item.drug.barcode]
            const totalQty = item.qty * Number(live?.unit_per_scan ?? item.drug.unit_per_scan ?? 1)
            await supabase.from('bag_dispatch_drug').insert([{
                dispatch_id: dispatchId,
                barcode: item.drug.barcode,
                drug_name: item.drug.drug_name,
                qty: totalQty,
            }])
            await supabase.from('drug_master')
                .update({ current_stock: Number(live.current_stock) - totalQty })
                .eq('id', live.id)
            await supabase.from('stock_transaction').insert([{
                barcode: item.drug.barcode, qty: totalQty, action: 'OUT',
                created_by: getCreatedBy(), location_id: location.id,
            }])
        }

        // Save EMK equipment checklist
        if (bagType === 'EMK' && eqChecks.length > 0) {
            await supabase.from('emk_equipment_check').insert(
                eqChecks.map((c, i) => ({
                    dispatch_id: dispatchId,
                    item_name: c.item,
                    checked: c.checked,
                    remark: c.remark.trim() || null,
                    sort_order: i,
                }))
            )
        }

        setConfirmMsg(`✓ บันทึก Bag Log สำเร็จ — ${bagType} S/N ${form.serial_no}`)
        setCart([])
        setEqChecks([])
        setConfirming(false)
        setTimeout(() => {
            setStep('bag')
            setBagType(null)
            setForm(makeEmptyForm())
            clearDraft()
            setConfirmMsg('')
        }, 2500)
    }

    const totalItems = cart.reduce((s, c) => s + c.qty * Number(c.drug.unit_per_scan || 1), 0)
    const hasCart = cart.length > 0

    // Step: Bag select
    if (step === 'bag') {
        const bags = [
            {
                type: 'FAK' as BagType,
                label: 'First Aid Kit',
                desc: 'General first aid supplies and basic medications for minor injuries and illnesses.',
                bg: 'linear-gradient(160deg, #0f766e 0%, #0d5c57 100%)',
                accent: 'bg-teal-500/20 border-teal-400/30',
                tag: 'bg-teal-500/30 text-teal-100',
            },
            {
                type: 'EMK' as BagType,
                label: 'Emergency Medical Kit',
                desc: 'Advanced medications and equipment for emergency response and critical care situations.',
                bg: 'linear-gradient(160deg, #2563eb 0%, #1e3a8a 100%)',
                accent: 'bg-blue-500/20 border-blue-400/30',
                tag: 'bg-blue-500/30 text-blue-100',
            },
        ]
        return (
            <PageLayout title="Out Stock" subtitle="Select a bag type to start packing" onLogout={onLogout}>
                <div className="flex min-h-[70vh] flex-col items-center justify-center">
                    <div className="mb-8 text-center">
                        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-500 shadow-sm">
                            <span className="size-1.5 rounded-full bg-teal-500 animate-pulse inline-block" />
                            Step 1 of 3 — Choose Bag Type
                        </div>
                        <h2 className="mt-4 text-2xl font-bold text-slate-900">Which bag are you packing?</h2>
                        <p className="mt-1.5 text-sm text-slate-400">Choose a bag, fill in the bag info, then scan drugs to pack.</p>
                    </div>

                    <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
                        {bags.map(({ type, label, desc, bg, tag }) => (
                            <button key={type} type="button" onClick={() => handleBagSelect(type)}
                                className="group relative overflow-hidden rounded-3xl p-6 text-left text-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl active:scale-[0.98]"
                                style={{ background: bg }}>
                                {/* decorative circle */}
                                <div className="pointer-events-none absolute -right-8 -top-8 size-36 rounded-full bg-white/5" />
                                <div className="pointer-events-none absolute -bottom-10 -left-6 size-28 rounded-full bg-white/5" />

                                <div className="relative">
                                    <div className="mb-4 inline-flex size-14 items-center justify-center rounded-2xl bg-white/20">
                                        <Backpack className="size-7 transition-transform duration-300 group-hover:scale-110" />
                                    </div>

                                    <div className="mb-1 flex items-center gap-2">
                                        <span className="text-2xl font-black tracking-wide">{type}</span>
                                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${tag}`}>{type === 'FAK' ? 'First Aid' : 'Emergency'}</span>
                                    </div>
                                    <p className="mb-4 text-sm font-semibold text-white/80">{label}</p>
                                    <p className="text-xs leading-relaxed text-white/55">{desc}</p>

                                    <div className="mt-6 flex items-center gap-1.5 text-xs font-semibold text-white/70 transition-all duration-300 group-hover:gap-2.5 group-hover:text-white">
                                        Select &amp; Continue
                                        <svg className="size-3.5" fill="none" viewBox="0 0 16 16"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </PageLayout>
        )
    }

    // Step: Dispatch form
    if (step === 'form') {
        return (
            <PageLayout title="Out Stock" subtitle={`${bagType} — Fill in bag information`} onLogout={onLogout}>
                <button type="button" onClick={() => setStep('bag')}
                    className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
                    <ChevronLeft className="size-4" /> Change bag type
                </button>
                <div className="flex justify-center">
                <Card className="p-5 w-full max-w-lg">
                    <div className="mb-4 flex items-center gap-2">
                        <Backpack className="size-5 text-teal-600" />
                        <span className="font-semibold text-slate-800">{bagType} Bag Info</span>
                    </div>
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Order No" value={form.order_no} onChange={(v) => setField('order_no', v)} placeholder="เลขที่ใบสั่ง" />
                            <Field label="S/N *" value={form.serial_no} onChange={(v) => setField('serial_no', v)} placeholder="Serial Number" required />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="EQ *" value={form.equipment_no} onChange={(v) => setField('equipment_no', v)} placeholder="Equipment No" required />
                            <Field label="Seal Number" value={form.seal_number} onChange={(v) => setField('seal_number', v)} placeholder="Seal No" />
                        </div>
                        <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
                            <select value={form.status} onChange={(e) => setField('status', e.target.value as 'OPEN' | 'CLOSE')}
                                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none">
                                <option value="OPEN">OPEN</option>
                                <option value="CLOSE">CLOSE</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">1 Cause</label>
                                <select value={form.cause_1} onChange={(e) => setField('cause_1', e.target.value as 'Use' | 'Expire' | 'Damage' | '')}
                                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none">
                                    <option value="">-- เลือก --</option>
                                    <option value="Use">Used</option>
                                    <option value="Expire">Expired</option>
                                    <option value="Damage">Damaged</option>
                                </select>
                            </div>
                            <div>
                                <label className="mb-1 block text-sm font-medium text-slate-700">2 Cause</label>
                                <select value={form.cause_2} onChange={(e) => setField('cause_2', e.target.value)}
                                    className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none">
                                    <option value="">None</option>
                                    <option value="Expired">Expired</option>
                                    <option value="Damaged">Damaged</option>
                                    <option value="Expired & Damaged">Expired &amp; Damaged</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Received Date *" type="date" value={form.date_in} onChange={(v) => setField('date_in', v)} required />
                            <Field label="Released Date" type="date" value={form.date_out} onChange={(v) => {
                                setField('date_out', v)
                                if (v) {
                                    const d = new Date(v)
                                    d.setDate(d.getDate() + 365)
                                    setField('expiry_date', d.toISOString().slice(0, 10))
                                }
                            }} />
                        </div>
                        <Field label="Expiry Date" type="date" value={form.expiry_date} onChange={(v) => setField('expiry_date', v)} />
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Repacked By" value={form.repacked_by} onChange={(v) => setField('repacked_by', v)} placeholder="ชื่อผู้บรรจุ" />
                            <Field label="Checked By" value={form.checked_by} onChange={(v) => setField('checked_by', v)} placeholder="ชื่อผู้ตรวจ" />
                        </div>

                        {/* EMK Equipment Checklist */}
                        {bagType === 'EMK' && eqChecks.length > 0 && (
                            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
                                <div className="mb-3 flex items-center gap-2">
                                    <span className="inline-flex h-5 items-center rounded px-1.5 text-[10px] font-bold bg-blue-100 text-blue-700">EMK</span>
                                    <span className="text-sm font-semibold text-blue-900">Equipment Checklist</span>
                                    <span className="ml-auto text-[11px] text-blue-500">
                                        {eqChecks.filter(c => c.checked).length}/{eqChecks.length} checked
                                    </span>
                                </div>
                                <div className="space-y-2.5">
                                    {eqChecks.map((eq, i) => (
                                        <div key={eq.item} className="rounded-lg border border-blue-100 bg-white p-3">
                                            <label className="flex items-start gap-3 cursor-pointer">
                                                <div className="mt-0.5 shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={eq.checked}
                                                        onChange={(e) => setEqChecks((prev) =>
                                                            prev.map((c, idx) => idx === i ? { ...c, checked: e.target.checked } : c)
                                                        )}
                                                        className="size-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-medium leading-snug ${eq.checked ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                                        {eq.item}
                                                    </div>
                                                    <input
                                                        type="text"
                                                        value={eq.remark}
                                                        onChange={(e) => setEqChecks((prev) =>
                                                            prev.map((c, idx) => idx === i ? { ...c, remark: e.target.value } : c)
                                                        )}
                                                        placeholder="Remark…"
                                                        className="mt-1.5 h-7 w-full rounded-md border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100 transition"
                                                    />
                                                </div>
                                            </label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formError && (
                            <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</div>
                        )}

                        <button type="button" onClick={handleFormNext}
                            className="h-11 w-full rounded-xl text-sm font-semibold text-white"
                            style={{ background: 'linear-gradient(160deg, #0f766e 0%, #1e3a5f 100%)' }}>
                            ถัดไป — สแกนยา
                        </button>
                    </div>
                </Card>
                </div>
            </PageLayout>
        )
    }

    // Step: Scan + cart
    const supervisor = isSupervisor()

    return (
        <PageLayout title="Out Stock" subtitle={`กระเป๋า ${bagType} · S/N ${form.serial_no}`} onLogout={onLogout}>
            {supervisor && (
                <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-medium">
                    👁 View Only — Supervisor ไม่มีสิทธิ์จ่ายยาออก
                </div>
            )}
            <button type="button" onClick={() => setStep('form')}
                className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
                <ChevronLeft className="size-4" /> แก้ไขข้อมูล
            </button>

            <div className={`space-y-4 ${hasCart ? 'pb-28 lg:pb-0' : ''}`}>
                <Card className="p-4">
                    <div className="relative">
                        <BarcodeInput
                            ref={barcodeRef}
                            label="Scan Barcode"
                            placeholder="สแกนหรือพิมพ์ barcode หรือชื่อยา แล้วกด Enter"
                            value={barcode}
                            onChange={(v) => { setBarcode(v); setScanMsg('') }}
                            onScan={(code) => { setSuggestions([]); void handleBarcodeScan(code) }}
                        />
                        {suggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                {suggestions.map((drug) => (
                                    <button
                                        key={drug.id}
                                        type="button"
                                        onMouseDown={(e) => {
                                            e.preventDefault()
                                            setSuggestions([])
                                            setBarcode('')
                                            void handleBarcodeScan(drug.barcode)
                                        }}
                                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-slate-50"
                                    >
                                        <span className="text-sm font-medium text-slate-900">{drug.drug_name}</span>
                                        <span className="shrink-0 text-xs text-slate-400">คงเหลือ {drug.current_stock}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {scanMsg && (
                        <div className={`mt-2.5 rounded-md px-3 py-2 text-sm ${scanMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {scanMsg}
                        </div>
                    )}
                </Card>

                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                    {hasCart ? (
                        <Card className="overflow-hidden p-0">
                            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                                <span className="text-sm font-semibold text-slate-700">รายการที่จะจ่าย</span>
                                <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-700">{cart.length} รายการ</span>
                            </div>
                            <div className="divide-y divide-slate-100">
                                {cart.map((item) => {
                                    const total = item.qty * Number(item.drug.unit_per_scan || 1)
                                    return (
                                        <div key={item.drug.barcode} className="px-4 py-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-medium text-slate-900 leading-snug">{item.drug.drug_name}</div>
                                                    <div className="mt-0.5 text-xs text-slate-400">{item.drug.barcode} · สต็อก {item.drug.current_stock}</div>
                                                </div>
                                                <button type="button" onClick={() => removeItem(item.drug.barcode)}
                                                    className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                    <Trash2 className="size-3.5" />
                                                </button>
                                            </div>
                                            <div className="mt-2.5 flex items-center gap-2">
                                                <span className="text-xs text-slate-500">จำนวนสแกน</span>
                                                <input
                                                    type="number" min="1" value={item.qty}
                                                    onChange={(e) => updateQty(item.drug.barcode, e.target.value)}
                                                    className="h-8 w-16 rounded-md border border-slate-300 px-2 text-center text-sm"
                                                />
                                                <span className="ml-auto rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                                                    = {total} หน่วย
                                                </span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </Card>
                    ) : (
                        <Card className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                            <PackageMinus className="size-8 opacity-30" />
                            <p className="text-sm">ยังไม่มีรายการ — สแกน barcode เพื่อเพิ่มยา</p>
                        </Card>
                    )}

                    <div className="hidden lg:block">
                        <SummaryPanel
                            cart={cart}
                            totalItems={totalItems}
                            confirmMsg={confirmMsg}
                            confirming={confirming}
                            onConfirm={() => void handleConfirm()}
                            onClear={() => { setCart([]); setConfirmMsg('') }}
                            readOnly={supervisor}
                        />
                    </div>
                </div>
            </div>

            {hasCart && !supervisor && (
                <div className="fixed inset-x-0 bottom-16 z-30 px-4 pb-2 lg:hidden">
                    <div className="overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                        {confirmMsg && (
                            <div className={`px-4 py-2.5 text-sm ${confirmMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {confirmMsg}
                            </div>
                        )}
                        <div className="flex items-center gap-3 px-4 py-3">
                            <div className="flex-1">
                                <div className="text-xs text-slate-500">รายการ / หน่วยรวม</div>
                                <div className="text-base font-bold text-slate-900">
                                    {cart.length} รายการ · <span className="text-teal-700">{totalItems} หน่วย</span>
                                </div>
                            </div>
                            <button type="button" onClick={() => { setCart([]); setConfirmMsg('') }}
                                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600">
                                ล้าง
                            </button>
                            <button type="button" onClick={() => void handleConfirm()} disabled={confirming}
                                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                                style={{ background: 'linear-gradient(160deg, #0f766e 0%, #1e3a5f 100%)' }}>
                                <PackageMinus className="size-4" />
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

type FieldProps = {
    label: string
    value: string
    onChange: (v: string) => void
    placeholder?: string
    type?: string
    required?: boolean
}

function Field({ label, value, onChange, placeholder, type = 'text', required }: FieldProps) {
    return (
        <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
            <input
                type={type}
                value={value}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                required={required}
            />
        </div>
    )
}

type SummaryPanelProps = {
    cart: CartItem[]
    totalItems: number
    confirmMsg: string
    confirming: boolean
    onConfirm: () => void
    onClear: () => void
    readOnly?: boolean
}

function SummaryPanel({ cart, totalItems, confirmMsg, confirming, onConfirm, onClear, readOnly }: SummaryPanelProps) {
    return (
        <Card className="p-5">
            <div className="text-sm font-semibold text-slate-700">สรุปการจ่ายยา</div>
            <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3 text-center">
                    <div className="text-xs text-slate-500">รายการ</div>
                    <div className="text-2xl font-bold text-slate-900">{cart.length}</div>
                </div>
                <div className="rounded-xl bg-teal-50 p-3 text-center">
                    <div className="text-xs font-medium text-teal-600">หน่วยรวม</div>
                    <div className="text-2xl font-bold text-teal-700">{totalItems}</div>
                </div>
            </div>
            {confirmMsg && (
                <div className={`mt-3 rounded-md px-3 py-2 text-sm ${confirmMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                    {confirmMsg}
                </div>
            )}
            {!readOnly && (
                <>
                    <button type="button" onClick={onConfirm} disabled={cart.length === 0 || confirming}
                        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                        style={cart.length > 0 ? { background: 'linear-gradient(160deg, #0f766e 0%, #1e3a5f 100%)' } : undefined}>
                        <PackageMinus className="size-4" />Confirm Dispense All
                    </button>
                    {cart.length > 0 && (
                        <button type="button" onClick={onClear}
                            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                            ล้าง Cart
                        </button>
                    )}
                </>
            )}
        </Card>
    )
}

export default IssueDrug
