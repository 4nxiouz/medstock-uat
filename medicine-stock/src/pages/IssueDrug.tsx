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

type CartItem = {
    drug: Drug
    qty: number
}

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
            if (existing) {
                return prev.map((c) => c.drug.barcode === drug.barcode ? { ...c, qty: c.qty + 1 } : c)
            }
            return [...prev, { drug, qty: 1 }]
        })
        setBarcode('')
        setScanMsg(`✓ ${drug.drug_name} เพิ่มลง cart`)
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
        if (cart.length === 0) return
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
                created_by: getCreatedBy(), location_id: location?.id,
            }])
        }

        setConfirmMsg(`✓ จ่ายยาสำเร็จ ${cart.length} รายการ`)
        setCart([])
        setConfirming(false)
        barcodeRef.current?.focus()
    }

    const totalItems = cart.reduce((s, c) => s + c.qty * Number(c.drug.unit_per_scan || 1), 0)

    return (
        <PageLayout title="Dispense Medicine" subtitle="สแกนยาหลายรายการ แล้วกด Confirm ครั้งเดียว" onLogout={onLogout}>
            <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
                {/* Left: scan + cart */}
                <div className="space-y-4">
                    <Card className="p-5">
                        <BarcodeInput ref={barcodeRef} label="Scan Barcode" placeholder="สแกนหรือพิมพ์ barcode แล้วกด Enter" value={barcode} onChange={setBarcode} onScan={(code) => void handleBarcodeScan(code)} />
                        {scanMsg && (
                            <div className={`mt-3 rounded-md px-3 py-2 text-sm ${scanMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                {scanMsg}
                            </div>
                        )}
                    </Card>

                    {/* Cart list */}
                    {cart.length > 0 && (
                        <Card className="overflow-hidden p-0">
                            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-700">
                                รายการที่จะจ่าย ({cart.length} รายการ)
                            </div>
                            <div className="divide-y divide-slate-100">
                                {cart.map((item) => {
                                    const total = item.qty * Number(item.drug.unit_per_scan || 1)
                                    return (
                                        <div key={item.drug.barcode} className="flex items-center gap-3 px-5 py-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="truncate font-medium text-slate-900">{item.drug.drug_name}</div>
                                                <div className="text-xs text-slate-400">{item.drug.barcode} · สต็อก {item.drug.current_stock}</div>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                <span className="text-xs text-slate-500">จำนวนสแกน</span>
                                                <input type="number" min="1" value={item.qty}
                                                    onChange={(e) => updateQty(item.drug.barcode, e.target.value)}
                                                    className="h-8 w-16 rounded-md border border-slate-300 px-2 text-center text-sm" />
                                                <span className="w-20 text-right text-sm font-semibold text-slate-700">= {total} หน่วย</span>
                                                <button type="button" onClick={() => removeItem(item.drug.barcode)}
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

                {/* Right: summary */}
                <Card className="p-5 h-fit">
                    <div className="text-sm font-medium text-slate-500">สรุปการจ่ายยา</div>
                    <div className="mt-4 rounded-md bg-slate-50 p-3 text-center">
                        <div className="text-xs text-slate-500">จำนวนรายการ</div>
                        <div className="text-3xl font-bold text-slate-900">{cart.length}</div>
                    </div>
                    <div className="mt-3 rounded-md bg-red-50 p-3 text-center">
                        <div className="text-xs font-medium text-red-600">หน่วยที่จ่ายทั้งหมด</div>
                        <div className="text-3xl font-bold text-red-700">{totalItems}</div>
                    </div>
                    {confirmMsg && (
                        <div className={`mt-3 rounded-md px-3 py-2 text-sm ${confirmMsg.startsWith('✓') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                            {confirmMsg}
                        </div>
                    )}
                    <button type="button" onClick={() => void handleConfirm()}
                        disabled={cart.length === 0 || confirming}
                        className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-red-600 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        <PackageMinus className="size-4" />Confirm Dispense All
                    </button>
                    {cart.length > 0 && (
                        <button type="button" onClick={() => { setCart([]); setConfirmMsg('') }}
                            className="mt-2 inline-flex h-9 w-full items-center justify-center gap-2 rounded-md border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                            ล้าง Cart
                        </button>
                    )}
                </Card>
            </div>
        </PageLayout>
    )
}

export default IssueDrug
