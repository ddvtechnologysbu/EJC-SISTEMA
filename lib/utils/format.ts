// Função para formatar valores monetários em formato brasileiro (R$)
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value)
}

// Função para formatar datas em formato brasileiro
export function formatDate(date: Date | string): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("pt-BR")
}

// Função para formatar data e hora em formato brasileiro
export function formatDateTime(date: Date | string): string {
  if (!date) return ""
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("pt-BR")
}
