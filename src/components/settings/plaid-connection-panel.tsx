"use client"

import { useState, useCallback, useEffect } from "react"
import { usePlaidLink, PlaidLinkOnSuccessMetadata } from "react-plaid-link"
import { Landmark, Trash2, RefreshCw, Loader2, FileSpreadsheet } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface PlaidAccount {
  id: string
  name: string
  type: string
  subtype: string | null
  currentBalanceCents: number
}

interface PlaidItem {
  id: string
  institutionName: string
  syncStatus: string
  lastSyncedAt: number | null
  lastError: string | null
  accounts: PlaidAccount[]
}

interface Props {
  initialItems: PlaidItem[]
}

function formatBalance(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100)
}

function formatSyncedAt(ts: number | null): string {
  if (!ts) return "Never synced"
  return new Date(ts * 1000).toLocaleString()
}

export function PlaidConnectionPanel({ initialItems }: Props) {
  const [items, setItems] = useState<PlaidItem[]>(initialItems)
  const [linkToken, setLinkToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  async function fetchLinkToken() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to create link token")
      setLinkToken(data.link_token)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const onPlaidSuccess = useCallback(
    async (publicToken: string, metadata: PlaidLinkOnSuccessMetadata) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/plaid/exchange-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_token: publicToken,
            institution_id: metadata.institution?.institution_id ?? "",
            institution_name: metadata.institution?.name ?? "Unknown",
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error ?? "Exchange failed")
        }
        // Refresh items list
        const itemsRes = await fetch("/api/plaid/items")
        const itemsData = await itemsRes.json()
        setItems(itemsData.items)
        setLinkToken(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    },
    [setItems, setError],
  )

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
    onExit: () => setLinkToken(null),
  })

  // Auto-open Plaid Link once token is ready
  useEffect(() => {
    if (linkToken && ready) {
      open()
    }
  }, [linkToken, ready, open])

  async function handleConnect() {
    if (!linkToken) {
      await fetchLinkToken()
    } else if (ready) {
      open()
    }
  }

  async function handleDisconnect(itemId: string) {
    setDeletingId(itemId)
    setError(null)
    try {
      const res = await fetch(`/api/plaid/items/${itemId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to disconnect")
      setItems((prev) => prev.filter((i) => i.id !== itemId))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setDeletingId(null)
    }
  }

  async function handleSync() {
    setSyncing(true)
    setError(null)
    try {
      const res = await fetch("/api/plaid/sync", { method: "POST" })
      if (!res.ok) throw new Error("Sync failed")
      // Refresh items to show updated syncStatus + lastSyncedAt
      const itemsRes = await fetch("/api/plaid/items")
      const itemsData = await itemsRes.json()
      setItems(itemsData.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Bank Accounts</CardTitle>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="size-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="size-3 mr-1" />
                )}
                Sync now
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConnect}
              disabled={loading}
            >
              {loading ? <Loader2 className="size-3 animate-spin mr-1" /> : null}
              Connect bank
            </Button>
          </div>
        </div>
        <CardDescription>
          Connected banks auto-update your financial snapshot daily.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No banks connected yet.</p>
        ) : (
          items.map((item) => (
            <div key={item.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.institutionName}</p>
                  <p className="text-xs text-muted-foreground">
                    Last synced: {formatSyncedAt(item.lastSyncedAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      item.syncStatus === "error"
                        ? "text-destructive border-destructive/20 bg-destructive/5"
                        : item.syncStatus === "syncing"
                          ? "text-blue-600 dark:text-blue-400 border-blue-600/20 bg-blue-600/5"
                          : "text-green-600 dark:text-green-400 border-green-600/20 bg-green-600/5"
                    }
                  >
                    {item.syncStatus}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDisconnect(item.id)}
                    disabled={deletingId === item.id}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>

              {item.lastError && (
                <p className="text-xs text-destructive">{item.lastError}</p>
              )}

              <div className="space-y-1">
                {item.accounts.map((acct) => (
                  <div key={acct.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {acct.name}
                      {acct.subtype && (
                        <span className="ml-1 text-xs">({acct.subtype})</span>
                      )}
                    </span>
                    <span className="font-mono tabular-nums">
                      {formatBalance(acct.currentBalanceCents)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}

        {/* Coming soon: CSV import */}
        <div className="flex items-center justify-between rounded-lg border border-dashed p-3 opacity-60">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="size-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">Import bank statements</p>
              <p className="text-xs text-muted-foreground">Upload CSV or OFX files for historical data</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">Coming soon</Badge>
        </div>
      </CardContent>
    </Card>
  )
}
