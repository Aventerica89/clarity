"use client"

import "@xyflow/react/dist/style.css"
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
} from "@xyflow/react"
import dagre from "@dagrejs/dagre"
import { useRouter } from "next/navigation"
import { useEffect, useState, useCallback } from "react"
import type { GraphNode, GraphEdge } from "@/app/api/life-context/graph/route"

// ─── Dagre auto-layout ────────────────────────────────────────────────────────

function getLayoutedElements(nodes: Node[], edges: Edge[]) {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 80 })

  nodes.forEach((node) => g.setNode(node.id, { width: 180, height: 40 }))
  edges.forEach((edge) => g.setEdge(edge.source, edge.target))

  dagre.layout(g)

  return {
    nodes: nodes.map((node) => {
      const { x, y } = g.node(node.id)
      return { ...node, position: { x: x - 90, y: y - 20 } }
    }),
    edges,
  }
}

// ─── Node styling by type + severity ─────────────────────────────────────────

function getNodeStyle(type: string, severity?: string): React.CSSProperties {
  if (type === "context") {
    switch (severity) {
      case "critical":
        return { background: "#fee2e2", border: "2px solid #ef4444", borderRadius: 6 }
      case "escalated":
        return { background: "#ffedd5", border: "2px solid #fb923c", borderRadius: 6 }
      case "active":
        return { background: "#fefce8", border: "2px solid #facc15", borderRadius: 6 }
      default:
        return { background: "#f0fdf4", border: "2px solid #4ade80", borderRadius: 6 }
    }
  }
  switch (type) {
    case "task":
      return { background: "#eff6ff", border: "2px solid #60a5fa", borderRadius: 6 }
    case "email":
      return { background: "#faf5ff", border: "2px solid #c084fc", borderRadius: 6 }
    case "event":
      return { background: "#eef2ff", border: "2px solid #818cf8", borderRadius: 6 }
    default:
      return { background: "#f9fafb", border: "2px solid #9ca3af", borderRadius: 6 }
  }
}

// ─── Transform API response → ReactFlow nodes/edges ──────────────────────────

function buildFlowElements(apiNodes: GraphNode[], apiEdges: GraphEdge[]) {
  const nodes: Node[] = apiNodes.map((n) => ({
    id: n.id,
    position: { x: 0, y: 0 },
    data: {
      label: n.label.length > 28 ? `${n.label.slice(0, 28)}…` : n.label,
      type: n.type,
      severity: n.severity,
    },
    style: getNodeStyle(n.type, n.severity),
  }))

  const edges: Edge[] = apiEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    style: { stroke: "#94a3b8" },
  }))

  return getLayoutedElements(nodes, edges)
}

// ─── Navigation helper ────────────────────────────────────────────────────────

function getEntityPath(type: string, id: string): string {
  switch (type) {
    case "context": return `/life-context/${id}`
    case "task": return "/tasks"
    case "email": return "/email"
    case "event": return "/calendar"
    default: return "/life-context"
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

function ContextGraphInner() {
  const router = useRouter()
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOrphans, setShowOrphans] = useState(false)
  const [allNodes, setAllNodes] = useState<Node[]>([])
  const [allEdges, setAllEdges] = useState<Edge[]>([])

  useEffect(() => {
    async function fetchGraph() {
      try {
        const res = await fetch("/api/life-context/graph")
        if (!res.ok) throw new Error("Failed to load graph data")
        const data = (await res.json()) as { nodes: GraphNode[]; edges: GraphEdge[] }
        const { nodes: layouted, edges: layoutedEdges } = buildFlowElements(data.nodes, data.edges)
        setAllNodes(layouted)
        setAllEdges(layoutedEdges)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setLoading(false)
      }
    }
    void fetchGraph()
  }, [])

  // Filter orphaned nodes (nodes with no connected edges) unless showOrphans is true
  useEffect(() => {
    if (allNodes.length === 0) return
    const connectedIds = new Set<string>()
    for (const edge of allEdges) {
      connectedIds.add(edge.source)
      connectedIds.add(edge.target)
    }
    const visibleNodes = showOrphans
      ? allNodes
      : allNodes.filter((n) => connectedIds.has(n.id))
    setNodes(visibleNodes)
    setEdges(allEdges)
  }, [allNodes, allEdges, showOrphans, setNodes, setEdges])

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const nodeType = node.data.type as string
      const path = getEntityPath(nodeType, node.id)
      router.push(path)
    },
    [router],
  )

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading graph...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    )
  }

  if (allNodes.length === 0) {
    return (
      <div className="flex h-[calc(100vh-200px)] w-full items-center justify-center">
        <p className="text-muted-foreground text-sm">
          No context items in the last 60 days.
        </p>
      </div>
    )
  }

  return (
    <div className="relative h-[calc(100vh-200px)] w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Background />
        <Controls />
      </ReactFlow>

      <button
        onClick={() => setShowOrphans((prev) => !prev)}
        className="absolute bottom-4 right-4 z-10 rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium shadow-sm hover:bg-muted"
      >
        {showOrphans ? "Hide isolated items" : "Show all items"}
      </button>
    </div>
  )
}

export function ContextGraph() {
  return (
    <ReactFlowProvider>
      <ContextGraphInner />
    </ReactFlowProvider>
  )
}
