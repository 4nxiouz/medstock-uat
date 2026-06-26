import type { ReactNode } from 'react'

type CardProps = {
    children: ReactNode
    className?: string
}

function Card({ children, className = '' }: CardProps) {
    return (
        <section className={`rounded-lg border border-slate-200 bg-white shadow-sm ${className}`}>
            {children}
        </section>
    )
}

export default Card
