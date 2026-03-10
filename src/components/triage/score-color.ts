export function getScoreColor(score: number): string {
  if (score >= 80) return "text-destructive"
  if (score >= 60) return "text-amber-500"
  return "text-muted-foreground"
}
