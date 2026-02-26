import {
  Calendar,
  CheckSquare,
  FileText,
  HelpCircle,
  InboxIcon,
  LayoutDashboard,
  Mail,
  MapPin,
  MessageSquare,
  RotateCcw,
  Settings,
  User,
  Wallet,
} from "lucide-react"

export interface NavItem {
  href: string
  label: string
  icon: React.ElementType
  keywords?: string[]
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/getting-started", label: "Getting Started", icon: HelpCircle, keywords: ["help", "onboarding"] },
  { href: "/", label: "Today", icon: LayoutDashboard, keywords: ["home", "dashboard"] },
  { href: "/triage", label: "Triage", icon: InboxIcon, keywords: ["inbox", "score"] },
  { href: "/tasks", label: "Tasks", icon: CheckSquare, keywords: ["todo", "todoist"] },
  { href: "/spending", label: "Spending", icon: Wallet, keywords: ["finance", "money", "transactions"] },
  { href: "/calendar", label: "Calendar", icon: Calendar, keywords: ["events", "schedule"] },
  { href: "/email", label: "Email", icon: Mail, keywords: ["gmail", "inbox"] },
  { href: "/chat", label: "Chat", icon: MessageSquare, keywords: ["coach", "ai"] },
  { href: "/routines", label: "Routines", icon: RotateCcw, keywords: ["habits", "streaks"] },
  { href: "/life-context", label: "Life Context", icon: MapPin, keywords: ["context", "notes"] },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings, keywords: ["integrations", "account"] },
  { href: "/changelog", label: "Changelog", icon: FileText, keywords: ["version", "updates"] },
] as const
