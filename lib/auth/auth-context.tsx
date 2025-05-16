"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { supabaseClient } from "@/lib/supabase/client"
import type { Session, User } from "@supabase/supabase-js"

type AuthContextType = {
  user: User | null
  session: Session | null
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signUp: (email: string, password: string) => Promise<{ error: any; data: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Verificar se há uma sessão ativa
    const getSession = async () => {
      setIsLoading(true)
      try {
        const {
          data: { session },
          error,
        } = await supabaseClient.auth.getSession()

        if (error) {
          throw error
        }

        setSession(session)
        setUser(session?.user || null)
      } catch (error) {
        console.error("Erro ao verificar sessão:", error)
      } finally {
        setIsLoading(false)
      }
    }

    getSession()

    // Configurar listener para mudanças de autenticação
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user || null)
      setIsLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      console.error("Erro ao fazer login:", error)
      return { error }
    }
  }

  const signUp = async (email: string, password: string) => {
    try {
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
      })
      return { data, error }
    } catch (error) {
      console.error("Erro ao criar conta:", error)
      return { data: null, error }
    }
  }

  const signOut = async () => {
    try {
      await supabaseClient.auth.signOut()
    } catch (error) {
      console.error("Erro ao fazer logout:", error)
    }
  }

  const value = {
    user,
    session,
    isLoading,
    signIn,
    signUp,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider")
  }
  return context
}
