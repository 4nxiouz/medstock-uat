import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type CameraScannerProps = {
    open: boolean
    onClose: () => void
    onScan: (barcode: string) => void
}

function CameraScanner({ open, onClose, onScan }: CameraScannerProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const rafRef = useRef<number>(0)
    const activeRef = useRef(false)
    const [error, setError] = useState('')
    const [ready, setReady] = useState(false)

    useEffect(() => {
        if (!open) return

        setError('')
        setReady(false)
        activeRef.current = true

        async function start() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                    },
                    audio: false,
                })

                if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return }
                streamRef.current = stream

                const video = videoRef.current!
                video.srcObject = stream
                await video.play()
                setReady(true)

                // try autofocus — best-effort, silently ignored on unsupported devices
                const track = stream.getVideoTracks()[0]
                try {
                    await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
                } catch { /* ignore */ }

                // lazy-load ZBar WASM only when camera is open
                const { scanImageData } = await import('@undecaf/zbar-wasm')
                const ctx = canvasRef.current!.getContext('2d', { willReadFrequently: true })!

                function tick() {
                    if (!activeRef.current) return
                    if (video.readyState === video.HAVE_ENOUGH_DATA) {
                        const w = video.videoWidth
                        const h = video.videoHeight
                        canvasRef.current!.width = w
                        canvasRef.current!.height = h
                        ctx.drawImage(video, 0, 0, w, h)
                        const imageData = ctx.getImageData(0, 0, w, h)

                        scanImageData(imageData).then((results) => {
                            if (!activeRef.current) return
                            const value = results[0]?.decode()?.trim()
                            if (value) {
                                onScan(value)
                                onClose()
                            }
                        }).catch(() => {})
                    }
                    rafRef.current = requestAnimationFrame(tick)
                }

                tick()
            } catch {
                if (activeRef.current) {
                    setError('ไม่สามารถเปิดกล้องได้ — กรุณาอนุญาต Camera permission ในการตั้งค่าเบราว์เซอร์')
                }
            }
        }

        void start()

        return () => {
            activeRef.current = false
            cancelAnimationFrame(rafRef.current)
            streamRef.current?.getTracks().forEach(t => t.stop())
            streamRef.current = null
            if (videoRef.current) videoRef.current.srcObject = null
            setReady(false)
        }
    }, [open, onClose, onScan])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
            <div className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl">
                {/* Header */}
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

                {/* Viewfinder */}
                <div className="relative bg-slate-950">
                    <video
                        ref={videoRef}
                        className="aspect-[4/3] w-full object-cover"
                        playsInline muted autoPlay
                    />
                    {/* hidden canvas for ZBar processing */}
                    <canvas ref={canvasRef} className="hidden" />

                    {/* scan overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <div className="relative h-24 w-64">
                            {/* dark mask around the window */}
                            <div className="absolute inset-0"
                                style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
                            {/* corner brackets */}
                            <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-teal-400 rounded-tl" />
                            <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-teal-400 rounded-tr" />
                            <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-teal-400 rounded-bl" />
                            <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-teal-400 rounded-br" />
                            {/* scan line */}
                            {ready && (
                                <span className="absolute inset-x-3 top-1/2 h-0.5 bg-teal-400 opacity-80 animate-pulse" />
                            )}
                        </div>
                    </div>

                    {/* loading state */}
                    {!ready && !error && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-lg bg-black/60 px-4 py-2 text-sm text-white">
                                กำลังเปิดกล้อง…
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {error ? (
                    <div className="border-t border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
                ) : (
                    <div className="border-t border-slate-200 px-4 py-2.5 text-xs text-slate-500">
                        จ่อกล้องให้ barcode อยู่ในกรอบ — ระยะ 10–30 ซม.
                    </div>
                )}
            </div>
        </div>
    )
}

export default CameraScanner
