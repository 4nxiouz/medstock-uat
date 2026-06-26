import { ImagePlus, PackagePlus, Printer, Wand2 } from 'lucide-react'
import { useRef, useState } from 'react'
import Barcode from 'react-barcode'
import BarcodeInput from '../components/BarcodeInput'
import Card from '../components/Card'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import { getCreatedBy } from '../lib/auth'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = {
    onLogout: () => void
}

type Tab = 'restock' | 'new'

function generateBarcode() {
    return 'MED' + String(Date.now()).slice(-8)
}

function ReceiveDrug({ onLogout }: PageProps) {
    const [tab, setTab] = useState<Tab>('restock')

    // --- Restock tab ---
    const [rsBarcode, setRsBarcode] = useState('')
    const [rsMedicine, setRsMedicine] = useState<Drug | null>(null)
    const [rsQty, setRsQty] = useState('1')
    const [rsMessage, setRsMessage] = useState('')
    const rsInputRef = useRef<HTMLInputElement>(null)

    // --- New medicine tab ---
    const [newBarcode, setNewBarcode] = useState('')
    const [newName, setNewName] = useState('')
    const [newMinStock, setNewMinStock] = useState('5')
    const [newUnitPerScan, setNewUnitPerScan] = useState('1')
    const [newInitQty, setNewInitQty] = useState('1')
    const [newImage, setNewImage] = useState<File | null>(null)
    const [newMessage, setNewMessage] = useState('')
    const [registeredBarcode, setRegisteredBarcode] = useState('')
    const [registeredName, setRegisteredName] = useState('')

    // ---------- Restock handlers ----------
    async function handleRsScan(code: string) {
        setRsMessage('')
        setRsMedicine(null)
        setRsBarcode(code)
        if (!code.trim()) return

        const { data } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
            .eq('barcode', code.trim())
            .maybeSingle()

        if (!data) {
            setRsMessage('Barcode not found. Register this medicine first in the "New Medicine" tab.')
            return
        }

        setRsMedicine(data as Drug)
        setRsQty('1')
        setRsMessage('')
    }

    async function handleRestock() {
        setRsMessage('')
        if (!rsMedicine) {
            setRsMessage('Scan a barcode first.')
            return
        }

        const totalAdd = Number(rsQty) * Number(rsMedicine.unit_per_scan)

        if (!Number.isFinite(totalAdd) || totalAdd <= 0) {
            setRsMessage('Quantity must be greater than zero.')
            return
        }

        const newStock = Number(rsMedicine.current_stock) + totalAdd

        const { error } = await supabase
            .from('drug_master')
            .update({ current_stock: newStock })
            .eq('id', rsMedicine.id)

        if (error) {
            setRsMessage('Update failed.')
            return
        }

        await supabase
            .from('stock_transaction')
            .insert([{ barcode: rsMedicine.barcode, qty: totalAdd, action: 'IN', created_by: getCreatedBy() }])

        setRsMedicine({ ...rsMedicine, current_stock: newStock })
        setRsMessage(`Done. Added ${totalAdd} units → stock now ${newStock}.`)
        setRsQty('1')
        rsInputRef.current?.focus()
    }

    // ---------- New medicine handlers ----------
    async function handleRegister() {
        setNewMessage('')
        setRegisteredBarcode('')

        const code = newBarcode.trim()
        if (!code || !newName.trim()) {
            setNewMessage('Barcode and medicine name are required.')
            return
        }

        const { data: existing } = await supabase
            .from('drug_master')
            .select('id')
            .eq('barcode', code)
            .maybeSingle()

        if (existing) {
            setNewMessage('This barcode already exists. Use the Restock tab to add stock.')
            return
        }

        let imageUrl = ''
        if (newImage) {
            const fileName = `${Date.now()}-${newImage.name}`
            const { error: upErr } = await supabase.storage.from('drug-image').upload(fileName, newImage)
            if (!upErr) {
                const { data: urlData } = supabase.storage.from('drug-image').getPublicUrl(fileName)
                imageUrl = urlData.publicUrl
            }
        }

        const { error } = await supabase.from('drug_master').insert([{
            barcode: code,
            drug_name: newName.trim(),
            current_stock: Number(newInitQty) * Number(newUnitPerScan),
            min_stock: Number(newMinStock || 0),
            unit_per_scan: Number(newUnitPerScan || 1),
            image_url: imageUrl,
        }])

        if (error) {
            setNewMessage('Registration failed: ' + error.message)
            return
        }

        await supabase.from('stock_transaction').insert([{
            barcode: code,
            qty: Number(newInitQty) * Number(newUnitPerScan),
            action: 'IN',
            created_by: getCreatedBy(),
        }])

        setRegisteredBarcode(code)
        setRegisteredName(newName.trim())
        setNewBarcode('')
        setNewName('')
        setNewMinStock('5')
        setNewUnitPerScan('1')
        setNewInitQty('1')
        setNewImage(null)
        setNewMessage('')
    }

    const totalRestock = Number(rsQty || 0) * Number(rsMedicine?.unit_per_scan || 1)
    const totalNew = Number(newInitQty || 0) * Number(newUnitPerScan || 1)

    return (
        <PageLayout
            title="Receive Medicine"
            subtitle="Restock existing medicine or register a new one."
            onLogout={onLogout}
        >
            {/* Tabs */}
            <div className="mb-5 flex gap-1 rounded-lg border border-slate-200 bg-white p-1 w-fit">
                <button
                    type="button"
                    onClick={() => setTab('restock')}
                    className={`rounded-md px-5 py-2 text-sm font-semibold transition ${
                        tab === 'restock'
                            ? 'bg-blue-700 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    Restock
                </button>
                <button
                    type="button"
                    onClick={() => setTab('new')}
                    className={`rounded-md px-5 py-2 text-sm font-semibold transition ${
                        tab === 'new'
                            ? 'bg-blue-700 text-white shadow-sm'
                            : 'text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    New Medicine
                </button>
            </div>

            {/* ---- RESTOCK TAB ---- */}
            {tab === 'restock' && (
                <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                    <Card className="p-5 space-y-4">
                        <BarcodeInput
                            ref={rsInputRef}
                            label="Scan barcode on cabinet"
                            placeholder="Scan or enter barcode"
                            value={rsBarcode}
                            onChange={setRsBarcode}
                            onScan={(code) => void handleRsScan(code)}
                        />

                        {rsMedicine && (
                            <>
                                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Found</div>
                                    <div className="mt-1 text-lg font-bold text-slate-900">{rsMedicine.drug_name}</div>
                                    <div className="mt-1 text-sm text-slate-500">{rsMedicine.barcode}</div>
                                    <div className="mt-3 grid grid-cols-2 gap-3">
                                        <div className="rounded-md bg-white p-3 text-center">
                                            <div className="text-xs text-slate-500">Current Stock</div>
                                            <div className="text-2xl font-bold text-slate-900">{rsMedicine.current_stock}</div>
                                        </div>
                                        <div className="rounded-md bg-white p-3 text-center">
                                            <div className="text-xs text-slate-500">Unit / Scan</div>
                                            <div className="text-2xl font-bold text-slate-900">{rsMedicine.unit_per_scan}</div>
                                        </div>
                                    </div>
                                </div>

                                <FormInput
                                    label="Scan count (how many times you scan this batch)"
                                    type="number"
                                    value={rsQty}
                                    onChange={(e) => setRsQty(e.target.value)}
                                />
                            </>
                        )}

                        {rsMessage && (
                            <div className={`rounded-md px-4 py-3 text-sm ${rsMessage.startsWith('Done') ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>
                                {rsMessage}
                            </div>
                        )}
                    </Card>

                    <Card className="p-5">
                        <div className="text-sm font-medium text-slate-500">Total to Add</div>
                        <div className="mt-2 text-4xl font-bold text-emerald-600">{rsMedicine ? totalRestock : '—'}</div>
                        {rsMedicine && (
                            <div className="mt-2 text-sm text-slate-500">
                                After: <span className="font-semibold text-slate-900">{Number(rsMedicine.current_stock) + totalRestock}</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => void handleRestock()}
                            disabled={!rsMedicine}
                            className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                            <PackagePlus className="size-4" />
                            Confirm Restock
                        </button>
                    </Card>
                </div>
            )}

            {/* ---- NEW MEDICINE TAB ---- */}
            {tab === 'new' && (
                <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
                    <Card className="p-5 space-y-4">
                        {/* Barcode field with auto-generate */}
                        <div>
                            <label className="mb-2 block text-sm font-medium text-slate-700">
                                Barcode Code
                            </label>
                            <div className="flex gap-2">
                                <input
                                    className="h-11 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Enter or auto-generate"
                                    value={newBarcode}
                                    onChange={(e) => setNewBarcode(e.target.value)}
                                />
                                <button
                                    type="button"
                                    title="Auto-generate barcode"
                                    onClick={() => setNewBarcode(generateBarcode())}
                                    className="inline-flex h-11 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                                >
                                    <Wand2 className="size-4" />
                                    Generate
                                </button>
                            </div>
                            <p className="mt-1.5 text-xs text-slate-400">
                                This code will be printed as the barcode label for the cabinet.
                            </p>
                        </div>

                        <FormInput
                            label="Medicine Name"
                            placeholder="e.g. Paracetamol 500mg"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                        />

                        <div className="grid gap-4 sm:grid-cols-3">
                            <FormInput
                                label="Min Stock Alert"
                                type="number"
                                value={newMinStock}
                                onChange={(e) => setNewMinStock(e.target.value)}
                            />
                            <FormInput
                                label="Unit / Scan"
                                type="number"
                                value={newUnitPerScan}
                                onChange={(e) => setNewUnitPerScan(e.target.value)}
                            />
                            <FormInput
                                label="Initial Scan Count"
                                type="number"
                                value={newInitQty}
                                onChange={(e) => setNewInitQty(e.target.value)}
                            />
                        </div>

                        <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 hover:border-blue-400 hover:bg-blue-50">
                            <ImagePlus className="size-5 text-slate-400" />
                            <span>{newImage ? newImage.name : 'Attach medicine image (optional)'}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={(e) => setNewImage(e.target.files?.[0] || null)} />
                        </label>

                        {newMessage && (
                            <div className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                                {newMessage}
                            </div>
                        )}
                    </Card>

                    <div className="space-y-4">
                        <Card className="p-5">
                            <div className="text-sm font-medium text-slate-500">Initial Stock</div>
                            <div className="mt-2 text-4xl font-bold text-blue-600">{totalNew}</div>
                            <div className="mt-1 text-xs text-slate-400">{newInitQty} scans × {newUnitPerScan} unit/scan</div>
                            <button
                                type="button"
                                onClick={() => void handleRegister()}
                                className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-700 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                <PackagePlus className="size-4" />
                                Register Medicine
                            </button>
                        </Card>

                        {/* Show barcode after successful registration */}
                        {registeredBarcode && (
                            <Card className="p-5 text-center">
                                <div className="mb-3 text-sm font-semibold text-emerald-700">
                                    ✓ Registered — print this label
                                </div>
                                <div className="text-base font-bold text-slate-900">{registeredName}</div>
                                <div className="mt-3 flex justify-center overflow-hidden">
                                    <Barcode
                                        value={registeredBarcode}
                                        format="CODE128"
                                        height={56}
                                        displayValue
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="mt-4 inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-blue-200 text-sm font-semibold text-blue-700 hover:bg-blue-50"
                                >
                                    <Printer className="size-4" />
                                    Print Label
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
