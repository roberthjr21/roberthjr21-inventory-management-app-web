"use client"

import { useEffect, useState } from "react"

export function Clock() {
  const [time, setTime] = useState<string>("")

  useEffect(() => {
    // Set initial time
    const updateTime = () => {
      const now = new Date()
      const day = now.toLocaleDateString("es-ES", { weekday: "short" })
      const hours = String(now.getHours() % 12 || 12).padStart(2, "0")
      const minutes = String(now.getMinutes()).padStart(2, "0")
      const period = now.getHours() >= 12 ? "p.m." : "a.m."
      setTime(`${day} ${hours}:${minutes} ${period}`)
    }

    updateTime()
    const interval = setInterval(updateTime, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="flex flex-col items-center gap-0.5">
      <p className="text-xs font-medium text-foreground">{time}</p>
    </div>
  )
}
