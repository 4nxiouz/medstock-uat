import { PackagePlus, Printer, Trash2, Wand2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import Barcode from 'react-barcode'
import BarcodeInput from '../components/BarcodeInput'
import Card from '../components/Card'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import { getCreatedBy } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void }
type Tab = 'restock' | 'new'
type CartItem = { drug: Drug; qty: number }

function generateBarcode() {
    return 'MED' + String(Date.now()).slice(-8)
}

function ReceiveDrug({ onLogout }: PageProps) {
    const { location } = useLocation()
    const [tab, setTab] = useState<Tab>('restock')

    // Restock cart
    const [rsBarcode, setRsBarcode] = useState('')
    const [rsCart, setRsCart] = useState<CartItem[]>([])
    const [rsScanMsg, setRsScanMsg] = useState('')
    const [rsConfirmMsg, setRsConfirmMsg] = useState('')
    const [rsConfirming, setRsConfirming] = useState(false)
    const rsInputRef = useRef<HTMLInputElement>(null)

    const [newBarcode, setNewBarcode] = useState('')
    const [newName, setNewName] = useState('')
    const [newMinStock, setNewMinStock] = useState('5')
    const [newUnitPerScan, setNewUnitPerScan] = useState('1')
    const [newUnitPerScanIn, setNewUnitPerScanIn] = useState('1')
    const [newInitQty, setNewInitQty] = useState('1')
    const [newCategory, setNewCategory] = useState('')
    const [newMessage, setNewMessage] = useState('')
    const [registeredBarcode, setRegisteredBarcode] = useState('')
    const [registeredName, setRegisteredName] = useState('')
    const [categoryOptions, setCategoryOptions] = useState<string[]>([])

    useEffect(() => {
        if (!location) return
        supabase.from('drug_master').select('category').eq('location_id', location.id)
            .then(({ data }) => {
                const cats = Array.from(new Set((data || []).map((d: { category: string | null }) => d.category).filter(Boolean))) as string[]
                setCategoryOptions(cats.sort())
            })
    }, [location])

    async function handleRsScan(code: string) {
        setRsScanMsg('')
        setRsConfirmMsg('')
        const trimmed = code.trim()
        if (!trimmed || !location) return

        const { data } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, unit_per_scan_in, image_url')
            .eq('barcode', trimmed)
            .eq('location_id', location.id)
            .maybeSingle()

        if (!data) {
            setRsScanMsg(`ไม่พบยา: ${trimmed} — ใช้แท็บ "New Medicine" เพื่อลงทะเบียน`)
            return
        }
        const drug = data as Drug
        setRsCart((prev) => {
            const existing = prev.find((c) => c.drug.barcode === drug.barcode)
            if (existing) return prev.map((c) => c.drug.barcode === drug.barcode ? { ...c, qty: c.qty + 1 } : c)
            return [...prev, { drug, qty: 1 }]
        })
        setRsBarcode('')
        setRsScanMsg(`✓ ${drug.drug_name} เพิ่มลง cart`)
        setTimeout(() => setRsScanMsg(''), 2000)
        rsInputRef.current?.focus()
    }

    function updateRsQty(barcode: string, val: string) {
        const n = parseInt(val)
        if (!Number.isFinite(n) || n < 1) return
        setRsCart((prev) => prev.map((c) => c.drug.barcode === barcode ? { ...c, qty: n } : c))
    }

    async function handleConfirmRestock() {
        if (rsCart.length === 0) return
        setRsConfirming(true)
        setRsConfirmMsg('')
        for (const item of rsCart) {
            const totalAdd = item.qty * Number(item.drug.unit_per_scan_in ?? item.drug.unit_per_scan ?? 1)
            const newStock = Number(item.drug.current_stock) + totalAdd
            await supabase.from('drug_master').update({ current_stock: newStock }).eq('id', item.drug.id)
            await supabase.from('stock_transaction').insert([{
                barcode: item.drug.barcode, qty: totalAdd, action: 'IN',
                created_by: getCreatedBy(), location_id: location?.id,
            }])
        }
        setRsConfirmMsg(`✓ รับยาสำเร็จ ${rsCart.length} รายการ`)
        setRsCart([])
        setRsConfirming(false)
        rsInputRef.current?.focus()
    }

    async function handleRegister() {
        setNewMessage('')
        setRegisteredBarcode('')
        if (!location) return

        const code = newBarcode.trim()
        if (!code || !newName.trim()) { setNewMessage('Barcode and medicine name are required.'); return }

        const { data: existing } = await supabase.from('drug_master').select('id').eq('barcode', code).eq('location_id', location.id).maybeSingle()
        if (existing) { setNewMessage('This barcode already exists at this location.'); return }

        const { error } = await supabase.from('drug_master').insert([{
            barcode: code,
            drug_name: newName.trim(),
            current_stock: Number(newInitQty) * Number(newUnitPerScanIn || 1),
            min_stock: Number(newMinStock || 0),
            unit_per_scan: Number(newUnitPerScan || 1),
            unit_per_scan_in: Number(newUnitPerScanIn || 1),
            location_id: location.id,
            category: newCategory.trim() || null,
        }])

        if (error) { setNewMessage('Registration failed: ' + error.message); return }

        await supabase.from('stock_transaction').insert([{
            barcode: code, qty: Number(newInitQty) * Number(newUnitPerScan),
            action: 'IN', created_by: getCreatedBy(), location_id: location.id,
        }])

        setRegisteredBarcode(code)
        setRegisteredName(newName.trim())
        setNewBarcode('')
        setNewName('')
        setNewCategory('')
        setNewMinStock('5')
        setNewUnitPerScan('1')
        setNewUnitPerScanIn('1')
        setNewInitQty('1')
    }

    const totalNew = Number(newInitQty || 0) * Number(newUnitPerScanIn || 1)
    const rsTotalUnits = rsCart.reduce((s, c) => s + c.qty * Number(c.drug.unit_per_scan || 1), 0)

    return (
        <PageLayout title="In Stock" subtitle="สแกนยาหลายรายการ แล้วกด Confirm ครั้งเดียว" onLogout={onLogout}>
            <div className="mb-5 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
                {(['restock', 'new'] as Tab[]).map((t) => (
                    <button key={t} type="button" onClick={() => setTab(t)}
                        className={`rounded-md px-5 py-2 text-sm font-semibold transition ${tab === t ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}>
                        {t === 'restock' ? 'Restock' : 'New Medicine'}
                    </button>
                ))}
            </div>

            {tab === 'restock' && (
                <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                    <div className="space-y-4">
                        <Card className="p-5">
                            <BarcodeInput ref={rsInputRef} label="Scan Barcode" placeholder="สแกนหรือพิมพ์ barcode แล้วกด Enter" value={rsBarcode} onChange={setRsBarcode} onScan={(code) => void handleRsScan(code)} />
                            {rsScanMsg && (
                                <div className={`mt-3 rounded-md px-3 py-2 text-sm ${rsScanMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                    {rsScanMsg}
                                </div>
                            )}
                        </Card>
                        {rsCart.length > 0 && (
                            <Card className="overflow-hidden p-0">
                                <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                                    รายการที่จะรับเข้า ({rsCart.length} รายการ)
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {rsCart.map((item) => {
                                        const total = item.qty * Number(item.drug.unit_per_scan_in ?? item.drug.unit_per_scan ?? 1)
                                        return (
                                            <div key={item.drug.barcode} className="flex items-center gap-3 px-5 py-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="truncate font-medium text-slate-900">{item.drug.drug_name}</div>
                                                    <div className="text-xs text-slate-400">{item.drug.barcode} · สต็อกปัจจุบัน {item.drug.current_stock}</div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-xs text-slate-500">จำนวนสแกน</span>
                                                    <input type="number" min="1" value={item.qty}
                                                        onChange={(e) => updateRsQty(item.drug.barcode, e.target.value)}
                                                        className="h-8 w-16 rounded-md border border-slate-300 px-2 text-center text-sm" />
                                                    <span className="w-20 text-right text-sm font-semibold text-slate-700">= {total} หน่วย</span>
                                                    <button type="button" onClick={() => setRsCart((p) => p.filter((c) => c.drug.barcode !== item.drug.barcode))}
                                                        className="inline-flex size-7 items-center justify-center rounded-md text-slate-400 hover:bg-red-50 hover:text-red-600">
                                                        <Trash2 className="size-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </Card>
                        )}
                    </div>
                    <Card className="p-5 h-fit">
                        <div className="text-sm font-medium text-slate-500">สรุปการรับยา</div>
                        <div className="mt-4 rounded-md bg-slate-50 p-3 text-center">
                            <div className="text-xs text-slate-500">จำนวนรายการ</div>
                            <div className="text-3xl font-bold text-slate-900">{rsCart.length}</div>
                        </div>
                        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-center">
                            <div className="text-xs font-medium text-emerald-600">หน่วยที่รับทั้งหมด</div>
                            <div className="text-3xl font-bold text-emerald-700">{rsTotalUnits}</div>
                        </div>
                        {rsConfirmMsg && (
                            <div className={`mt-3 rounded-md px-3 py-2 text-sm ${rsConfirmMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {rsConfirmMsg}
                            </div>
                        )}
                        <button type="button" onClick={() => void handleConfirmRestock()}
                            disabled={rsCart.length === 0 || rsConfirming}
                            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                            <PackagePlus className="size-4" />Confirm Restock All
                        </button>
                        {rsCart.length > 0 && (
                            <button type="button" onClick={() => { setRsCart([]); setRsConfirmMsg('') }}
                                className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                                ล้าง Cart
                            </button>
                        )}
                    </Card>
                </div>
            )}

            {tab === 'new' && (
                <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                    <Card className="p-5 space-y-4">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">Barcode Code</label>
                            <div className="flex gap-2">
                                <input className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                                    placeholder="Enter or auto-generate" value={newBarcode} onChange={(e) => setNewBarcode(e.target.value)} />
                                <button type="button" onClick={() => setNewBarcode(generateBarcode())}
                                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-4 text-sm font-semibold text-teal-700 hover:bg-teal-100">
                                    <Wand2 className="size-4" />Generate
                                </button>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-400">This code will be the barcode label on the cabinet.</p>
                        </div>
                        <FormInput label="Medicine Name" placeholder="e.g. Paracetamol 500mg" value={newName} onChange={(e) => setNewName(e.target.value)} />
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-slate-700">Category (หมวดยา)</label>
                            <input
                                list="rx-category-options"
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                                placeholder="เลือกหรือพิมพ์หมวดยา"
                                className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                            />
                            <datalist id="rx-category-options">
                                {categoryOptions.map((c) => <option key={c} value={c} />)}
                            </datalist>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormInput label="Unit / Scan (IN)" type="number" value={newUnitPerScanIn} onChange={(e) => setNewUnitPerScanIn(e.target.value)} />
                            <FormInput label="Unit / Scan (OUT)" type="number" value={newUnitPerScan} onChange={(e) => setNewUnitPerScan(e.target.value)} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <FormInput label="Min Stock Alert" type="number" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)} />
                            <FormInput label="Initial Scan Count" type="number" value={newInitQty} onChange={(e) => setNewInitQty(e.target.value)} />
                        </div>
                        {newMessage && <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">{newMessage}</div>}
                    </Card>

                    <div className="space-y-4">
                        <Card className="p-5">
                            <div className="text-sm font-medium text-slate-500">Initial Stock</div>
                            <div className="mt-2 text-4xl font-bold text-teal-700">{totalNew}</div>
                            <div className="mt-1 text-xs text-slate-400">{newInitQty} scans × {newUnitPerScanIn} unit/scan (IN)</div>
                            <button type="button" onClick={() => void handleRegister()}
                                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800">
                                <PackagePlus className="size-4" />Register Medicine
                            </button>
                        </Card>

                        {registeredBarcode && (
                            <Card className="p-5 text-center">
                                <div className="mb-3 text-sm font-semibold text-emerald-700">✓ Registered — print this label</div>
                                <div className="text-base font-bold text-slate-900">{registeredName}</div>
                                <div className="mt-3 flex justify-center overflow-hidden">
                                    <Barcode value={registeredBarcode} format="CODE128" height={56} displayValue />
                                </div>
                                <button type="button" onClick={() => window.print()}
                                    className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-teal-200 text-sm font-semibold text-teal-700 hover:bg-teal-50">
                                    <Printer className="size-4" />Print Label
                                </button>
                            </Card>
                        )}
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export default ReceiveDrug
