import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Props = {
    title: string
    value: number
    tone?: 'blue' | 'green' | 'red' | 'amber'
    icon?: LucideIcon
    subtitle?: string
}

function useCountUp(target: number, duration = 800) {
    const [display, setDisplay] = useState(target)
    const prev = useRef(target)
    const raf = useRef<number>(0)
    useEffect(() => {
        const from = prev.current
        prev.current = target
        if (from === target) return
        const start = performance.now()
        function step(now: number) {
            const progress = Math.min((now - start) / duration, 1)
            const ease = 1 - Math.pow(1 - progress, 3)
            setDisplay(Math.round(from + (target - from) * ease))
            if (progress < 1) raf.current = requestAnimationFrame(step)
        }
        cancelAnimationFrame(raf.current)
        raf.current = requestAnimationFrame(step)
        return () => cancelAnimationFrame(raf.current)
    }, [target, duration])
    return display
}

function StatCard({ title, value, tone = 'blue', icon: Icon, subtitle }: Props) {
    const displayed = useCountUp(value)

    const styles = {
        blue:  { icon: 'bg-teal-100 text-teal-700',   bar: 'bg-teal-500',   num: 'text-teal-700' },
        green: { icon: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', num: 'text-emerald-700' },
        red:   { icon: 'bg-red-100 text-red-600',     bar: 'bg-red-500',    num: 'text-red-600' },
        amber: { icon: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500',  num: 'text-amber-700' },
    }[tone]

    return (
        <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            {/* accent bar */}
            <div className={`absolute inset-x-0 top-0 h-1 ${styles.bar}`} />

            <div className="flex items-start justify-between gap-3 pt-1">
                <div className="text-sm font-medium text-slate-500">{title}</div>
                {Icon && (
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${styles.icon} transition-transform duration-300 group-hover:scale-110`}>
                        <Icon className="size-5" />
                    </div>
                )}
            </div>
            <div className={`mt-3 text-4xl font-bold tabular-nums ${styles.num}`}>
                {displayed.toLocaleString()}
            </div>
            {subtitle && <div className="mt-1 text-xs text-slate-400">{subtitle}</div>}
        </div>
    )
}

export default StatCard
