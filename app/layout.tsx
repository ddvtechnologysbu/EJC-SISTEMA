import type React from "react"
import "@/app/globals.css"
import { Inter } from "next/font/google"
import { Header } from "@/components/layout/header"
import { MainNav } from "@/components/layout/main-nav"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"
import { AuthProvider } from "@/lib/auth/auth-context"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "EJC - Gestão de Custos",
  description: "Sistema de gerenciamento de custos para o Encontro de Jovens com Cristo",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <div className="flex min-h-screen flex-col">
              <Header />
              <div className="flex flex-1">
                {/* Menu para desktop */}
                <aside className="hidden w-14 md:w-64 flex-col border-r md:flex">
                  <div className="flex flex-col gap-2 p-4">
                    <MainNav />
                  </div>
                </aside>

                <main className="flex-1 p-4 md:p-6">{children}</main>
              </div>
            </div>
            <Toaster />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
