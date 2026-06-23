'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix default icon issue with webpack
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Orange icon for project markers
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

interface MapProject {
  id: string
  name: string
  status: string
  address: string | null
  lat: number | null
  lng: number | null
}

interface ProjectMapProps {
  projects: MapProject[]
}

export default function ProjectMap({ projects }: ProjectMapProps) {
  const pinned = projects.filter((p) => p.lat != null && p.lng != null)

  return (
    <div className="relative w-full h-full rounded-lg overflow-hidden">
      <MapContainer
        center={[35.6812, 139.7671]}
        zoom={10}
        style={{ width: '100%', height: '100%' }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat as number, p.lng as number]}
            icon={orangeIcon}
          >
            <Popup>
              <div className="text-sm">
                <p className="font-semibold text-slate-900 mb-1">{p.name}</p>
                <p className="text-slate-500 text-xs mb-0.5">状態: {p.status}</p>
                {p.address && <p className="text-slate-500 text-xs">{p.address}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {pinned.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[1000]">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-3 shadow text-sm text-slate-600 text-center">
            地図ピンを表示するには案件の住所を登録してください
          </div>
        </div>
      )}
    </div>
  )
}
