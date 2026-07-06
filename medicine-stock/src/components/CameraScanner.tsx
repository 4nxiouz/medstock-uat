import { Camera, Flashlight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Props = {
    open: boolean
    onClose: () => void
    onScan: (barcode: string) => void
}

export default function CameraScanner({ open, onClose, onScan }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const rafRef = useRef<number>(0)
    const activeRef = useRef(false)
    const lastScanRef = useRef(0)

    const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
    const [error, setError] = useState('')
    const [torchOn, setTorchOn] = useState(false)
    const [hasTorch, setHasTorch] = useState(false)
    const [flash, setFlash] = useState(false)

    useEffect(() => {
        if (!open) return

        setStatus('loading')
        setError('')
        setTorchOn(false)
        activeRef.current = true

        async function start() {
            try {
                // 1280×720 forces main autofocus camera on both iOS and Android
                // (ultra-wide / front cameras typically don't support this resolution)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { min: 640, ideal: 1280, max: 1920 },
                        height: { min: 480, ideal: 720, max: 1080 },
                    },
                    audio: false,
                })

                if (!activeRef.current) { stream.getTracks().forEach(t => t.stop()); return }
                streamRef.current = stream

                // Check torch support (Android Chrome mainly)
                const track = stream.getVideoTracks()[0]
                const caps = track.getCapabilities() as Record<string, unknown>
                if ('torch' in caps) setHasTorch(true)

                // Attach to video element
                const video = videoRef.current!
                video.srcObject = stream
                await video.play()
                setStatus('ready')

                // Load ZBar WASM lazily
                const { scanImageData } = await import('@undecaf/zbar-wasm')
                const canvas = canvasRef.current!
                const ctx = canvas.getContext('2d', { willReadFrequently: true })!

                function tick() {
                    if (!activeRef.current) return

                    // Throttle: scan every 300ms so camera has time to autofocus between scans
                    const now = Date.now()
                    if (now - lastScanRef.current >= 300 && video.readyState === video.HAVE_ENOUGH_DATA) {
                        lastScanRef.current = now

                        canvas.width = video.videoWidth
                        canvas.height = video.videoHeight
                        ctx.drawImage(video, 0, 0)
                        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

                        scanImageData(imageData).then((results) => {
                            if (!activeRef.current) return
                            const value = results[0]?.decode()?.trim()
                            if (value) {
                                setFlash(true)
                                setTimeout(() => {
                                    onScan(value)
                                    onClose()
                                }, 120)
                            }
                        }).catch(() => {})
                    }

                    rafRef.current = requestAnimationFrame(tick)
                }

                tick()
            } catch (e) {
                if (!activeRef.current) return
                const msg = e instanceof Error ? e.message : ''
                if (msg.includes('Permission') || msg.includes('NotAllowed')) {
                    setError('กรุณาอนุญาต Camera permission ในการตั้งค่าเบราว์เซอร์')
                } else if (msg.includes('NotFound') || msg.includes('DevicesNotFound')) {
                    setError('ไม่พบกล้องในอุปกรณ์นี้')
                } else {
                    setError('ไม่สามารถเปิดกล้องได้ — ลองรีเฟรชหน้าใหม่')
                }
                setStatus('error')
            }
        }

        void start()

        return () => {
            activeRef.current = false
            cancelAnimationFrame(rafRef.current)
            streamRef.current?.getTracks().forEach(t => t.stop())
            streamRef.current = null
            if (videoRef.current) videoRef.current.srcObject = null
            setStatus('loading')
            setHasTorch(false)
            setFlash(false)
        }
    }, [open, onClose, onScan])

    async function toggleTorch() {
        const track = streamRef.current?.getVideoTracks()[0]
        if (!track) return
        const next = !torchOn
        try {
            await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] })
            setTorchOn(next)
        } catch { /* unsupported */ }
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center">
            <div className="w-full overflow-hidden rounded-t-2xl bg-black sm:max-w-md sm:rounded-2xl">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-white">
                        <Camera className="size-4 text-teal-400" />
                        สแกน Barcode
                    </div>
                    <div className="flex items-center gap-2">
                        {hasTorch && (
                            <button type="button" onClick={() => void toggleTorch()}
                                className={`inline-flex size-9 items-center justify-center rounded-full transition ${torchOn ? 'bg-yellow-400 text-black' : 'bg-white/15 text-white'}`}>
                                <Flashlight className="size-4" />
                            </button>
                        )}
                        <button type="button" onClick={onClose}
                            className="inline-flex size-9 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
                            <X className="size-4" />
                        </button>
                    </div>
                </div>

                {/* Viewfinder */}
                <div className="relative w-full bg-black" style={{ aspectRatio: '4/3' }}>
                    <video
                        ref={videoRef}
                        className="absolute inset-0 h-full w-full object-cover"
                        playsInline muted autoPlay
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Flash feedback on scan */}
                    {flash && <div className="absolute inset-0 bg-white/60" />}

                    {/* Scan overlay */}
                    {status === 'ready' && (
                        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                            {/* dim surround */}
                            <div className="absolute inset-0 bg-black/30" />
                            {/* scan window */}
                            <div className="relative h-28 w-72 rounded-lg">
                                <div className="absolute inset-0 rounded-lg"
                                    style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.35)' }} />
                                {/* corner brackets */}
                                {[
                                    'top-0 left-0 border-t-2 border-l-2 rounded-tl-lg',
                                    'top-0 right-0 border-t-2 border-r-2 rounded-tr-lg',
                                    'bottom-0 left-0 border-b-2 border-l-2 rounded-bl-lg',
                                    'bottom-0 right-0 border-b-2 border-r-2 rounded-br-lg',
                                ].map((cls) => (
                                    <span key={cls} className={`absolute h-5 w-5 border-teal-400 ${cls}`} />
                                ))}
                                {/* scan line */}
                                <span className="absolute inset-x-3 top-1/2 h-0.5 -translate-y-1/2 bg-teal-400 opacity-80 animate-pulse" />
                            </div>
                        </div>
                    )}

                    {/* Loading state */}
                    {status === 'loading' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="flex flex-col items-center gap-3">
                                <div className="size-8 animate-spin rounded-full border-2 border-white/20 border-t-teal-400" />
                                <span className="text-sm text-white/70">กำลังเปิดกล้อง…</span>
                            </div>
                        </div>
                    )}

                    {/* Error state */}
                    {status === 'error' && (
                        <div className="absolute inset-0 flex items-center justify-center p-6">
                            <p className="text-center text-sm text-red-300">{error}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-4 py-3 pb-6">
                    {status === 'ready'
                        ? <p className="text-center text-xs text-white/50">จ่อกล้องให้ barcode อยู่ในกรอบ · ระยะ 10–20 ซม.</p>
                        : status === 'error'
                        ? <button type="button" onClick={onClose}
                            className="mx-auto block text-sm text-teal-400 underline">ปิด</button>
                        : null
                    }
                </div>
            </div>
        </div>
    )
}
