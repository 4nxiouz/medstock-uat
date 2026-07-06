import { Camera, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Props = {
    open: boolean
    onClose: () => void
    onScan: (barcode: string) => void
}

function CameraScanner({ open, onClose, onScan }: Props) {
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
                // Request without width/height — let browser pick native resolution
                // so it won't select a telephoto / cropped sensor
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' } },
                    audio: false,
                })

                if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return }
                streamRef.current = stream

                // Reset zoom + enable autofocus on the raw track
                const track = stream.getVideoTracks()[0]
                try {
                    const caps = track.getCapabilities() as Record<string, unknown>
                    if ('focusMode' in caps) {
                        await track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] })
                    }
                } catch { /* device may not support — ignore */ }

                const video = videoRef.current!
                video.srcObject = stream
                await video.play()
                setReady(true)

                // Lazy-load ZBar WASM only when scanner opens
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
                            if (value) { onScan(value); onClose() }
                        }).catch(() => {})
                    }
                    rafRef.current = requestAnimationFrame(tick)
                }
                tick()

            } catch {
                if (activeRef.current) setError('ไม่สามารถเปิดกล้องได้ — กรุณาอนุญาต Camera permission')
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
            <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-black shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Camera className="size-4" /> สแกน Barcode
                    </div>
                    <button type="button" onClick={onClose}
                        className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                        <X className="size-4" />
                    </button>
                </div>

                {/* Viewfinder — CSS zoom works on all devices (iOS + Android) */}
                <div className="relative w-full overflow-hidden bg-black" style={{ maxHeight: '60vh' }}>
                    <video
                        ref={videoRef}
                        className="w-full"
                        style={{ display: 'block', transform: 'scale(2)', transformOrigin: 'center center' }}
                        playsInline muted autoPlay
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scan guide overlay */}
                    {ready && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            <div className="relative h-20 w-64">
                                <div className="absolute inset-0"
                                    style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)' }} />
                                <span className="absolute left-0 top-0 h-5 w-5 border-l-2 border-t-2 border-teal-400 rounded-tl" />
                                <span className="absolute right-0 top-0 h-5 w-5 border-r-2 border-t-2 border-teal-400 rounded-tr" />
                                <span className="absolute bottom-0 left-0 h-5 w-5 border-b-2 border-l-2 border-teal-400 rounded-bl" />
                                <span className="absolute bottom-0 right-0 h-5 w-5 border-b-2 border-r-2 border-teal-400 rounded-br" />
                                <span className="absolute inset-x-3 top-1/2 h-0.5 bg-teal-400 opacity-80 animate-pulse" />
                            </div>
                        </div>
                    )}

                    {!ready && !error && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="rounded-lg bg-black/70 px-4 py-2 text-sm text-white">กำลังเปิดกล้อง…</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3">
                    {error
                        ? <p className="text-sm text-red-400">{error}</p>
                        : <p className="text-xs text-white/50">จ่อกล้องให้ barcode อยู่ในกรอบ · ระยะ 10–30 ซม.</p>
                    }
                </div>
            </div>
        </div>
    )
}

export default CameraScanner
