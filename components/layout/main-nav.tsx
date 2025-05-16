"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Home, ListChecks, FileText, ShoppingCart } from "lucide-react"

const items = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
  },
  {
    title: "Registrar Compra",
    href: "/compras/registrar",
    icon: ShoppingCart,
  },
  {
    title: "Lista de Compras",
    href: "/compras/lista",
    icon: ListChecks,
  },
  {
    title: "Relatórios",
    href: "/relatorios",
    icon: FileText,
  },
]

interface MainNavProps {
  onItemClick?: () => void
}

export function MainNav({ onItemClick }: MainNavProps) {
  const pathname = usePathname()

  return (
    <nav className="grid gap-2 md:gap-4">
      {items.map((item) => {
        const Icon = item.icon
        const isActive = pathname === item.href

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:text-primary",
              isActive ? "bg-muted text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        )
      })}
    </nav>
  )
}
