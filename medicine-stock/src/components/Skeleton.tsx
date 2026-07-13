type Props = {
    className?: string
    rows?: number
}

export function SkeletonLine({ className = '' }: { className?: string }) {
    return <div className={`skeleton h-4 ${className}`} />
}

export function SkeletonCard({ className = '' }: { className?: string }) {
    return (
        <div className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>
            <div className="flex items-start justify-between gap-3">
                <SkeletonLine className="w-24" />
                <div className="skeleton size-10 rounded-xl" />
            </div>
            <div className="skeleton mt-4 h-9 w-20 rounded-lg" />
            <SkeletonLine className="mt-2 w-32" />
        </div>
    )
}

export function SkeletonTable({ rows = 5 }: Props) {
    return (
        <div className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5"
                    style={{ animationDelay: `${i * 0.05}s` }}>
                    <SkeletonLine className="w-28" />
                    <SkeletonLine className="flex-1" />
                    <SkeletonLine className="w-16" />
                    <SkeletonLine className="w-12" />
                </div>
            ))}
        </div>
    )
}

export default SkeletonLine
