import { PackagePlus, PackageCheck, Settings2, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const LAST_SEEN_KEY = 'medstock_notifier_last_tx_id'
const POLL_MS = 60_000
const TOAST_MS = 10_000

type SetupItem = { barcode: string; drugName: string; stock: number; missing: string[]; addedAt: string | null }
type RestockItem = { key: string; drugName: string; qty: number; at: string | null }

function fmtTime(iso: string | null): string {
    if (!iso) return ''
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) + ' น.'
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

/**
 * Popup มุมขวาบน
 * 1) ยาใหม่ที่ SAP สร้างให้ (needs_setup = true): แสดงค้างไว้ทุกครั้งที่เปิดเว็บ จนกว่าจะมีคนตั้งหมวดยา/รายละเอียด
 *    พร้อมบอกว่ายังขาดอะไร, กดแล้วไปหน้าแก้ไขยาตัวนั้นทันที
 * 2) ยาเดิมที่มีของเข้า: แจ้ง "เข้ามา N" แล้วหายเองใน 10 วินาที
 */
function StockNotifier() {
    const navigate = useNavigate()
    const [setupItems, setSetupItems] = useState<SetupItem[]>([])
    const [restocks, setRestocks] = useState<RestockItem[]>([])
    const [hidden, setHidden] = useState<Set<string>>(new Set()) // ปิดชั่วคราวในรอบที่เปิดเว็บนี้
    const busy = useRef(false)

    const dismissRestock = useCallback((key: string) => {
        setRestocks((cur) => cur.filter((n) => n.key !== key))
    }, [])

    const check = useCallback(async () => {
        if (busy.current) return
        busy.current = true
        try {
            // ---- 1) ยาใหม่ที่ยังไม่ได้ตั้งค่า (ค้างจนกว่าจะตั้ง) ----
            const { data: pending } = await supabase
                .from('drug_master')
                .select('barcode, drug_name, current_stock, category, min_stock, unit_per_scan_in')
                .eq('needs_setup', true)
                .order('id', { ascending: false })
                .limit(50)
            // เวลาที่ยาเข้ามาครั้งแรก = transaction แรกของ system
            const addedAt = new Map<string, string>()
            if (pending && pending.length > 0) {
                const { data: firstTx } = await supabase
                    .from('stock_transaction')
                    .select('barcode, created_at')
                    .eq('created_by', 'system')
                    .in('barcode', pending.map((d) => d.barcode))
                    .order('created_at', { ascending: true })
                for (const t of firstTx ?? []) if (!addedAt.has(t.barcode)) addedAt.set(t.barcode, t.created_at)
            }
            const setups: SetupItem[] = (pending ?? []).map((d) => {
                const missing: string[] = []
                if (!d.category) missing.push('หมวดยา')
                if (d.unit_per_scan_in == null) missing.push('จำนวนต่อการสแกน')
                if (!d.min_stock) missing.push('Min stock')
                return { barcode: d.barcode, drugName: d.drug_name, stock: Number(d.current_stock), missing, addedAt: addedAt.get(d.barcode) ?? null }
            })
            setSetupItems(setups)
            const setupBarcodes = new Set(setups.map((s) => s.barcode))

            // ---- 2) ยาเดิมที่มีของเข้าใหม่ ----
            const lastSeen = readLastSeen()
            if (lastSeen === null) {
                // ครั้งแรกที่เปิด: จำ id ล่าสุดไว้ ไม่เด้งของเก่า
                const { data } = await supabase
                    .from('stock_transaction').select('id').order('id', { ascending: false }).limit(1)
                writeLastSeen(data?.[0]?.id ?? 0)
                return
            }

            const { data: txs, error } = await supabase
                .from('stock_transaction')
                .select('id, barcode, qty, created_at')
                .eq('created_by', 'system')
                .eq('action', 'IN')
                .gt('id', lastSeen)
                .order('id')
                .limit(200)
            if (error || !txs || txs.length === 0) return
            writeLastSeen(Math.max(...txs.map((t) => t.id as number)))

            const totals = new Map<string, number>()
            const latestAt = new Map<string, string>()
            for (const t of txs) {
                if (setupBarcodes.has(t.barcode)) continue // ยาใหม่มีการ์ดตั้งค่าอยู่แล้ว
                totals.set(t.barcode, (totals.get(t.barcode) ?? 0) + Number(t.qty))
                latestAt.set(t.barcode, t.created_at)
            }
            if (totals.size === 0) return

            const { data: drugs } = await supabase
                .from('drug_master').select('barcode, drug_name').in('barcode', Array.from(totals.keys()))
            const names = new Map((drugs ?? []).map((d) => [d.barcode as string, d.drug_name as string]))

            const next: RestockItem[] = Array.from(totals.entries()).map(([barcode, qty]) => ({
                key: `${barcode}-${Date.now()}`,
                drugName: names.get(barcode) ?? barcode,
                qty,
                at: latestAt.get(barcode) ?? null,
            }))
            setRestocks((cur) => [...next, ...cur])
            for (const n of next) setTimeout(() => dismissRestock(n.key), TOAST_MS)
        } finally {
            busy.current = false
        }
    }, [dismissRestock])

    useEffect(() => {
        void check()
        const timer = setInterval(() => void check(), POLL_MS)
        const onVisible = () => { if (document.visibilityState === 'visible') void check() }
        document.addEventListener('visibilitychange', onVisible)
        return () => { clearInterval(timer); document.removeEventListener('visibilitychange', onVisible) }
    }, [check])

    function goConfigure(barcode: string) {
        setHidden((cur) => new Set(cur).add(barcode))
        navigate(`/stock?edit=${encodeURIComponent(barcode)}`)
    }

    const visibleSetups = setupItems.filter((s) => !hidden.has(s.barcode))
    if (visibleSetups.length === 0 && restocks.length === 0) return null

    return (
        <div className="fixed right-3 top-12 z-[90] flex max-h-[80vh] w-[calc(100%-1.5rem)] max-w-sm flex-col gap-2 overflow-y-auto sm:right-4">
            {visibleSetups.slice(0, 4).map((n) => (
                <div key={n.barcode} role="button" tabIndex={0}
                    onClick={() => goConfigure(n.barcode)}
                    onKeyDown={(e) => { if (e.key === 'Enter') goConfigure(n.barcode) }}
                    className="cursor-pointer rounded-lg border border-amber-300 bg-amber-50 p-3 shadow-lg hover:bg-amber-100">
                    <div className="flex items-start gap-3">
                        <PackagePlus className="mt-0.5 size-5 shrink-0 text-amber-600" />
                        <div className="min-w-0 flex-1">
                            <div className="text-sm font-bold text-amber-900">ยาใหม่เข้าระบบ — ยังไม่ได้ตั้งค่า</div>
                            <div className="truncate text-sm text-amber-800">{n.drugName} · คงเหลือ {n.stock}</div>
                            {n.addedAt && <div className="text-xs text-amber-700">เข้าระบบเมื่อ {fmtTime(n.addedAt)}</div>}
                            {n.missing.length > 0 && (
                                <div className="mt-0.5 text-xs text-amber-700">ยังไม่ได้ใส่: {n.missing.join(', ')}</div>
                            )}
                            <button type="button" onClick={(e) => { e.stopPropagation(); goConfigure(n.barcode) }}
                                className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-600">
                                <Settings2 className="size-3.5" /> ตั้งค่าเลย
                            </button>
                        </div>
                        <button type="button" title="ซ่อนไว้ก่อน (จะเตือนอีกตอนเปิดเว็บรอบหน้า)"
                            onClick={(e) => { e.stopPropagation(); setHidden((cur) => new Set(cur).add(n.barcode)) }}
                            className="text-amber-500 hover:text-amber-700"><X className="size-4" /></button>
                    </div>
                </div>
            ))}
            {visibleSetups.length > 4 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-2 text-center text-xs font-semibold text-amber-800 shadow">
                    และยาใหม่ที่ยังไม่ได้ตั้งค่าอีก {visibleSetups.length - 4} รายการ
                </div>
            )}
            {restocks.slice(0, 5).map((n) => (
                <div key={n.key} className="flex items-start gap-3 rounded-lg border border-teal-200 bg-white p-3 shadow-lg">
                    <PackageCheck className="mt-0.5 size-5 shrink-0 text-teal-600" />
                    <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-slate-900">ยาเข้าล่าสุด</div>
                        <div className="truncate text-sm text-slate-600">{n.drugName} · เข้ามา {n.qty}</div>
                        {n.at && <div className="text-xs text-slate-400">{fmtTime(n.at)}</div>}
                    </div>
                    <button type="button" onClick={() => dismissRestock(n.key)} className="text-slate-400 hover:text-slate-600"><X className="size-4" /></button>
                </div>
            ))}
        </div>
    )
}

export default StockNotifier
