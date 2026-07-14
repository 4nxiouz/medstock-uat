import { DRUG_ICON_OPTIONS } from './DrugIcon'

type Props = {
    value: string
    onChange: (categoryName: string) => void
    label?: string
}

export default function IconPicker({ value, onChange, label }: Props) {
    return (
        <div>
            {label && <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>}
            <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {DRUG_ICON_OPTIONS.map((opt) => {
                    const selected = value === opt.categoryName
                    return (
                        <button
                            key={opt.categoryName}
                            type="button"
                            onClick={() => onChange(opt.categoryName)}
                            title={opt.label}
                            className={`flex flex-col items-center gap-1 rounded-xl border-2 p-1.5 transition-all ${
                                selected
                                    ? 'border-teal-500 ring-2 ring-teal-200'
                                    : 'border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {/* icon at natural 56px, clipped to 48px visible */}
                            <div className="relative size-12 overflow-hidden rounded-lg">
                                <div className={`absolute inset-0 flex items-center justify-center bg-gradient-to-br ${opt.bg}`}>
                                    {opt.svg()}
                                </div>
                            </div>
                            <span className="w-full truncate text-center text-[9px] font-medium leading-tight text-slate-500">
                                {opt.label}
                            </span>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
