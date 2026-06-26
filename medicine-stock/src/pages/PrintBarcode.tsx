import { Printer } from 'lucide-react'
import { useEffect, useState } from 'react'
import Barcode from 'react-barcode'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = {
    onLogout: () => void
}

function PrintBarcode({ onLogout }: PageProps) {
    const [drugs, setDrugs] = useState<Drug[]>([])

    useEffect(() => {
        async function loadDrugs() {
            const { data, error } = await supabase
                .from('drug_master')
                .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
                .order('drug_name')

            if (error) {
                setDrugs([])
                return
            }

            setDrugs((data || []) as Drug[])
        }

        void loadDrugs()
    }, [])

    return (
        <PageLayout
            title="Print Barcode"
            subtitle="Generate printable barcode labels for registered medicines."
            onLogout={onLogout}
        >
            <div className="mb-5 flex justify-end">
                <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-cyan-700 px-5 text-sm font-semibold text-white hover:bg-cyan-800"
                >
                    <Printer className="size-4" />
                    Print
                </button>
            </div>

            {drugs.length === 0 ? (
                <EmptyState title="No barcode labels" description="Add drugs before printing barcode labels." />
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {drugs.map((drug) => (
                        <Card key={drug.id} className="p-5 text-center">
                            <div className="mb-3 text-base font-semibold text-slate-950">
                                {drug.drug_name}
                            </div>
                            <Barcode value={drug.barcode} format="CODE128" height={56} displayValue />
                        </Card>
                    ))}
                </div>
            )}
        </PageLayout>
    )
}

export default PrintBarcode
