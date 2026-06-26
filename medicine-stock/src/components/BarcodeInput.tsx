import { Camera, ScanLine } from 'lucide-react'
import { forwardRef, useState, type KeyboardEvent } from 'react'
import type { InputHTMLAttributes } from 'react'
import CameraScanner from './CameraScanner'

type BarcodeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange'> & {
    label?: string
    value: string
    onChange: (value: string) => void
    onScan?: (barcode: string) => void
    showCamera?: boolean
}

const BarcodeInput = forwardRef<HTMLInputElement, BarcodeInputProps>(function BarcodeInput(
    { label, value, onChange, onScan, showCamera = true, className = '', ...props },
    ref,
) {
    const [cameraOpen, setCameraOpen] = useState(false)

    function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
        props.onKeyDown?.(event)

        if (event.key === 'Enter' && onScan) {
            event.preventDefault()
            const code = value.trim()
            if (code) {
                onScan(code)
            }
        }
    }

    function handleCameraScan(code: string) {
        onChange(code)
        onScan?.(code)
    }

    return (
        <>
            <label className="block">
                {label && (
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                        {label}
                    </span>
                )}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                        <input
                            {...props}
                            ref={ref}
                            value={value}
                            inputMode="none"
                            autoComplete="off"
                            autoCorrect="off"
                            spellCheck={false}
                            onChange={(event) => onChange(event.target.value)}
                            onKeyDown={handleKeyDown}
                            className={`h-11 w-full rounded-md border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 ${className}`}
                        />
                    </div>
                    {showCamera && (
                        <button
                            type="button"
                            title="Scan with camera"
                            onClick={() => setCameraOpen(true)}
                            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-md border border-cyan-200 bg-cyan-50 px-3 text-sm font-semibold text-cyan-800 hover:bg-cyan-100 sm:px-4"
                        >
                            <Camera className="size-4" />
                            <span className="hidden sm:inline">Camera</span>
                        </button>
                    )}
                </div>
                <p className="mt-1.5 text-xs text-slate-500">
                    Bluetooth/USB scanner: focus this field and scan. Phone: tap Camera.
                </p>
            </label>

            <CameraScanner
                open={cameraOpen}
                onClose={() => setCameraOpen(false)}
                onScan={handleCameraScan}
            />
        </>
    )
})

export default BarcodeInput
