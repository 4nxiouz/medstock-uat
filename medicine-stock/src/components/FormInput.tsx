import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label?: string
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
    { label, className = '', ...props },
    ref,
) {
    return (
        <label className="block">
            {label && (
                <span className="mb-2 block text-sm font-medium text-slate-700">
                    {label}
                </span>
            )}
            <input
                {...props}
                ref={ref}
                className={`h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 ${className}`}
            />
        </label>
    )
})

export default FormInput
