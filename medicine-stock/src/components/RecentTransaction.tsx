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

    useEffect(() => {
        if (locationId === null) return

        async function load() {
            const { data } = await supabase
                .from('stock_transaction')
                .select('id, barcode, qty, action, created_by, created_at')
                .eq('location_id', locationId!)
                .order('id', { ascending: false })
                .limit(20)

            setTransactions((data || []) as StockTransaction[])
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
                            <th className="px-4 py-3 text-left font-semibold">Barcode</th>
                            <th className="px-4 py-3 text-left font-semibold">Action</th>
                            <th className="px-4 py-3 text-left font-semibold">Qty</th>
                            <th className="px-4 py-3 text-left font-semibold">By</th>
                            <th className="px-4 py-3 text-left font-semibold">Time</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.map((tx) => (
                            <tr key={tx.id}>
                                <td className="px-4 py-3 font-medium text-slate-900">{tx.barcode}</td>
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
                        ))}
                    </tbody>
                </Table>
            )}
        </Card>
    )
}

export default RecentTransaction
