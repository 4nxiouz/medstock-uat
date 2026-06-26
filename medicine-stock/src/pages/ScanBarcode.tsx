import { Barcode, ImageIcon, Search } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import BarcodeInput from '../components/BarcodeInput'
import Card from '../components/Card'
import PageLayout from '../components/PageLayout'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void; onSwitchLocation: () => void }

function ScanBarcode({ onLogout, onSwitchLocation }: PageProps) {
    const { location } = useLocation()
    const [barcode, setBarcode] = useState('')
    const [drug, setDrug] = useState<Drug | null>(null)
    const [message, setMessage] = useState('Ready to scan.')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => { inputRef.current?.focus() }, [])

    async function handleBarcodeScan(code: string) {
        setMessage('')
        setBarcode(code)
        if (!code.trim() || !location) { setDrug(null); return }

        const { data } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
            .eq('barcode', code.trim())
            .eq('location_id', location.id)
            .maybeSingle()

        if (!data) { setDrug(null); setMessage('Medicine not found.'); return }
        setDrug(data as Drug)
        setMessage('Medicine found.')
        inputRef.current?.focus()
    }

    return (
        <PageLayout title="Stock Lookup" subtitle={`Scan to view medicine info — ${location?.name ?? '—'}`} onLogout={onLogout} onSwitchLocation={onSwitchLocation}>
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <Card className="p-5">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="flex size-11 items-center justify-center rounded-md bg-blue-50 text-blue-700">
                            <Barcode className="size-5" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-slate-950">Scanner</h2>
                            <p className="text-sm text-slate-500">Bluetooth scanner or phone camera supported.</p>
                        </div>
                    </div>
                    <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto]">
                        <BarcodeInput ref={inputRef} placeholder="Scan barcode" value={barcode} onChange={setBarcode} onScan={(code) => void handleBarcodeScan(code)} />
                        <button type="button" onClick={() => void handleBarcodeScan(barcode)} className="inline-flex h-11 items-center justify-center gap-2 self-end rounded-md bg-blue-700 px-5 text-sm font-semibold text-white hover:bg-blue-800">
                            <Search className="size-4" />Search
                        </button>
                    </div>
                    <div className="mt-4 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</div>
                </Card>

                <Card className="p-5">
                    <div className="mb-4 aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                        {drug?.image_url ? (
                            <img src={drug.image_url} alt={drug.drug_name} className="size-full object-cover" />
                        ) : (
                            <div className="flex size-full flex-col items-center justify-center text-slate-400">
                                <ImageIcon className="size-10" /><div className="mt-2 text-sm">No image</div>
                            </div>
                        )}
                    </div>
                    <div className="space-y-4">
                        <div>
                            <div className="text-sm text-slate-500">Medicine Name</div>
                            <div className="mt-1 text-2xl font-semibold text-slate-950">{drug?.drug_name || '-'}</div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[['Barcode', drug?.barcode || '-', ''], ['Current Stock', drug?.current_stock ?? '-', 'text-2xl'], ['Min Stock', drug?.min_stock ?? '-', 'text-2xl'], ['Unit/Scan', drug?.unit_per_scan ?? '-', 'text-2xl']].map(([label, val, cls]) => (
                                <div key={String(label)} className="rounded-md bg-slate-50 p-3">
                                    <div className="text-xs text-slate-500">{label}</div>
                                    <div className={`mt-1 font-semibold text-slate-950 break-all ${cls}`}>{val}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </Card>
            </div>
        </PageLayout>
    )
}

export default ScanBarcode
