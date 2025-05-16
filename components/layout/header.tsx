"use client"

import { useState } from "react"
import { BarChart3, Menu, X, LogOut } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { MainNav } from "@/components/layout/main-nav"
import { useAuth } from "@/lib/auth/auth-context"
import { useRouter } from "next/navigation"
import { toast } from "@/components/ui/use-toast"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user, signOut } = useAuth()
  const router = useRouter()

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLogout = async () => {
    await signOut()
    toast({
      title: "Logout realizado",
      description: "Você saiu do sistema com sucesso.",
    })
    router.push("/login")
  }

  return (
    <>
      <div className="flex h-16 items-center justify-between px-4 border-b">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-6 w-6" />
          <span>EJC - Gestão de Custos</span>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="hidden md:flex">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          )}

          {/* Botão do menu móvel */}
          <div className="md:hidden">
            <Button variant="outline" size="icon" onClick={toggleMenu}>
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Menu móvel */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 bg-background md:hidden" style={{ top: "64px" }}>
          <div className="p-4">
            <MainNav onItemClick={() => setIsMenuOpen(false)} />

            {user && (
              <div className="mt-4 pt-4 border-t">
                <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
