import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { StockTransaction } from '../types'
import Card from './Card'
import EmptyState from './EmptyState'
import Table from './Table'

type Props = { locationId: number | null }

function formatDate(raw?: string | null) {
    if (!raw) return '-'
    return new Date(raw).toLocaleString('th-TH', {
        day: '2-digit', month: '2-digit', year: '2-digit',
        hour: '2-digit', minute: '2-digit',
    })
}

function RecentTransaction({ locationId }: Props) {
    const [transactions, setTransactions] = useState<StockTransaction[]>([])
    const [drugNameMap, setDrugNameMap] = useState<Record<string, string>>({})

    useEffect(() => {
        if (locationId === null) return

        async function load() {
            const [txRes, drugRes] = await Promise.all([
                supabase
                    .from('stock_transaction')
                    .select('id, barcode, qty, action, created_by, created_at')
                    .eq('location_id', locationId!)
                    .order('id', { ascending: false })
                    .limit(20),
                supabase
                    .from('drug_master')
                    .select('barcode, drug_name')
                    .eq('location_id', locationId!),
            ])

            setTransactions((txRes.data || []) as StockTransaction[])

            const map: Record<string, string> = {}
            for (const d of (drugRes.data || []) as { barcode: string; drug_name: string }[]) {
                map[d.barcode] = d.drug_name
            }
            setDrugNameMap(map)
        }

        void load()
    }, [locationId])

    return (
        <Card className="mt-6 p-5">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Recent Transactions</h2>
                <span className="text-xs text-slate-400">Last 20 entries</span>
            </div>

            {transactions.length === 0 ? (
                <EmptyState title="No transactions yet" />
            ) : (
                <Table>
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3 text-left font-semibold">Drug Name</th>
                            <th className="px-4 py-3 text-left font-semibold">Barcode</th>
                            <th className="px-4 py-3 text-left font-semibold">Action</th>
                            <th className="px-4 py-3 text-left font-semibold">Qty</th>
                            <th className="px-4 py-3 text-left font-semibold">By</th>
                            <th className="px-4 py-3 text-left font-semibold">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 animate-rows">
                        {transactions.map((tx) => {
                            const drugName = drugNameMap[tx.barcode]
                            return (
                                <tr key={tx.id}>
                                    <td className="px-4 py-3">
                                        {drugName
                                            ? <span className="font-medium text-slate-900">{drugName}</span>
                                            : <span className="text-xs italic text-slate-400">deleted</span>
                                        }
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{tx.barcode}</td>
                                    <td className="px-4 py-3">
                                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tx.action === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                                            {tx.action === 'IN' ? '▲ IN' : '▼ OUT'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 tabular-nums text-slate-700">{tx.qty}</td>
                                    <td className="px-4 py-3">
                                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                            {tx.created_by || 'system'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-slate-500">{formatDate(tx.created_at)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </Table>
            )}
        </Card>
    )
}

export default RecentTransaction
