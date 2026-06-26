import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { StockTransaction } from '../types'
import Card from './Card'
import EmptyState from './EmptyState'
import Table from './Table'

function RecentTransaction() {
    const [transactions, setTransactions] = useState<StockTransaction[]>([])

    useEffect(() => {
        async function loadTransactions() {
            const { data, error } = await supabase
                .from('stock_transaction')
                .select('id, barcode, qty, action, created_by, created_at')
                .order('id', { ascending: false })
                .limit(10)

            if (error) {
                setTransactions([])
                return
            }

            setTransactions((data || []) as StockTransaction[])
        }

        void loadTransactions()
    }, [])

    return (
        <Card className="mt-6 p-5">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-slate-950">
                    Recent Transactions
                </h2>
            </div>

            {transactions.length === 0 ? (
                <EmptyState title="No transactions yet" />
            ) : (
                <Table>
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                        <tr>
                            <th className="px-4 py-3 font-semibold">Barcode</th>
                            <th className="px-4 py-3 font-semibold">Qty</th>
                            <th className="px-4 py-3 font-semibold">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {transactions.map((transaction) => (
                            <tr key={transaction.id}>
                                <td className="px-4 py-3 font-medium text-slate-900">
                                    {transaction.barcode}
                                </td>
                                <td className="px-4 py-3">{transaction.qty}</td>
                                <td className="px-4 py-3">
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            transaction.action === 'IN'
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : 'bg-red-50 text-red-700'
                                        }`}
                                    >
                                        {transaction.action}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            )}
        </Card>
    )
}

export default RecentTransaction
