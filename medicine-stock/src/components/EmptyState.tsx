import { Inbox } from 'lucide-react'

type EmptyStateProps = {
    title: string
    description?: string
}

function EmptyState({ title, description }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center">
            <Inbox className="mb-3 size-8 text-slate-400" />
            <div className="font-semibold text-slate-800">{title}</div>
            {description && (
                <div className="mt-1 text-sm text-slate-500">{description}</div>
            )}
        </div>
    )
}

export default EmptyState
