import { PackageMinus } from 'lucide-react'
import { useRef, useState } from 'react'
import BarcodeInput from '../components/BarcodeInput'
import Card from '../components/Card'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import { getCreatedBy } from '../lib/auth'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void; onSwitchLocation: () => void }

function IssueDrug({ onLogout, onSwitchLocation }: PageProps) {
    const { location } = useLocation()
    const [barcode, setBarcode] = useState('')
    const [qty, setQty] = useState('1')
    const [unitPerScan, setUnitPerScan] = useState(1)
    const [drugName, setDrugName] = useState('')
    const [currentStock, setCurrentStock] = useState(0)
    const [message, setMessage] = useState('')
    const barcodeRef = useRef<HTMLInputElement>(null)

    async function getDrug(code = barcode) {
        if (!location) return null
        const { data } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
            .eq('barcode', code.trim())
            .eq('location_id', location.id)
            .maybeSingle()
        return data as Drug | null
    }

    async function handleBarcodeScan(code: string) {
        setMessage('')
        setBarcode(code)
        const drug = await getDrug(code)
        if (!drug) {
            setMessage('Medicine not found in this location.')
            setDrugName('')
            setUnitPerScan(1)
            setCurrentStock(0)
            return
        }
        setDrugName(drug.drug_name)
        setUnitPerScan(Number(drug.unit_per_scan || 1))
        setCurrentStock(Number(drug.current_stock || 0))
        setQty('1')
        setMessage(`Found. Current stock: ${drug.current_stock}`)
    }

    async function handleIssue() {
        setMessage('')
        const drug = await getDrug()
        if (!drug) { setMessage('Medicine not found.'); return }

        const totalQty = Number(qty) * Number(drug.unit_per_scan || 1)
        if (!Number.isFinite(totalQty) || totalQty <= 0) { setMessage('Quantity must be greater than zero.'); return }
        if (Number(drug.current_stock) < totalQty) { setMessage('Insufficient stock.'); return }

        const newStock = Number(drug.current_stock) - totalQty
        const { error } = await supabase.from('drug_master').update({ current_stock: newStock }).eq('id', drug.id)
        if (error) { setMessage('Update failed.'); return }

        await supabase.from('stock_transaction').insert([{
            barcode: barcode.trim(), qty: totalQty, action: 'OUT',
            created_by: getCreatedBy(), location_id: location?.id,
        }])

        setMessage(`Dispensed ${totalQty} units. Remaining: ${newStock}`)
        setQty('1')
        setCurrentStock(newStock)
        barcodeRef.current?.focus()
    }

    return (
        <PageLayout title="Dispense Medicine" subtitle={`Scan barcode to dispense — ${location?.name ?? '—'}`} onLogout={onLogout} onSwitchLocation={onSwitchLocation}>
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
                <Card className="p-5 space-y-4">
                    <BarcodeInput ref={barcodeRef} label="Barcode" placeholder="Scan barcode" value={barcode} onChange={setBarcode} onScan={(code) => void handleBarcodeScan(code)} />
                    <FormInput label="Scan Count" type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
                    {message && <div className="rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div>}
                </Card>

                <Card className="p-5">
                    <div className="text-sm font-medium text-slate-500">Selected Medicine</div>
                    <div className="mt-2 min-h-8 text-xl font-semibold text-slate-950">{drugName || 'No medicine selected'}</div>
                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">Current Stock</div><div className="text-2xl font-semibold">{currentStock}</div></div>
                        <div className="rounded-md bg-slate-50 p-3"><div className="text-xs text-slate-500">Unit / Scan</div><div className="text-2xl font-semibold">{unitPerScan}</div></div>
                    </div>
                    <div className="mt-5 rounded-md bg-red-50 p-4">
                        <div className="text-sm font-medium text-red-700">Total Dispense</div>
                        <div className="mt-1 text-4xl font-semibold text-red-700">{Number(qty || 0) * unitPerScan}</div>
                    </div>
                    <button type="button" onClick={() => void handleIssue()} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-red-600 text-sm font-semibold text-white hover:bg-red-700">
                        <PackageMinus className="size-4" />Dispense Medicine
                    </button>
                </Card>
            </div>
        </PageLayout>
    )
}

export default IssueDrug
