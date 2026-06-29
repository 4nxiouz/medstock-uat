import { AlertTriangle, Boxes, Package } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import PageLayout from '../components/PageLayout'
import SearchInput from '../components/SearchInput'
import StatCard from '../components/StatCard'
import Table from '../components/Table'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = { onLogout: () => void }

function Dashboard({ onLogout }: PageProps) {
    const [drugs, setDrugs] = useState<Drug[]>([])
    const [search, setSearch] = useState('')
    const [message, setMessage] = useState('')

    useEffect(() => {
        async function loadDrugs() {
            const { data, error } = await supabase
                .from('drug_master')
                .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
                .order('drug_name')

            if (error) {
                setMessage('Cannot load inventory data.')
                setDrugs([])
                return
            }

            setDrugs((data || []) as Drug[])
        }

        void loadDrugs()
    }, [])

    const filteredDrugs = useMemo(
        () =>
            drugs.filter((drug) => {
                const keyword = search.toLowerCase()
                return (
                    drug.drug_name.toLowerCase().includes(keyword) ||
                    drug.barcode.includes(search)
                )
            }),
        [drugs, search],
    )

    const lowStock = drugs.filter((drug) => Number(drug.current_stock) <= Number(drug.min_stock))
    const totalStock = drugs.reduce((sum, drug) => sum + Number(drug.current_stock || 0), 0)

    async function handleSave(drug: Drug) {
        setMessage('')

        const { error } = await supabase
            .from('drug_master')
            .update({
                drug_name: drug.drug_name,
                current_stock: Number(drug.current_stock),
                min_stock: Number(drug.min_stock),
                unit_per_scan: Number(drug.unit_per_scan),
            })
            .eq('id', drug.id)

        setMessage(error ? 'Update failed.' : 'Drug updated.')
    }

    async function handleDelete(id: number) {
        setMessage('')

        const { error } = await supabase
            .from('drug_master')
            .delete()
            .eq('id', id)

        if (error) {
            setMessage('Delete failed.')
            return
        }

        setDrugs((current) => current.filter((drug) => drug.id !== id))
        setMessage('Drug deleted.')
    }

    function updateDrug(id: number, patch: Partial<Drug>) {
        setDrugs((current) =>
            current.map((drug) => (drug.id === id ? { ...drug, ...patch } : drug)),
        )
    }

    return (
        <PageLayout
            title="Inventory"
            subtitle="Edit stock records and review low-stock medicines."
            onLogout={onLogout}
        >
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Drugs" value={drugs.length} tone="blue" icon={Package} />
                <StatCard title="Total Stock" value={totalStock} tone="green" icon={Boxes} />
                <StatCard title="Low Stock Count" value={lowStock.length} tone="red" icon={AlertTriangle} />
            </div>

            <Card className="mt-6 p-5">
                <div className="mb-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search drug or barcode" />
                    {message && (
                        <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                            {message}
                        </div>
                    )}
                </div>

                {filteredDrugs.length === 0 ? (
                    <EmptyState title="No drugs found" />
                ) : (
                    <Table>
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3 font-semibold">Image</th>
                                <th className="px-4 py-3 font-semibold">Barcode</th>
                                <th className="px-4 py-3 font-semibold">Drug Name</th>
                                <th className="px-4 py-3 font-semibold">Stock</th>
                                <th className="px-4 py-3 font-semibold">Min</th>
                                <th className="px-4 py-3 font-semibold">Unit</th>
                                <th className="px-4 py-3 font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredDrugs.map((drug) => (
                                <tr
                                    key={drug.id}
                                    className={drug.current_stock <= drug.min_stock ? 'bg-red-50/60' : ''}
                                >
                                    <td className="px-4 py-3">
                                        {drug.image_url ? (
                                            <img
                                                src={drug.image_url}
                                                className="size-12 rounded-md border border-slate-200 object-cover"
                                                alt={drug.drug_name}
                                            />
                                        ) : (
                                            <div className="flex size-12 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs text-slate-500">
                                                None
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 font-medium text-slate-900">{drug.barcode}</td>
                                    <td className="px-4 py-3">
                                        <input
                                            className="h-9 w-64 rounded-md border border-slate-300 px-3 text-sm"
                                            value={drug.drug_name}
                                            onChange={(event) => updateDrug(drug.id, { drug_name: event.target.value })}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            className="h-9 w-24 rounded-md border border-slate-300 px-3 text-sm"
                                            type="number"
                                            value={drug.current_stock}
                                            onChange={(event) => updateDrug(drug.id, { current_stock: Number(event.target.value) })}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            className="h-9 w-20 rounded-md border border-slate-300 px-3 text-sm"
                                            type="number"
                                            value={drug.min_stock}
                                            onChange={(event) => updateDrug(drug.id, { min_stock: Number(event.target.value) })}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <input
                                            className="h-9 w-20 rounded-md border border-slate-300 px-3 text-sm"
                                            type="number"
                                            value={drug.unit_per_scan}
                                            onChange={(event) => updateDrug(drug.id, { unit_per_scan: Number(event.target.value) })}
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => void handleSave(drug)}
                                                className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleDelete(drug.id)}
                                                className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>
        </PageLayout>
    )
}

export default Dashboard
