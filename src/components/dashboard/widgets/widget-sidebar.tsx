"use client"

import { useState, useCallback, useRef, type ReactNode, type DragEvent } from "react"
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"

const WIDGET_ORDER_KEY = "clarity-widget-order"

interface WidgetWrapperProps {
  id: string
  children: ReactNode
  onDragStart: (id: string) => void
  onDragOver: (id: string) => void
  onDragEnd: () => void
  isDragging: boolean
  isDragOver: boolean
}

function WidgetWrapper({
  id,
  children,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: WidgetWrapperProps) {
  return (
    <div
      draggable
      onDragStart={() => onDragStart(id)}
      onDragOver={(e: DragEvent) => {
        e.preventDefault()
        onDragOver(id)
      }}
      onDragEnd={onDragEnd}
      className={cn(
        "rounded-lg border bg-card transition-all",
        isDragging && "opacity-50",
        isDragOver && "border-clarity-amber shadow-sm shadow-clarity-amber/10",
        !isDragging && !isDragOver && "hover:border-border/80",
      )}
    >
      <div className="flex items-center gap-1 px-3 pt-2.5">
        <GripVertical className="size-3.5 cursor-grab text-muted-foreground/40 active:cursor-grabbing" />
      </div>
      <div className="px-3.5 pb-3.5 pt-0">
        {children}
      </div>
    </div>
  )
}

interface WidgetConfig {
  id: string
  component: ReactNode
}

function getStoredOrder(widgets: WidgetConfig[]): string[] {
  if (typeof window === "undefined") return widgets.map((w) => w.id)
  try {
    const stored = localStorage.getItem(WIDGET_ORDER_KEY)
    if (!stored) return widgets.map((w) => w.id)
    const order = JSON.parse(stored) as string[]
    const ids = new Set(widgets.map((w) => w.id))
    const valid = order.filter((id) => ids.has(id))
    const missing = widgets.filter((w) => !valid.includes(w.id)).map((w) => w.id)
    return [...valid, ...missing]
  } catch {
    return widgets.map((w) => w.id)
  }
}

export function WidgetSidebar({ widgets }: { widgets: WidgetConfig[] }) {
  const [order, setOrder] = useState<string[]>(() => getStoredOrder(widgets))
  const [dragging, setDragging] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const orderRef = useRef(order)
  orderRef.current = order

  const widgetMap = new Map(widgets.map((w) => [w.id, w]))

  const handleDragStart = useCallback((id: string) => {
    setDragging(id)
  }, [])

  const handleDragOver = useCallback((id: string) => {
    setDragOver(id)
  }, [])

  const handleDragEnd = useCallback(() => {
    if (dragging && dragOver && dragging !== dragOver) {
      const newOrder = [...orderRef.current]
      const fromIdx = newOrder.indexOf(dragging)
      const toIdx = newOrder.indexOf(dragOver)
      newOrder.splice(fromIdx, 1)
      newOrder.splice(toIdx, 0, dragging)
      setOrder(newOrder)
      localStorage.setItem(WIDGET_ORDER_KEY, JSON.stringify(newOrder))
    }
    setDragging(null)
    setDragOver(null)
  }, [dragging, dragOver])

  const sortedWidgets = order
    .map((id) => widgetMap.get(id))
    .filter((w): w is WidgetConfig => w !== undefined)

  return (
    <div className="flex flex-col gap-4 max-md:flex-row max-md:overflow-x-auto max-md:pb-2 max-md:scrollbar-none">
      {sortedWidgets.map((widget) => (
        <div
          key={widget.id}
          className="max-md:w-[280px] max-md:shrink-0"
        >
          <WidgetWrapper
            id={widget.id}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            isDragging={dragging === widget.id}
            isDragOver={dragOver === widget.id}
          >
            {widget.component}
          </WidgetWrapper>
        </div>
      ))}
    </div>
  )
}
