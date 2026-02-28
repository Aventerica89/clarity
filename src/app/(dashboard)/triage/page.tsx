import { Suspense } from "react"
import { Loader2 } from "lucide-react"
import { TriagePageContent } from "./triage-content"

export default function TriagePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-12">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <TriagePageContent />
    </Suspense>
  )
}
