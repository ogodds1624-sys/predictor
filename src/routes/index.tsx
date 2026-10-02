import { createFileRoute } from "@tanstack/react-router"
import { Desk } from "@/components/altimeter/desk"

export const Route = createFileRoute("/")({
  component: Home,
})

function Home() {
  return (
    <main className="min-h-dvh bg-white text-[#1c1c1c]">
      <Desk />
    </main>
  )
}
