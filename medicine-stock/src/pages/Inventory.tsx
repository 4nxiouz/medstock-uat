import { AlertTriangle, Boxes, Package, Pencil, Pill, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import Card from '../components/Card'
import EmptyState from '../components/EmptyState'
import FormInput from '../components/FormInput'
import PageLayout from '../components/PageLayout'
import SearchInput from '../components/SearchInput'
import StatCard from '../components/StatCard'
import { supabase } from '../lib/supabase'
import type { Drug } from '../types'

type PageProps = {
    onLogout: () => void
}

type EditForm = {
    drug_name: string
    current_stock: string
    min_stock: string
    unit_per_scan: string
}

function Inventory({ onLogout }: PageProps) {
    const [drugs, setDrugs] = useState<Drug[]>([])
    const [search, setSearch] = useState('')
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(true)
    const [editingDrug, setEditingDrug] = useState<Drug | null>(null)
    const [editForm, setEditForm] = useState<EditForm>({
        drug_name: '',
        current_stock: '',
        min_stock: '',
        unit_per_scan: '',
    })

    async function loadDrugs() {
        setLoading(true)

        const { data, error } = await supabase
            .from('drug_master')
            .select('id, barcode, drug_name, current_stock, min_stock, unit_per_scan, image_url')
            .order('drug_name')

        setLoading(false)

        if (error) {
            setMessage('Cannot load inventory data.')
            setDrugs([])
            return
        }

        setDrugs((data || []) as Drug[])
    }

    useEffect(() => {
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

    function openEdit(drug: Drug) {
        setEditingDrug(drug)
        setEditForm({
            drug_name: drug.drug_name,
            current_stock: String(drug.current_stock),
            min_stock: String(drug.min_stock),
            unit_per_scan: String(drug.unit_per_scan),
        })
    }

    async function handleSaveEdit() {
        if (!editingDrug) {
            return
        }

        setMessage('')

        const { error } = await supabase
            .from('drug_master')
            .update({
                drug_name: editForm.drug_name.trim(),
                current_stock: Number(editForm.current_stock),
                min_stock: Number(editForm.min_stock),
                unit_per_scan: Number(editForm.unit_per_scan),
            })
            .eq('id', editingDrug.id)

        if (error) {
            setMessage('Update failed.')
            return
        }

        setDrugs((current) =>
            current.map((drug) =>
                drug.id === editingDrug.id
                    ? {
                          ...drug,
                          drug_name: editForm.drug_name.trim(),
                          current_stock: Number(editForm.current_stock),
                          min_stock: Number(editForm.min_stock),
                          unit_per_scan: Number(editForm.unit_per_scan),
                      }
                    : drug,
            ),
        )
        setEditingDrug(null)
        setMessage('Drug updated.')
    }

    async function handleDelete(id: number) {
        if (!window.confirm('Delete this drug from inventory?')) {
            return
        }

        setMessage('')

        const { error } = await supabase.from('drug_master').delete().eq('id', id)

        if (error) {
            setMessage('Delete failed.')
            return
        }

        setDrugs((current) => current.filter((drug) => drug.id !== id))
        setMessage('Drug deleted.')
    }

    return (
        <PageLayout
            title="Inventory"
            subtitle="Browse and manage all medicines in stock."
            onLogout={onLogout}
        >
            <div className="grid gap-4 md:grid-cols-3">
                <StatCard title="Total Drugs" value={drugs.length} tone="blue" icon={Package} />
                <StatCard title="Total Stock" value={totalStock} tone="green" icon={Boxes} />
                <StatCard title="Low Stock Count" value={lowStock.length} tone="red" icon={AlertTriangle} />
            </div>

            <Card className="mt-6 p-5">
                <div className="mb-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <SearchInput value={search} onChange={setSearch} placeholder="Search drug or barcode" />
                    {message && (
                        <div className="rounded-md bg-slate-100 px-3 py-2 text-sm text-slate-700">
                            {message}
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="py-16 text-center text-sm text-slate-500">Loading inventory...</div>
                ) : filteredDrugs.length === 0 ? (
                    <EmptyState title="No drugs found" description="Add medicines from Receive Drug page." />
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredDrugs.map((drug) => {
                            const isLow = Number(drug.current_stock) <= Number(drug.min_stock)

                            return (
                                <article
                                    key={drug.id}
                                    className={`overflow-hidden rounded-xl border bg-white shadow-sm ${
                                        isLow ? 'border-red-200' : 'border-slate-200'
                                    }`}
                                >
                                    <div className="aspect-[4/3] bg-slate-50">
                                        {drug.image_url ? (
                                            <img
                                                src={drug.image_url}
                                                alt={drug.drug_name}
                                                className="size-full object-cover"
                                            />
                                        ) : (
                                            <div className="flex size-full flex-col items-center justify-center text-slate-400">
                                                <Pill className="size-10" />
                                                <span className="mt-2 text-xs">No image</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <h3 className="font-semibold text-slate-950">{drug.drug_name}</h3>
                                                <p className="mt-1 break-all text-xs text-slate-500">{drug.barcode}</p>
                                            </div>
                                            {isLow && (
                                                <span className="shrink-0 rounded-full bg-red-50 px-2 py-1 text-[10px] font-semibold uppercase text-red-700">
                                                    Low
                                                </span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-3 gap-2 text-center">
                                            <div className="rounded-md bg-slate-50 p-2">
                                                <div className="text-[10px] uppercase text-slate-500">Stock</div>
                                                <div className={`text-lg font-semibold ${isLow ? 'text-red-700' : 'text-slate-950'}`}>
                                                    {drug.current_stock}
                                                </div>
                                            </div>
                                            <div className="rounded-md bg-slate-50 p-2">
                                                <div className="text-[10px] uppercase text-slate-500">Min</div>
                                                <div className="text-lg font-semibold text-slate-950">{drug.min_stock}</div>
                                            </div>
                                            <div className="rounded-md bg-slate-50 p-2">
                                                <div className="text-[10px] uppercase text-slate-500">Unit</div>
                                                <div className="text-lg font-semibold text-slate-950">{drug.unit_per_scan}</div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openEdit(drug)}
                                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                                            >
                                                <Pencil className="size-4" />
                                                Edit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => void handleDelete(drug.id)}
                                                className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="size-4" />
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            )
                        })}
                    </div>
                )}
            </Card>

            {editingDrug && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center">
                    <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
                        <h3 className="text-lg font-semibold text-slate-950">Edit Drug</h3>
                        <p className="mt-1 text-sm text-slate-500">{editingDrug.barcode}</p>

                        <div className="mt-4 space-y-3">
                            <FormInput
                                label="Drug Name"
                                value={editForm.drug_name}
                                onChange={(event) => setEditForm((current) => ({ ...current, drug_name: event.target.value }))}
                            />
                            <div className="grid grid-cols-3 gap-3">
                                <FormInput
                                    label="Stock"
                                    type="number"
                                    value={editForm.current_stock}
                                    onChange={(event) => setEditForm((current) => ({ ...current, current_stock: event.target.value }))}
                                />
                                <FormInput
                                    label="Min"
                                    type="number"
                                    value={editForm.min_stock}
                                    onChange={(event) => setEditForm((current) => ({ ...current, min_stock: event.target.value }))}
                                />
                                <FormInput
                                    label="Unit"
                                    type="number"
                                    value={editForm.unit_per_scan}
                                    onChange={(event) => setEditForm((current) => ({ ...current, unit_per_scan: event.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="mt-5 flex gap-2">
                            <button
                                type="button"
                                onClick={() => setEditingDrug(null)}
                                className="flex-1 rounded-md border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => void handleSaveEdit()}
                                className="flex-1 rounded-md bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageLayout>
    )
}

export default Inventory
