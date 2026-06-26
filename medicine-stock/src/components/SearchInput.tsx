import { Search } from 'lucide-react'

type SearchInputProps = {
    value: string
    onChange: (value: string) => void
    placeholder: string
}

function SearchInput({ value, onChange, placeholder }: SearchInputProps) {
    return (
        <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100"
            />
        </div>
    )
}

export default SearchInput
