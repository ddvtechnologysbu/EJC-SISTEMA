"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { supabaseClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/format"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { DollarSign, ShoppingBag, Package } from "lucide-react"
import { useEffect, useState } from "react"

// Cores para os gráficos - Paleta mais harmoniosa e acessível
const COLORS = [
  "#2563eb", // Azul
  "#16a34a", // Verde
  "#ea580c", // Laranja
  "#9333ea", // Roxo
  "#e11d48", // Vermelho
  "#0891b2", // Ciano
  "#ca8a04", // Amarelo
  "#4f46e5", // Índigo
  "#be123c", // Rosa
  "#1e40af", // Azul escuro
  "#15803d", // Verde escuro
  "#c2410c", // Laranja escuro
  "#7e22ce", // Roxo escuro
  "#be185d", // Rosa escuro
  "#0e7490", // Ciano escuro
]

// Função para truncar nomes longos
const truncateName = (name: string, maxLength = 20) => {
  return name.length > maxLength ? `${name.substring(0, maxLength)}...` : name
}

interface TeamTotal {
  id: number
  name: string
  value: number
}

interface ProductTotal {
  name: string
  value: number
}

interface KPIs {
  totalGasto: number
  totalCompras: number
  totalProdutos: number
}

export default function DashboardContent() {
  const [teamTotals, setTeamTotals] = useState<TeamTotal[]>([])
  const [top10Products, setTop10Products] = useState<ProductTotal[]>([])
  const [kpis, setKpis] = useState<KPIs>({ totalGasto: 0, totalCompras: 0, totalProdutos: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        // Buscar total gasto por equipe
        const { data: teamExpenses, error: teamError } = await supabaseClient.from("purchases").select(`
          team_id,
          teams(id, name),
          purchase_items(subtotal)
        `)

        if (teamError) {
          throw teamError
        }

        // Processar dados para o gráfico de pizza
        const teamTotals =
          teamExpenses?.reduce((acc, purchase) => {
            const teamId = purchase.team_id
            const teamName = purchase.teams?.name || "Desconhecido"
            const subtotals = purchase.purchase_items || []

            const total = subtotals.reduce((sum, item) => sum + Number(item.subtotal), 0)

            const existingTeam = acc.find((t) => t.id === teamId)
            if (existingTeam) {
              existingTeam.value += total
            } else {
              acc.push({ id: teamId, name: teamName, value: total })
            }

            return acc
          }, [] as TeamTotal[]) || []

        // Ordenar por valor
        teamTotals.sort((a, b) => b.value - a.value)
        setTeamTotals(teamTotals)

        // Buscar total gasto por produto
        const { data: productExpenses, error: productError } = await supabaseClient
          .from("purchase_items")
          .select(`
            product_name,
            subtotal
          `)
          .order("subtotal", { ascending: false })
          .limit(10)

        if (productError) {
          throw productError
        }

        // Processar dados para o gráfico de barras
        const productTotals =
          productExpenses?.reduce((acc, item) => {
            const productName = item.product_name
            const subtotal = Number(item.subtotal)

            const existingProduct = acc.find((p) => p.name === productName)
            if (existingProduct) {
              existingProduct.value += subtotal
            } else {
              acc.push({ name: productName, value: subtotal })
            }

            return acc
          }, [] as ProductTotal[]) || []

        // Ordenar por valor e pegar os 10 maiores
        productTotals.sort((a, b) => b.value - a.value)
        const top10Products = productTotals.slice(0, 10)
        setTop10Products(top10Products)

        // Calcular KPIs
        const totalGasto = teamTotals.reduce((sum, team) => sum + team.value, 0)

        const { count: totalCompras } = await supabaseClient
          .from("purchases")
          .select("*", { count: "exact", head: true })

        const { count: totalProdutos } = await supabaseClient
          .from("purchase_items")
          .select("*", { count: "exact", head: true })

        setKpis({
          totalGasto,
          totalCompras: totalCompras || 0,
          totalProdutos: totalProdutos || 0,
        })
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Carregando...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Dashboard</h1>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalGasto)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Compras</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalCompras}</div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 md:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalProdutos}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Gráfico de Pizza - Gastos por Equipe */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Equipe</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <Pie
                    data={teamTotals}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    innerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                  >
                    {teamTotals.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(name) => `${name}`} />
                  <Legend
                    layout="horizontal"
                    verticalAlign="bottom"
                    align="center"
                    wrapperStyle={{ fontSize: "10px" }}
                    formatter={(value) => truncateName(value, 15)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Barras - Top 10 Produtos */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Produtos (R$)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={top10Products} layout="vertical" margin={{ top: 5, right: 30, left: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis
                    type="number"
                    tickFormatter={(value) => formatCurrency(value).replace("R$", "")}
                    domain={[0, "dataMax"]}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={80}
                    tick={{ fontSize: 10 }}
                    tickFormatter={(value) => truncateName(value, 10)}
                  />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} labelFormatter={(name) => `${name}`} />
                  <Bar dataKey="value" fill="#2563eb" radius={[0, 4, 4, 0]} barSize={15} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
