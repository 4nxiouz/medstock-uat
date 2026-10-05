import { PackagePlus, PackageCheck, Settings2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LAST_SEEN_KEY = 'medstock_notifier_last_tx_id'
const POLL_MS = 60_000
const TOAST_MS = 10_000

type Notice = {
    key: string
    barcode: string
    drugName: string
    qty: number
    isNew: boolean // ยังไม่ได้ตั้งค่า (ไม่มี category)
}

function readLastSeen(): number | null {
    try {
        const v = localStorage.getItem(LAST_SEEN_KEY)
        return v ? Number(v) : null
    } catch { return null }
}
function writeLastSeen(id: number) {
    try { localStorage.setItem(LAST_SEEN_KEY, String(id)) } catch { /* ignore */ }
}

/** Popup มุมขวาบน: ยาใหม่จาก SAP -> ให้ไปตั้งค่า, ยาเดิมที่เติมสต็อก -> แจ้งเตือนเฉยๆ */
function StockNotifier() {
    const navigate = useNavigate()
    const [notices, setNotices] = useState<Notice[]>([])
    const busy = useRef(false)

    const dismiss = useCallback((key: string) => {
        setNotices((cur) => cur.filter((n) => n.key !== key))
    }, [])

    const check = useCallback(async () => {
        if (busy.current) return
        busy.current = true
        try {
            const lastSeen = readLastSeen()

            // ครั้งแรกที่เปิด: จำ id ล่าสุดไว้เฉยๆ ไม่ต้องเด้งของเก่า
            if (lastSeen === null) {
                const { data } = await supabase
                    .from('stock_transaction').select('id').order('id', { ascending: false }).limit(1)
                writeLastSeen(data?.[0]?.id ?? 0)
                return
            }

            const { data: txs, error } = await supabase
                .from('stock_transaction')
                .select('id, barcode, qty')
                .eq('created_by', 'system')
                .eq('action', 'IN')
                .gt('id', lastSeen)
                .order('id')
                .limit(200)
            if (error || !txs || txs.length === 0) return

            writeLastSeen(Math.max(...txs.map((t) => t.id as number)))

            const totals = new Map<string, number>()
            for (const t of txs) totals.set(t.barcode, (totals.get(t.barcode) ?? 0) + Number(t.qty))

            const { data: drugs } = await supabase
                .from('drug_master')
                .select('barcode, drug_name, category')
                .in('barcode', Array.from(totals.keys()))
            const info = new Map((drugs ?? []).map((d) => [d.barcode as string, d]))

            const next: Notice[] = Array.from(totals.entries()).map(([barcode, qty]) => {
                const d = info.get(barcode)
                return {
                    key: `${barcode}-${Date.now()}`,
                    barcode,
                    drugName: d?.drug_name ?? barcode,
                    qty,
                    isNew: !d?.category,
                }
            })
            setNotices((cur) => [...next, ...cur])

            // ยาเดิม -> หายเองหลัง 10 วิ, ยาใหม่ -> ค้างจนกว่าจะกดปิด/ตั้งค่า
            for (const n of next) {
                if (!n.isNew) setTimeout(() => dismiss(n.key), TOAST_MS)
            }
        } finally {
            busy.current = false
        }
    }, [dismiss])

    useEffect(() => {
        void check()
        const timer = setInterval(() => void check(), POLL_MS)
        const onVisible = () => { if (document.visibilityState === 'visible') void check() }
        document.addEventListener('visibilitychange', onVisible)
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
    }, [check])

    function goConfigure(n: Notice) {
        dismiss(n.key)
        navigate(`/stock?edit=${encodeURIComponent(n.barcode)}`)
    }

    if (notices.length === 0) return null

    return (
        <div className="fixed right-3 top-12 z-[90] flex w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 sm:right-4">
            {notices.slice(0, 5).map((n) => n.isNew ? (
                <div key={n.key} className="rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-lg">
                    <div className="flex items-start gap-3">
                        <PackagePlus className="mt-0.5 size-5 shrink-0 text-amber-600" />
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-amber-900">ยาใหม่เข้าระบบ — รอตั้งค่า</div>
                            <div className="truncate text-sm text-amber-800">{n.drugName} · +{n.qty}</div>
                            <div className="mt-0.5 text-xs text-amber-700">ตั้งจำนวนต่อการสแกน / หมวดยา / Min stock</div>
                            <button type="button" onClick={() => goConfigure(n)}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
                                <Settings2 className="size-3.5" /> ตั้งค่าเลย
                            </button>
                        </div>
                        <button type="button" onClick={() => dismiss(n.key)} className="text-amber-500 hover:text-amber-700"><X className="size-4" /></button>
                    </div>
                </div>
            ) : (
                <div key={n.key} className="flex items-start gap-3 rounded-lg border border-teal-200 bg-white p-3 shadow-lg">
                    <PackageCheck className="mt-0.5 size-5 shrink-0 text-teal-600" />
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">มียาเข้าล่าสุด</div>
                        <div className="truncate text-sm text-slate-600">{n.drugName} · +{n.qty}</div>
                    </div>
                    <button type="button" onClick={() => dismiss(n.key)} className="text-slate-400 hover:text-slate-600"><X className="size-4" /></button>
                </div>
            ))}
        </div>
    )
}

export default StockNotifier
