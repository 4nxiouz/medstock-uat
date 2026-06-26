import type { ReactNode } from 'react'

type TableProps = {
    children: ReactNode
}

function Table({ children }: TableProps) {
    return (
        <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-700">
                {children}
            </table>
        </div>
    )
}

export default Table
