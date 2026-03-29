import { startScheduler } from "./scheduler.js"

console.log("[companion] Clarity Companion v0.1.0")

startScheduler().catch((err) => {
  console.error("[companion] Fatal:", err)
  process.exit(1)
})
