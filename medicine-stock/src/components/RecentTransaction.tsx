import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { StockTransaction } from '../types'
import Card from './Card'
import EmptyState from './EmptyState'
import Table from './Table'

type Props = { locationId: number | null }

type ParsedTx = { user: string; opType: string; detail: string }

function parseCreatedBy(raw: string | null | undefined, action: string): ParsedTx {
    const s = raw ?? ''
    const adjustMatch = s.match(/^(.+?)\s*\[adjust:\s*(.+?)\]\s*$/)
    if (adjustMatch) return { user: adjustMatch[1].trim(), opType: 'Adjust', detail: adjustMatch[2].trim() }
    const rollbackMatch = s.match(/^(.+?)\s*\[bag-rollback:\s*(.+?)\]\s*$/)
    if (rollbackMatch) return { user: rollbackMatch[1].trim(), opType: 'Bag Rollback', detail: rollbackMatch[2].trim() }
    const editMatch = s.match(/^(.+?)\s*\[edit\]\s*$/)
    if (editMatch) return { user: editMatch[1].trim(), opType: 'Edit', detail: '' }
    const deletedMatch = s.match(/^(.+?)\s*\[deleted?\]\s*$/)
    if (deletedMatch) return { user: deletedMatch[1].trim(), opType: 'Deleted', detail: '' }
    return { user: s || 'system', opType: action === 'IN' ? 'IN' : 'OUT', detail: '' }
}

const OP_TYPE_STYLES: Record<string, string> = {
    'IN':           'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    'OUT':          'bg-red-50 text-red-600 ring-1 ring-red-200',
    'Edit':         'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
    'Adjust':       'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    'Deleted':      'bg-red-100 text-red-700 ring-1 ring-red-300',
    'Bag Rollback': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
}

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
                <div className="overflow-x-auto">
                    <Table>
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                            <tr>
                                <th className="px-4 py-3 text-left font-semibold">Drug Name</th>
                                <th className="px-4 py-3 text-left font-semibold">Barcode</th>
                                <th className="px-4 py-3 text-left font-semibold">IN/OUT</th>
                                <th className="px-4 py-3 text-left font-semibold">Type</th>
                                <th className="px-4 py-3 text-right font-semibold">Qty</th>
                                <th className="px-4 py-3 text-left font-semibold">By</th>
                                <th className="px-4 py-3 text-left font-semibold">Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 animate-rows">
                            {transactions.map((tx) => {
                                const drugName = drugNameMap[tx.barcode]
                                const p = parseCreatedBy(tx.created_by, tx.action)
                                return (
                                    <tr key={tx.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3">
                                            {drugName
                                                ? <span className="font-medium text-slate-900">{drugName}</span>
                                                : <span className="text-xs italic text-slate-400">deleted</span>
                                            }
                                        </td>
                                        <td className="px-4 py-3 text-xs font-mono text-slate-500">{tx.barcode}</td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tx.action === 'IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                {tx.action === 'IN' ? '▲ IN' : '▼ OUT'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] font-semibold ${OP_TYPE_STYLES[p.opType] ?? 'bg-slate-100 text-slate-600'}`}>
                                                {p.opType}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-700">{tx.qty}</td>
                                        <td className="px-4 py-3">
                                            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{p.user}</span>
                                        </td>
                                        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">{formatDate(tx.created_at)}</td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </Table>
                </div>
            )}
        </Card>
    )
}

export default RecentTransaction
