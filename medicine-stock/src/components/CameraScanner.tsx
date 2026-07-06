import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library'
import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type CameraScannerProps = {
    open: boolean
    onClose: () => void
    onScan: (barcode: string) => void
}

function CameraScanner({ open, onClose, onScan }: CameraScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const readerRef = useRef<BrowserMultiFormatReader | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!open) return

        setError('')
        const reader = new BrowserMultiFormatReader()
        readerRef.current = reader

        reader.decodeFromConstraints(
            { video: { facingMode: { ideal: 'environment' } }, audio: false },
            videoRef.current!,
            (result, err) => {
                if (result) {
                    const value = result.getText().trim()
                    if (value) {
                        onScan(value)
                        onClose()
                    }
                } else if (err && !(err instanceof NotFoundException)) {
                    setError('ไม่สามารถเปิดกล้องได้ — กรุณาอนุญาต Camera permission ในการตั้งค่าเบราว์เซอร์')
                }
            }
        ).catch(() => {
            setError('ไม่สามารถเปิดกล้องได้ — กรุณาอนุญาต Camera permission ในการตั้งค่าเบราว์เซอร์')
        })

        return () => {
            readerRef.current?.reset()
            readerRef.current = null
        }
    }, [open, onClose, onScan])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <Camera className="size-4" />
                        สแกน Barcode
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="relative bg-slate-950 p-3">
                    <video
                        ref={videoRef}
                        className="aspect-[4/3] w-full rounded-lg object-cover"
                        playsInline
                        muted
                        autoPlay
                    />
                    {/* crosshair guide */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-3">
                        <div className="h-24 w-64 rounded border-2 border-teal-400 opacity-70" />
                    </div>
                </div>

                {error ? (
                    <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                ) : (
                    <div className="border-t border-slate-200 px-4 py-3 text-xs text-slate-500">
                        จ่อกล้องไปที่ barcode — ระบบจะสแกนอัตโนมัติ
                    </div>
                )}
            </div>
        </div>
    )
}

export default CameraScanner
