import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"

// Criando um cliente Supabase para o lado do servidor
export function createServerClient() {
  const cookieStore = cookies()

  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
    },
  })
}
