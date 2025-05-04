"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { getChampionImageUrl } from "@/lib/data-dragon"

interface ChampionImageProps {
  championName: string
  size?: number
  className?: string
}

export default function ChampionImage({ championName, size = 40, className = "" }: ChampionImageProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchImage = async () => {
      try {
        const url = await getChampionImageUrl(championName)
        if (isMounted) {
          setImageUrl(url)
          setError(false)
        }
      } catch (err) {
        if (isMounted) {
          console.error(`Error loading image for ${championName}:`, err)
          setError(true)
        }
      }
    }

    if (championName) {
      fetchImage()
    }

    return () => {
      isMounted = false
    }
  }, [championName])

  if (error || !championName) {
    // Fallback for unknown champions
    return (
      <div
        className={`flex items-center justify-center bg-vasco-black text-white rounded-full overflow-hidden ${className}`}
        style={{ width: size, height: size }}
      >
        {championName ? championName.substring(0, 2) : "??"}
      </div>
    )
  }

  if (!imageUrl) {
    // Loading state
    return (
      <div
        className={`bg-vasco-gray/20 rounded-full animate-pulse ${className}`}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <div className={`relative rounded-full overflow-hidden ${className}`} style={{ width: size, height: size }}>
      <Image
        src={imageUrl || "/placeholder.svg"}
        alt={`${championName} champion icon`}
        width={size}
        height={size}
        className="object-contain"
        priority={size > 40} // Prioritize loading larger images
      />
    </div>
  )
}
