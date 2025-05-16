"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth/auth-context"
import { Loader2 } from "lucide-react"

interface AuthGuardProps {
  children: React.ReactNode
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Se não estiver carregando e não houver usuário, redirecionar para login
    if (!isLoading && !user) {
      // Salvar a URL atual para redirecionamento após o login
      sessionStorage.setItem("redirectAfterLogin", pathname)
      router.push("/login")
    }
  }, [user, isLoading, router, pathname])

  // Mostrar tela de carregamento enquanto verifica a autenticação
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando...</span>
      </div>
    )
  }

  // Se o usuário estiver autenticado, renderizar o conteúdo
  if (user) {
    return <>{children}</>
  }

  // Não renderizar nada enquanto redireciona
  return null
}
