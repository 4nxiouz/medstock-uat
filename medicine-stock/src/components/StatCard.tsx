import type { LucideIcon } from 'lucide-react'

type Props = {
    title: string
    value: number
    tone?: 'blue' | 'green' | 'red' | 'amber'
    icon?: LucideIcon
}

function StatCard({ title, value, tone = 'blue', icon: Icon }: Props) {
    const toneClass = {
        blue: 'bg-teal-50 text-teal-700',
        green: 'bg-emerald-50 text-emerald-700',
        red: 'bg-red-50 text-red-700',
        amber: 'bg-amber-50 text-amber-700',
    }[tone]

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
                <div className="text-sm font-medium text-slate-500">{title}</div>
                {Icon && (
                    <div className={`flex size-10 items-center justify-center rounded-md ${toneClass}`}>
                        <Icon className="size-5" />
                    </div>
                )}
            </div>
            <div className="mt-4 text-3xl font-bold tabular-nums text-slate-900">
                {value.toLocaleString()}
            </div>
        </div>
    )
}

export default StatCard
