'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NearMissRedirect() {
  const router = useRouter()
  useEffect(() => { router.replace('/safety/near-misses') }, [router])
  return null
}
