"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/ui/data-table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabaseClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils/format"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Eye } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Tipos
interface Team {
  id: number
  name: string
}

interface PurchaseItem {
  id: number
  product_name: string
  unit_of_measure: string
  quantity: number
  unit_price: number
  subtotal: number
  notes?: string
}

interface Purchase {
  id: number
  purchase_date: string
  team: Team
  location_name: string
  notes?: string
  items: PurchaseItem[]
  total: number
}

export default function PurchaseList() {
  // Estados
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)

  // Filtros
  const [teamFilter, setTeamFilter] = useState<string>("")
  const [productFilter, setProductFilter] = useState<string>("")
  const [locationFilter, setLocationFilter] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [activeTab, setActiveTab] = useState<string>("table")

  // Verificar se é dispositivo móvel
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    // Verificar inicialmente
    checkMobile()

    // Adicionar listener para redimensionamento
    window.addEventListener("resize", checkMobile)

    // Limpar listener
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  // Buscar equipes
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const { data, error } = await supabaseClient.from("teams").select("id, name").order("name")

        if (error) {
          throw error
        }

        setTeams(data || [])
      } catch (error) {
        console.error("Erro ao buscar equipes:", error)
        toast({
          title: "Erro ao buscar equipes",
          description: "Não foi possível carregar a lista de equipes.",
          variant: "destructive",
        })
      }
    }

    fetchTeams()
  }, [])

  // Buscar compras
  useEffect(() => {
    const fetchPurchases = async () => {
      setLoading(true)

      try {
        let query = supabaseClient
          .from("purchases")
          .select(`
          id,
          purchase_date,
          team_id,
          teams(id, name),
          location_name,
          notes,
          purchase_items(id, product_name, unit_of_measure, quantity, unit_price, subtotal, notes)
        `)
          .order("purchase_date", { ascending: false })

        // Aplicar filtros
        if (teamFilter && teamFilter !== "all") {
          query = query.eq("team_id", teamFilter)
        }

        if (locationFilter) {
          query = query.ilike("location_name", `%${locationFilter}%`)
        }

        if (startDate) {
          query = query.gte("purchase_date", startDate)
        }

        if (endDate) {
          // Adicionar um dia ao endDate para incluir compras feitas no último dia
          const nextDay = new Date(endDate)
          nextDay.setDate(nextDay.getDate() + 1)
          query = query.lt("purchase_date", nextDay.toISOString().split("T")[0])
        }

        const { data, error } = await query

        if (error) {
          throw error
        }

        // Filtrar por produto se necessário
        let filteredData = data || []

        if (productFilter) {
          filteredData = filteredData.filter((purchase) => {
            const items = purchase.purchase_items || []
            return items.some((item) => item.product_name.toLowerCase().includes(productFilter.toLowerCase()))
          })
        }

        // Processar os dados
        const processedPurchases = filteredData.map((purchase) => {
          const items = purchase.purchase_items || []
          const total = items.reduce((sum, item) => sum + Number(item.subtotal), 0)

          return {
            id: purchase.id,
            purchase_date: purchase.purchase_date,
            team: purchase.teams as Team,
            location_name: purchase.location_name,
            notes: purchase.notes,
            items,
            total,
          }
        })

        setPurchases(processedPurchases)
      } catch (error) {
        console.error("Erro ao buscar compras:", error)
        toast({
          title: "Erro ao buscar compras",
          description: "Não foi possível carregar a lista de compras.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPurchases()
  }, [teamFilter, productFilter, locationFilter, startDate, endDate])

  // Definir colunas da tabela
  const columns: ColumnDef<Purchase>[] = [
    {
      accessorKey: "purchase_date",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.purchase_date),
    },
    {
      accessorKey: "team.name",
      header: "Equipe",
    },
    {
      accessorKey: "location_name",
      header: "Local",
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.total),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setSelectedPurchase(row.original)}>
          <Eye className="h-4 w-4" />
          <span className="sr-only">Ver detalhes</span>
        </Button>
      ),
    },
  ]

  // Colunas para dispositivos móveis
  const mobileColumns: ColumnDef<Purchase>[] = [
    {
      accessorKey: "purchase_date",
      header: "Data",
      cell: ({ row }) => formatDate(row.original.purchase_date),
    },
    {
      accessorKey: "team.name",
      header: "Equipe",
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.total),
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <Button variant="ghost" size="icon" onClick={() => setSelectedPurchase(row.original)}>
          <Eye className="h-4 w-4" />
          <span className="sr-only">Ver detalhes</span>
        </Button>
      ),
    },
  ]

  // Componente de cartão para visualização em lista
  const PurchaseCard = ({ purchase }: { purchase: Purchase }) => (
    <Card className="mb-4" onClick={() => setSelectedPurchase(purchase)}>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-medium">{formatDate(purchase.purchase_date)}</p>
            <p className="text-sm text-muted-foreground">{purchase.team.name}</p>
          </div>
          <p className="font-bold">{formatCurrency(purchase.total)}</p>
        </div>
        <p className="text-sm truncate">{purchase.location_name}</p>
        <p className="text-xs text-muted-foreground mt-1">
          {purchase.items.length} {purchase.items.length === 1 ? "item" : "itens"}
        </p>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Lista de Compras</h1>
        <p className="text-muted-foreground">Visualize e filtre as compras registradas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="team">Equipe</Label>
              <Select value={teamFilter} onValueChange={setTeamFilter}>
                <SelectTrigger id="team">
                  <SelectValue placeholder="Todas as equipes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as equipes</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id.toString()}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product">Produto</Label>
              <Input
                id="product"
                placeholder="Buscar por produto"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Local</Label>
              <Input
                id="location"
                placeholder="Buscar por local"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="startDate">Data Inicial</Label>
                <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Data Final</Label>
                <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setTeamFilter("")
                setProductFilter("")
                setLocationFilter("")
                setStartDate("")
                setEndDate("")
              }}
              className="w-full sm:w-auto"
            >
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {isMobile && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cards">Cartões</TabsTrigger>
            <TabsTrigger value="table">Tabela</TabsTrigger>
          </TabsList>
        </Tabs>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compras</CardTitle>
        </CardHeader>
        <CardContent className="overflow-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <p>Carregando...</p>
            </div>
          ) : purchases.length === 0 ? (
            <div className="flex justify-center py-8">
              <p>Nenhuma compra encontrada.</p>
            </div>
          ) : isMobile && activeTab === "cards" ? (
            <div>
              {purchases.map((purchase) => (
                <PurchaseCard key={purchase.id} purchase={purchase} />
              ))}
            </div>
          ) : (
            <DataTable columns={isMobile ? mobileColumns : columns} data={purchases} />
          )}
        </CardContent>
      </Card>

      {/* Modal de detalhes da compra */}
      <Dialog open={!!selectedPurchase} onOpenChange={(open) => !open && setSelectedPurchase(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-medium text-muted-foreground">Data</h4>
                  <p>{formatDate(selectedPurchase.purchase_date)}</p>
                </div>

                <div>
                  <h4 className="font-medium text-muted-foreground">Equipe</h4>
                  <p>{selectedPurchase.team.name}</p>
                </div>

                <div>
                  <h4 className="font-medium text-muted-foreground">Local</h4>
                  <p>{selectedPurchase.location_name}</p>
                </div>

                {selectedPurchase.notes && (
                  <div>
                    <h4 className="font-medium text-muted-foreground">Observações</h4>
                    <p>{selectedPurchase.notes}</p>
                  </div>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Itens</h4>
                <div className="border rounded-lg overflow-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted">
                        <th className="px-4 py-2 text-left">Produto</th>
                        <th className="px-4 py-2 text-left">Quantidade</th>
                        <th className="px-4 py-2 text-left">Preço Unit.</th>
                        <th className="px-4 py-2 text-left">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPurchase.items.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="px-4 py-2">{item.product_name}</td>
                          <td className="px-4 py-2">
                            {item.quantity} {item.unit_of_measure}
                          </td>
                          <td className="px-4 py-2">{formatCurrency(item.unit_price)}</td>
                          <td className="px-4 py-2">{formatCurrency(item.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t font-medium">
                        <td className="px-4 py-2" colSpan={3}>
                          Total
                        </td>
                        <td className="px-4 py-2">{formatCurrency(selectedPurchase.total)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
