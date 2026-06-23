'use client'

import { useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Photo360ViewerProps {
  is360: boolean
  src: string
  onClose: () => void
}

export default function Photo360Viewer({ is360, src, onClose }: Photo360ViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [offsetX, setOffsetX] = useState(0)
  const dragging = useRef(false)
  const lastX = useRef(0)

  if (!is360) return null

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    lastX.current = e.clientX
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    setOffsetX((prev) => prev + dx * 1.5)
  }

  const onMouseUp = () => {
    dragging.current = false
  }

  const onTouchStart = (e: React.TouchEvent) => {
    dragging.current = true
    lastX.current = e.touches[0].clientX
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging.current) return
    const dx = e.touches[0].clientX - lastX.current
    lastX.current = e.touches[0].clientX
    setOffsetX((prev) => prev + dx * 1.5)
  }

  const onTouchEnd = () => {
    dragging.current = false
  }

  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-50 select-none">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 bg-black/60 z-10">
        <div className="flex items-center gap-2">
          <span className="bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded">360°</span>
          <span className="text-white text-sm font-medium">360°写真 - ドラッグして回転</span>
        </div>
        <button onClick={onClose} className="text-white hover:text-slate-300">
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Panorama container */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden cursor-grab active:cursor-grabbing flex items-center"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div
          style={{
            transform: `translateX(${offsetX}px)`,
            transition: dragging.current ? 'none' : 'transform 0.05s ease-out',
            width: '200%',
            display: 'flex',
          }}
        >
          {/* Duplicate image for seamless loop effect */}
          <img
            src={src}
            alt="360°写真"
            className="w-1/2 object-cover"
            draggable={false}
            style={{ maxHeight: '100vh' }}
          />
          <img
            src={src}
            alt="360°写真"
            className="w-1/2 object-cover"
            draggable={false}
            style={{ maxHeight: '100vh' }}
          />
        </div>
      </div>
    </div>
  )
}
