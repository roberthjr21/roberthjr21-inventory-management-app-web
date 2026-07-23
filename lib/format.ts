export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

function formatShortDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function isToday(ts: number) {
  const d = new Date(ts)
  const now = new Date()
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  )
}

export function isThisWeek(ts: number) {
  const now = new Date()
  const start = new Date(now)
  const day = (now.getDay() + 6) % 7 // Monday = 0
  start.setDate(now.getDate() - day)
  start.setHours(0, 0, 0, 0)
  return ts >= start.getTime()
}

export function dayKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}
