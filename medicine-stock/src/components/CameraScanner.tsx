import { BrowserMultiFormatReader, DecodeHintType, NotFoundException } from '@zxing/library'
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

        // TRY_HARDER = scan at multiple scales → works at greater distance
        const hints = new Map()
        hints.set(DecodeHintType.TRY_HARDER, true)
        const reader = new BrowserMultiFormatReader(hints)
        readerRef.current = reader

        const constraints: MediaStreamConstraints = {
            video: {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920 },
                height: { ideal: 1080 },
                // @ts-expect-error — focusMode is not in TS lib but supported on Android/iOS
                advanced: [{ focusMode: 'continuous' }],
            },
            audio: false,
        }

        reader.decodeFromConstraints(constraints, videoRef.current!, (result, err) => {
            if (result) {
                const value = result.getText().trim()
                if (value) {
                    onScan(value)
                    onClose()
                }
            } else if (err && !(err instanceof NotFoundException)) {
                setError('ไม่สามารถเปิดกล้องได้ — กรุณาอนุญาต Camera permission ในการตั้งค่าเบราว์เซอร์')
            }
        }).then((controls: unknown) => {
            // After stream starts, apply continuous autofocus on the track
            const stream = (controls as { stream?: MediaStream } | null)?.stream
            const track = stream?.getVideoTracks()[0]
            if (track) {
                track.applyConstraints({
                    // @ts-expect-error — focusMode not in TS types
                    advanced: [{ focusMode: 'continuous' }],
                }).catch(() => { /* ignore if device doesn't support */ })
            }
        }).catch(() => {
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
                    <button type="button" onClick={onClose}
                        className="inline-flex size-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50">
                        <X className="size-4" />
                    </button>
                </div>

                <div className="relative bg-slate-950">
                    <video
                        ref={videoRef}
                        className="aspect-[4/3] w-full object-cover"
                        playsInline
                        muted
                        autoPlay
                    />
                    {/* scanning guide overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        {/* dim corners */}
                        <div className="absolute inset-0 bg-black/30" />
                        {/* clear scan window */}
                        <div className="relative h-28 w-72 rounded-lg bg-transparent"
                            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }}>
                            {/* corner brackets */}
                            <span className="absolute left-0 top-0 h-5 w-5 rounded-tl-lg border-l-2 border-t-2 border-teal-400" />
                            <span className="absolute right-0 top-0 h-5 w-5 rounded-tr-lg border-r-2 border-t-2 border-teal-400" />
                            <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-lg border-b-2 border-l-2 border-teal-400" />
                            <span className="absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-teal-400" />
                            {/* scan line animation */}
                            <span className="absolute inset-x-2 top-1/2 h-px bg-teal-400 opacity-70 animate-pulse" />
                        </div>
                    </div>
                </div>

                {error ? (
                    <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : (
                    <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
                        จ่อกล้องให้ barcode อยู่ในกรอบ — ระบบสแกนอัตโนมัติ
                    </div>
                )}
            </div>
        </div>
    )
}

export default CameraScanner
