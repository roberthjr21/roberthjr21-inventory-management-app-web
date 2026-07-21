import { AppShell } from "@/components/app-shell"
import { StoreProvider } from "@/lib/store"
import { Toaster } from "@/components/ui/sonner"

export default function Page() {
  return (
    <StoreProvider>
      <AppShell />
      <Toaster position="top-center" richColors />
    </StoreProvider>
  )
}
