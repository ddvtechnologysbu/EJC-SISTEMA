"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { toast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth/auth-context"
import { BarChart3, Loader2 } from "lucide-react"

// Schema de validação
const loginFormSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

export default function LoginPage() {
  const { signIn } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  // Inicializar o formulário
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  })

  // Enviar o formulário
  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true)

    try {
      const { error } = await signIn(data.email, data.password)

      if (error) {
        toast({
          title: "Erro ao fazer login",
          description: error.message || "Verifique suas credenciais e tente novamente.",
          variant: "destructive",
        })
        return
      }

      // Verificar se há uma URL para redirecionamento após o login
      const redirectUrl = sessionStorage.getItem("redirectAfterLogin") || "/"
      sessionStorage.removeItem("redirectAfterLogin")

      toast({
        title: "Login realizado com sucesso",
        description: "Você foi autenticado com sucesso.",
      })

      router.push(redirectUrl)
    } catch (error) {
      console.error("Erro ao fazer login:", error)
      toast({
        title: "Erro ao fazer login",
        description: "Ocorreu um erro inesperado. Tente novamente mais tarde.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-4">
            <BarChart3 className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl text-center">EJC - Gestão de Custos</CardTitle>
          <CardDescription className="text-center">Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="seu.email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="******" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col">
          <p className="text-sm text-center text-muted-foreground mt-4">
            Entre em contato com o administrador para obter acesso ao sistema.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
