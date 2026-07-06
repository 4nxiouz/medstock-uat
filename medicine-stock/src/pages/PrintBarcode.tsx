import { Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Barcode from 'react-barcode'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import SearchInput from '../components/SearchInput'
import { useLocation } from '../lib/LocationContext'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void }

function PrintBarcode({ onLogout }: PageProps) {
    const { location } = useLocation()
    const [drugs, setDrugs] = useState<Drug[]>([])
    const [search, setSearch] = useState('')
    const [selected, setSelected] = useState<Set<number>>(new Set())

    useEffect(() => {
        if (!location) return
        async function loadDrugs() {
            const { data, error } = await supabase
                .from('drug_master')
                .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
                .eq('location_id', location!.id)
                .order('drug_name')

            if (!error) {
                const list = (data || []) as Drug[]
                setDrugs(list)
                setSelected(new Set(list.map((d) => d.id)))
            }
        }

        void loadDrugs()
    }, [location])

    const filtered = useMemo(() => {
        const kw = search.toLowerCase()
        return drugs.filter(
            (d) =>
                d.drug_name.toLowerCase().includes(kw) ||
                d.barcode.includes(search),
        )
    }, [drugs, search])

    const toPrint = filtered.filter((d) => selected.has(d.id))

    function toggleSelect(id: number) {
        setSelected((prev) => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    function selectAll() {
        setSelected(new Set(filtered.map((d) => d.id)))
    }

    function selectNone() {
        setSelected(new Set())
    }

    return (
        <PageLayout title="Print Barcode" subtitle="Select medicines and print barcode labels" onLogout={onLogout}>
            {/* Toolbar — hidden when printing */}
            <div className="no-print mb-5 flex flex-wrap items-center gap-3">
                <div className="flex-1">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search medicine or barcode" />
                </div>
                <button type="button" onClick={selectAll} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Select All
                </button>
                <button type="button" onClick={selectNone} className="rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                    Clear
                </button>
                <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={toPrint.length === 0}
                    className="inline-flex h-10 items-center gap-2 rounded-md bg-teal-700 px-5 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                    <Printer className="size-4" />
                    Print {toPrint.length > 0 ? `(${toPrint.length})` : ''}
                </button>
            </div>

            {drugs.length === 0 ? (
                <EmptyState title="No medicines registered" description="Register medicines in Receive Medicine first." />
            ) : filtered.length === 0 ? (
                <EmptyState title="No results" description="Try a different search." />
            ) : (
                <>
                    {/* Screen: selectable card grid */}
                    <div className="no-print grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {filtered.map((drug) => {
                            const isSelected = selected.has(drug.id)
                            return (
                                <button
                                    key={drug.id}
                                    type="button"
                                    onClick={() => toggleSelect(drug.id)}
                                    className={`rounded-xl border-2 p-4 text-center transition ${
                                        isSelected
                                            ? 'border-teal-500 bg-teal-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'
                                    }`}
                                >
                                    <div className={`mb-2 text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                        {drug.drug_name}
                                    </div>
                                    <div className="flex justify-center overflow-hidden">
                                        <Barcode value={drug.barcode} format="CODE128" height={48} width={1.4} displayValue fontSize={11} />
                                    </div>
                                    <div className="mt-2 text-xs text-slate-400">
                                        {isSelected ? '✓ Selected' : 'Click to select'}
                                    </div>
                                </button>
                            )
                        })}
                    </div>

                    {/* Print-only: tight label grid, only selected */}
                    <div className="print-label-grid hidden print:block">
                        {toPrint.map((drug) => (
                            <div key={drug.id} className="print-label">
                                <div style={{ fontSize: '11pt', fontWeight: 700, marginBottom: '3mm', lineHeight: 1.3 }}>
                                    {drug.drug_name}
                                </div>
                                <Barcode
                                    value={drug.barcode}
                                    format="CODE128"
                                    height={72}
                                    width={2}
                                    displayValue
                                    fontSize={11}
                                />
                            </div>
                        ))}
                    </div>
                </>
            )}
        </PageLayout>
    )
}

export default PrintBarcode
