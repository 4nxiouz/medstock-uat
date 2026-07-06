import { PackageMinus, Trash2 } from 'lucide-react'
import { useRef, useState } from 'react'
import BarcodeInput from '../components/BarcodeInput'
import Card from '../components/Card'
import PageLayout from '../components/PageLayout'
import { getCreatedBy } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void }
type CartItem = { drug: Drug; qty: number }

function IssueDrug({ onLogout }: PageProps) {
    const { location } = useLocation()
    const [barcode, setBarcode] = useState('')
    const [cart, setCart] = useState<CartItem[]>([])
    const [scanMsg, setScanMsg] = useState('')
    const [confirmMsg, setConfirmMsg] = useState('')
    const [confirming, setConfirming] = useState(false)
    const barcodeRef = useRef<HTMLInputElement>(null)

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
        if (cart.length === 0 || !location) return
        setConfirming(true)
        setConfirmMsg('')

        for (const item of cart) {
            const totalQty = item.qty * Number(item.drug.unit_per_scan || 1)
            if (Number(item.drug.current_stock) < totalQty) {
                setConfirmMsg(`สต็อกไม่พอ: ${item.drug.drug_name} (มี ${item.drug.current_stock}, ต้องการ ${totalQty})`)
                setConfirming(false)
                return
            }
        }

        for (const item of cart) {
            const totalQty = item.qty * Number(item.drug.unit_per_scan || 1)
            const newStock = Number(item.drug.current_stock) - totalQty
            await supabase.from('drug_master').update({ current_stock: newStock }).eq('id', item.drug.id)
            await supabase.from('stock_transaction').insert([{
                barcode: item.drug.barcode, qty: totalQty, action: 'OUT',
                created_by: getCreatedBy(), location_id: location.id,
            }])
        }

        setConfirmMsg(`✓ จ่ายยาสำเร็จ ${cart.length} รายการ`)
        setCart([])
        setConfirming(false)
        barcodeRef.current?.focus()
    }

    const totalItems = cart.reduce((s, c) => s + c.qty * Number(c.drug.unit_per_scan || 1), 0)
    const hasCart = cart.length > 0

    return (
        <PageLayout title="Dispense Medicine" subtitle="สแกนยาหลายรายการ แล้วกด Confirm ครั้งเดียว" onLogout={onLogout}>
            {/* extra bottom padding on mobile so sticky bar doesn't cover content */}
            <div className={`space-y-4 ${hasCart ? 'pb-28 lg:pb-0' : ''}`}>

                {/* Scan input */}
                <Card className="p-4">
                    <BarcodeInput
                        ref={barcodeRef}
                        label="Scan Barcode"
                        placeholder="สแกนหรือพิมพ์ barcode แล้วกด Enter"
                        value={barcode}
                        onChange={setBarcode}
                        onScan={(code) => void handleBarcodeScan(code)}
                    />
                    {scanMsg && (
                        <div className={`mt-2.5 rounded-md px-3 py-2 text-sm ${scanMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {scanMsg}
                        </div>
                    )}
                </Card>

                {/* Desktop two-column layout */}
                <div className="grid gap-4 lg:grid-cols-[1fr_280px]">

                    {/* Cart list */}
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
                                            {/* Drug name row */}
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
                                            {/* Qty controls row */}
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

                    {/* Desktop summary sidebar */}
                    <div className="hidden lg:block">
                        <SummaryPanel
                            cart={cart}
                            totalItems={totalItems}
                            confirmMsg={confirmMsg}
                            confirming={confirming}
                            onConfirm={() => void handleConfirm()}
                            onClear={() => { setCart([]); setConfirmMsg('') }}
                        />
                    </div>
                </div>
            </div>

            {/* Mobile sticky confirm bar */}
            {hasCart && (
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

type SummaryPanelProps = {
    cart: CartItem[]
    totalItems: number
    confirmMsg: string
    confirming: boolean
    onConfirm: () => void
    onClear: () => void
}

function SummaryPanel({ cart, totalItems, confirmMsg, confirming, onConfirm, onClear }: SummaryPanelProps) {
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
        </Card>
    )
}

export default IssueDrug
