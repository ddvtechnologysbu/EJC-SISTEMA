"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { supabaseClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/utils/format"
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
  LabelList,
} from "recharts"
import { FileDown, Loader2, Eye, AlertTriangle } from "lucide-react"
import html2canvas from "html2canvas"
import { toast } from "@/components/ui/use-toast"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

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

// Tipos
interface Team {
  id: number
  name: string
}

interface TeamExpense {
  id: number
  name: string
  value: number
  total: number
}

interface ProductExpense {
  name: string
  value: number
}

interface KPIs {
  totalGasto: number
  totalCompras: number
  totalProdutos: number
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

export default function ReportsContent() {
  // Estados
  const [title, setTitle] = useState<string>("EJC - Relatório de Custos")
  const [teamExpenses, setTeamExpenses] = useState<TeamExpense[]>([])
  const [productExpenses, setProductExpenses] = useState<ProductExpense[]>([])
  const [kpis, setKpis] = useState<KPIs>({ totalGasto: 0, totalCompras: 0, totalProdutos: 0 })
  const [loading, setLoading] = useState<boolean>(true)
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [pieChartImage, setPieChartImage] = useState<string>("")
  const [barChartImage, setBarChartImage] = useState<string>("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState("resumo")
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [teamFilter, setTeamFilter] = useState<string>("")
  const [pdfError, setPdfError] = useState<string | null>(null)

  const pieChartRef = useRef<HTMLDivElement>(null)
  const barChartRef = useRef<HTMLDivElement>(null)
  const reportRef = useRef<HTMLDivElement>(null)

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
      }
    }

    fetchTeams()
  }, [])

  // Buscar dados
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      try {
        // Buscar total gasto por equipe
        let teamQuery = supabaseClient.from("purchases").select(`
          team_id,
          teams(id, name),
          purchase_items(subtotal)
        `)

        // Aplicar filtros de data
        if (startDate) {
          teamQuery = teamQuery.gte("purchase_date", startDate)
        }

        if (endDate) {
          // Adicionar um dia ao endDate para incluir compras feitas no último dia
          const nextDay = new Date(endDate)
          nextDay.setDate(nextDay.getDate() + 1)
          teamQuery = teamQuery.lt("purchase_date", nextDay.toISOString().split("T")[0])
        }

        const { data: teamData, error: teamError } = await teamQuery

        if (teamError) {
          throw teamError
        }

        // Processar dados para o gráfico de pizza
        const teamTotals =
          teamData?.reduce((acc, purchase) => {
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
          }, [] as TeamExpense[]) || []

        // Ordenar por valor
        teamTotals.sort((a, b) => b.value - a.value)

        // Adicionar o total para cálculos de percentual
        const totalValue = teamTotals.reduce((sum, team) => sum + team.value, 0)
        const enhancedTeamTotals = teamTotals.map((team) => ({
          ...team,
          total: totalValue,
        }))

        setTeamExpenses(enhancedTeamTotals)

        // Buscar total gasto por produto
        let productQuery = supabaseClient.from("purchase_items").select(`
          id,
          product_name,
          subtotal,
          purchase_id,
          purchases(purchase_date)
        `)

        // Aplicar filtros de data
        if (startDate || endDate) {
          const purchasesQuery = supabaseClient.from("purchases").select("id")

          if (startDate) {
            purchasesQuery.gte("purchase_date", startDate)
          }

          if (endDate) {
            // Adicionar um dia ao endDate para incluir compras feitas no último dia
            const nextDay = new Date(endDate)
            nextDay.setDate(nextDay.getDate() + 1)
            purchasesQuery.lt("purchase_date", nextDay.toISOString().split("T")[0])
          }

          const { data: purchaseIds } = await purchasesQuery

          if (purchaseIds && purchaseIds.length > 0) {
            const ids = purchaseIds.map((p) => p.id)
            productQuery = productQuery.in("purchase_id", ids)
          } else {
            // Se não houver compras no período, retornar lista vazia
            setProductExpenses([])
            setKpis({ totalGasto: 0, totalCompras: 0, totalProdutos: 0 })
            setLoading(false)
            return
          }
        }

        const { data: productData, error: productError } = await productQuery

        if (productError) {
          throw productError
        }

        // Processar dados para o gráfico de barras
        const productTotals =
          productData?.reduce((acc, item) => {
            const productName = item.product_name
            const subtotal = Number(item.subtotal)

            const existingProduct = acc.find((p) => p.name === productName)
            if (existingProduct) {
              existingProduct.value += subtotal
            } else {
              acc.push({ name: productName, value: subtotal })
            }

            return acc
          }, [] as ProductExpense[]) || []

        // Ordenar por valor e pegar os 10 maiores
        productTotals.sort((a, b) => b.value - a.value)
        const top10Products = productTotals.slice(0, 10)

        setProductExpenses(top10Products)

        // Calcular KPIs
        const totalGasto = teamTotals.reduce((sum, team) => sum + team.value, 0)

        // Buscar total de compras
        let purchaseCountQuery = supabaseClient.from("purchases").select("*", { count: "exact", head: true })

        if (startDate) {
          purchaseCountQuery = purchaseCountQuery.gte("purchase_date", startDate)
        }

        if (endDate) {
          // Adicionar um dia ao endDate para incluir compras feitas no último dia
          const nextDay = new Date(endDate)
          nextDay.setDate(nextDay.getDate() + 1)
          purchaseCountQuery = purchaseCountQuery.lt("purchase_date", nextDay.toISOString().split("T")[0])
        }

        const { count: totalCompras } = await purchaseCountQuery

        // Buscar total de produtos
        const totalProdutos = productData?.length || 0

        setKpis({
          totalGasto,
          totalCompras: totalCompras || 0,
          totalProdutos,
        })

        // Buscar todas as compras para a lista
        let purchasesQuery = supabaseClient
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

        // Aplicar filtros de data
        if (startDate) {
          purchasesQuery = purchasesQuery.gte("purchase_date", startDate)
        }

        if (endDate) {
          // Adicionar um dia ao endDate para incluir compras feitas no último dia
          const nextDay = new Date(endDate)
          nextDay.setDate(nextDay.getDate() + 1)
          purchasesQuery = purchasesQuery.lt("purchase_date", nextDay.toISOString().split("T")[0])
        }

        // Aplicar filtro de equipe
        if (teamFilter && teamFilter !== "all") {
          purchasesQuery = purchasesQuery.eq("team_id", teamFilter)
        }

        const { data: purchasesData, error: purchasesError } = await purchasesQuery

        if (purchasesError) {
          throw purchasesError
        }

        // Processar os dados das compras
        const processedPurchases =
          purchasesData?.map((purchase) => {
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
          }) || []

        setPurchases(processedPurchases)
      } catch (error) {
        console.error("Erro ao buscar dados:", error)
        toast({
          title: "Erro ao buscar dados",
          description: "Não foi possível carregar os dados para o relatório.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [startDate, endDate, teamFilter])

  // Componente personalizado para tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
          <p className="text-xs text-muted-foreground">
            {((payload[0].value / payload[0].payload.total) * 100).toFixed(2)}% do total
          </p>
        </div>
      )
    }
    return null
  }

  // Componente personalizado para tooltip de barras
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded-md shadow-md">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-sm">{formatCurrency(payload[0].value)}</p>
        </div>
      )
    }
    return null
  }

  // Add a helper function to check if charts are ready to be captured
  // Add this function before the captureCharts function:

  const areChartsReady = () => {
    // Check if charts tab is active
    if (activeTab !== "graficos") {
      return false
    }

    // Check if chart refs exist
    if (!pieChartRef.current || !barChartRef.current) {
      return false
    }

    // Check if charts have dimensions
    const pieRect = pieChartRef.current.getBoundingClientRect()
    const barRect = barChartRef.current.getBoundingClientRect()

    return pieRect.width > 0 && pieRect.height > 0 && barRect.width > 0 && barRect.height > 0
  }

  // Capturar gráficos como imagens para o PDF
  const captureCharts = async () => {
    setIsGeneratingPDF(true)
    setPdfError(null)

    try {
      // First, switch to the charts tab
      setActiveTab("graficos")

      // Wait for the tab switch and initial render
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Check if the chart refs exist
      if (!pieChartRef.current || !barChartRef.current) {
        throw new Error("Os gráficos não estão disponíveis. Aguarde o carregamento completo da página.")
      }

      // Function to capture an element
      const captureElement = async (element: HTMLDivElement) => {
        try {
          // Ensure the element is visible and has dimensions
          const rect = element.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) {
            throw new Error("Os gráficos não estão completamente renderizados. Tente novamente.")
          }

          // Capture the element
          const canvas = await html2canvas(element, {
            scale: 2,
            logging: false,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
          })

          return canvas.toDataURL("image/png")
        } catch (error) {
          console.error("Erro ao capturar elemento:", error)
          throw new Error(
            "Falha ao capturar o gráfico. Tente navegar para a aba 'Gráficos' e aguardar o carregamento completo.",
          )
        }
      }

      // Wait a bit longer to ensure charts are fully rendered
      await new Promise((resolve) => setTimeout(resolve, 1000))

      // Capture the pie chart
      console.log("Capturando gráfico de pizza...")
      const pieImage = await captureElement(pieChartRef.current)
      setPieChartImage(pieImage)

      // Capture the bar chart
      console.log("Capturando gráfico de barras...")
      const barImage = await captureElement(barChartRef.current)
      setBarChartImage(barImage)

      console.log("Captura de gráficos concluída com sucesso.")

      toast({
        title: "Relatório preparado",
        description: "O relatório está pronto para download.",
      })
    } catch (error) {
      console.error("Erro ao capturar gráficos:", error)
      setPdfError(error instanceof Error ? error.message : "Erro desconhecido ao capturar gráficos")
      toast({
        title: "Erro ao gerar relatório",
        description: error instanceof Error ? error.message : "Não foi possível capturar os gráficos para o relatório.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Gerar PDF diretamente sem capturar gráficos
  const generatePDFWithoutCharts = async () => {
    setIsGeneratingPDF(true)
    setPdfError(null)

    try {
      // Criar novo documento PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Adicionar título
      doc.setFontSize(20)
      doc.text(title, 105, 15, { align: "center" })

      // Adicionar subtítulo
      doc.setFontSize(12)
      const subtitleText =
        startDate && endDate
          ? `Relatório de Custos de ${formatDate(startDate)} a ${formatDate(endDate)}`
          : "Relatório de Custos"
      doc.text(subtitleText, 105, 25, { align: "center" })

      // Adicionar KPIs
      doc.setFontSize(14)
      doc.text("Resumo", 15, 35)

      doc.setFontSize(10)
      doc.text(`Total Gasto: ${formatCurrency(kpis.totalGasto)}`, 15, 45)
      doc.text(`Total de Compras: ${kpis.totalCompras}`, 15, 50)
      doc.text(`Total de Produtos: ${kpis.totalProdutos}`, 15, 55)

      // Adicionar tabela de equipes
      doc.setFontSize(14)
      doc.text("Detalhamento por Equipe", 15, 65)

      autoTable(doc, {
        startY: 70,
        head: [["Equipe", "Valor (R$)", "Percentual"]],
        body: teamExpenses.map((team) => [
          team.name,
          formatCurrency(team.value),
          `${((team.value / kpis.totalGasto) * 100).toFixed(2)}%`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 15, right: 15 },
      })

      // Adicionar tabela de produtos
      const tableY2 = doc.lastAutoTable?.finalY || 150
      doc.setFontSize(14)
      doc.text("Detalhamento por Produto", 15, tableY2 + 10)

      autoTable(doc, {
        startY: tableY2 + 15,
        head: [["Produto", "Valor (R$)"]],
        body: productExpenses.map((product) => [product.name, formatCurrency(product.value)]),
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: 15, right: 15 },
      })

      // Adicionar lista de compras
      if (purchases.length > 0) {
        doc.addPage()
        doc.setFontSize(14)
        doc.text("Lista de Compras", 15, 15)

        autoTable(doc, {
          startY: 20,
          head: [["Data", "Equipe", "Local", "Total (R$)"]],
          body: purchases.map((purchase) => [
            formatDate(purchase.purchase_date),
            purchase.team.name,
            purchase.location_name,
            formatCurrency(purchase.total),
          ]),
          theme: "grid",
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: 15, right: 15 },
        })
      }

      // Adicionar rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Relatório gerado em ${formatDateTime(new Date())}`, 105, 290, { align: "center" })
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: "right" })
      }

      // Salvar o PDF
      doc.save(`relatorio-ejc-${new Date().toISOString().split("T")[0]}.pdf`)

      toast({
        title: "PDF gerado com sucesso",
        description: "O relatório foi baixado com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      setPdfError(error instanceof Error ? error.message : "Erro desconhecido ao gerar PDF")
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório em PDF.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Gerar PDF com jsPDF
  const generatePDF = async () => {
    if (!pieChartImage || !barChartImage) {
      toast({
        title: "Prepare o relatório primeiro",
        description: "Clique em 'Preparar Relatório' antes de baixar o PDF.",
        variant: "destructive",
      })
      return
    }

    setIsGeneratingPDF(true)
    setPdfError(null)

    try {
      // Criar novo documento PDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Adicionar título
      doc.setFontSize(20)
      doc.text(title, 105, 15, { align: "center" })

      // Adicionar subtítulo
      doc.setFontSize(12)
      const subtitleText =
        startDate && endDate
          ? `Relatório de Custos de ${formatDate(startDate)} a ${formatDate(endDate)}`
          : "Relatório de Custos"
      doc.text(subtitleText, 105, 25, { align: "center" })

      // Adicionar KPIs
      doc.setFontSize(14)
      doc.text("Resumo", 15, 35)

      doc.setFontSize(10)
      doc.text(`Total Gasto: ${formatCurrency(kpis.totalGasto)}`, 15, 45)
      doc.text(`Total de Compras: ${kpis.totalCompras}`, 15, 50)
      doc.text(`Total de Produtos: ${kpis.totalProdutos}`, 15, 55)

      // Adicionar gráfico de pizza - ajustado para manter proporção
      doc.setFontSize(14)
      doc.text("Gastos por Equipe", 15, 70)

      // Calcular dimensões para manter proporção
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 15
      const availableWidth = pageWidth - 2 * margin
      const aspectRatio = 4 / 3 // Proporção largura/altura
      const imgWidth = availableWidth
      const imgHeight = imgWidth / aspectRatio

      try {
        doc.addImage(pieChartImage, "PNG", margin, 75, imgWidth, imgHeight)
      } catch (error) {
        console.error("Erro ao adicionar imagem do gráfico de pizza:", error)
        doc.text("Não foi possível incluir o gráfico de pizza no PDF.", margin, 75 + imgHeight / 2)
      }

      // Adicionar tabela de equipes
      const tableY = 75 + imgHeight + 10
      doc.setFontSize(14)
      doc.text("Detalhamento por Equipe", 15, tableY)

      autoTable(doc, {
        startY: tableY + 5,
        head: [["Equipe", "Valor (R$)", "Percentual"]],
        body: teamExpenses.map((team) => [
          team.name,
          formatCurrency(team.value),
          `${((team.value / kpis.totalGasto) * 100).toFixed(2)}%`,
        ]),
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: margin, right: margin },
      })

      // Adicionar nova página
      doc.addPage()

      // Adicionar gráfico de barras - ajustado para manter proporção
      doc.setFontSize(14)
      doc.text("Top 10 Produtos (R$)", 15, 15)

      try {
        doc.addImage(barChartImage, "PNG", margin, 20, imgWidth, imgHeight)
      } catch (error) {
        console.error("Erro ao adicionar imagem do gráfico de barras:", error)
        doc.text("Não foi possível incluir o gráfico de barras no PDF.", margin, 20 + imgHeight / 2)
      }

      // Adicionar tabela de produtos
      const tableY2 = 20 + imgHeight + 10
      doc.setFontSize(14)
      doc.text("Detalhamento por Produto", 15, tableY2)

      autoTable(doc, {
        startY: tableY2 + 5,
        head: [["Produto", "Valor (R$)"]],
        body: productExpenses.map((product) => [product.name, formatCurrency(product.value)]),
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [240, 240, 240] },
        margin: { left: margin, right: margin },
      })

      // Adicionar lista de compras
      if (purchases.length > 0) {
        doc.addPage()
        doc.setFontSize(14)
        doc.text("Lista de Compras", 15, 15)

        autoTable(doc, {
          startY: 20,
          head: [["Data", "Equipe", "Local", "Total (R$)"]],
          body: purchases.map((purchase) => [
            formatDate(purchase.purchase_date),
            purchase.team.name,
            purchase.location_name,
            formatCurrency(purchase.total),
          ]),
          theme: "grid",
          headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [240, 240, 240] },
          margin: { left: margin, right: margin },
        })
      }

      // Adicionar rodapé
      const pageCount = doc.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Relatório gerado em ${formatDateTime(new Date())}`, 105, 290, { align: "center" })
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: "right" })
      }

      // Salvar o PDF
      doc.save(`relatorio-ejc-${new Date().toISOString().split("T")[0]}.pdf`)

      toast({
        title: "PDF gerado com sucesso",
        description: "O relatório foi baixado com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      setPdfError(error instanceof Error ? error.message : "Erro desconhecido ao gerar PDF")
      toast({
        title: "Erro ao gerar PDF",
        description: "Não foi possível gerar o relatório em PDF.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  // Função auxiliar para formatar datas
  const formatDateTime = (date: Date): string => {
    return date.toLocaleString("pt-BR")
  }

  // Função para truncar nomes longos
  const truncateName = (name: string, maxLength = 20) => {
    if (!name) return ""
    // Se o nome tiver espaços, tenta quebrar em palavras
    if (name.includes(" ") && name.length > maxLength) {
      const words = name.split(" ")
      if (words[0].length > maxLength - 3) {
        return `${words[0].substring(0, maxLength - 3)}...`
      }
      return words[0]
    }
    return name.length > maxLength ? `${name.substring(0, maxLength - 3)}...` : name
  }

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
    <div className="space-y-6" ref={reportRef}>
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">Gere relatórios com gráficos e dados financeiros</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="title">Título do Relatório</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="EJC - Relatório de Custos"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Data Inicial</Label>
              <Input id="startDate" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Data Final</Label>
              <Input id="endDate" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      {pdfError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao gerar PDF</AlertTitle>
          <AlertDescription>{pdfError}</AlertDescription>
        </Alert>
      )}

      {pdfError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro ao gerar PDF</AlertTitle>
          <AlertDescription>{pdfError}</AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="graficos">Gráficos</TabsTrigger>
          <TabsTrigger value="compras">Compras</TabsTrigger>
        </TabsList>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Carregando dados...</span>
          </div>
        ) : (
          <>
            <TabsContent value="resumo" className="mt-4">
              {/* KPIs */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total Gasto</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{formatCurrency(kpis.totalGasto)}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Compras</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.totalCompras}</div>
                  </CardContent>
                </Card>

                <Card className="sm:col-span-2 md:col-span-1">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{kpis.totalProdutos}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabelas */}
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 mt-6">
                {/* Tabela de Gastos por Equipe */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gastos por Equipe</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-auto">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="px-4 py-2 text-left">Equipe</th>
                            <th className="px-4 py-2 text-left">Valor (R$)</th>
                            <th className="px-4 py-2 text-left">Percentual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {teamExpenses.map((team, index) => (
                            <tr key={team.id} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                              <td className="px-4 py-2">{team.name}</td>
                              <td className="px-4 py-2">{formatCurrency(team.value)}</td>
                              <td className="px-4 py-2">{((team.value / kpis.totalGasto) * 100).toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted font-medium">
                            <td className="px-4 py-2">Total</td>
                            <td className="px-4 py-2">{formatCurrency(kpis.totalGasto)}</td>
                            <td className="px-4 py-2">100%</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabela de Top 10 Produtos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top 10 Produtos (R$)</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-auto">
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="px-4 py-2 text-left">Produto</th>
                            <th className="px-4 py-2 text-left">Valor (R$)</th>
                            <th className="px-4 py-2 text-left">Percentual</th>
                          </tr>
                        </thead>
                        <tbody>
                          {productExpenses.map((product, index) => (
                            <tr key={index} className={index % 2 === 0 ? "bg-muted/50" : ""}>
                              <td className="px-4 py-2">{product.name}</td>
                              <td className="px-4 py-2">{formatCurrency(product.value)}</td>
                              <td className="px-4 py-2">{((product.value / kpis.totalGasto) * 100).toFixed(2)}%</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="bg-muted font-medium">
                            <td className="px-4 py-2">Total Top 10</td>
                            <td className="px-4 py-2">
                              {formatCurrency(productExpenses.reduce((sum, product) => sum + product.value, 0))}
                            </td>
                            <td className="px-4 py-2">
                              {(
                                (productExpenses.reduce((sum, product) => sum + product.value, 0) / kpis.totalGasto) *
                                100
                              ).toFixed(2)}
                              %
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="graficos" className="mt-4">
              <div className="grid gap-6 grid-cols-1">
                {/* Gráfico de Pizza - Gastos por Equipe */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gastos por Equipe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div ref={pieChartRef} className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={teamExpenses}
                            cx="50%"
                            cy="45%" // Ajustar posição vertical
                            labelLine={false}
                            outerRadius={isMobile ? 80 : 110}
                            innerRadius={isMobile ? 40 : 55}
                            paddingAngle={4} // Aumentar espaçamento entre fatias
                            dataKey="value"
                            nameKey="name"
                          >
                            {teamExpenses.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                                stroke="#fff"
                                strokeWidth={2}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => formatCurrency(Number(value))}
                            labelFormatter={(name) => `${name}`}
                          />
                          <Legend
                            layout="horizontal"
                            verticalAlign="bottom"
                            align="center"
                            wrapperStyle={{
                              fontSize: "11px",
                              paddingTop: "30px",
                              lineHeight: "20px", // Aumentar espaçamento entre linhas da legenda
                            }}
                            formatter={(value) => truncateName(value, isMobile ? 10 : 15)}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Gráfico de Barras - Top 10 Produtos */}
                <Card className="mt-8">
                  <CardHeader>
                    <CardTitle>Top 10 Produtos (R$)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div ref={barChartRef} className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={productExpenses}
                          layout="vertical"
                          margin={{ top: 10, right: 40, left: 10, bottom: 10 }} // Aumentar margens
                        >
                          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                          <XAxis
                            type="number"
                            tickFormatter={(value) => formatCurrency(value).replace("R$", "")}
                            domain={[0, "dataMax"]}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={isMobile ? 120 : 170} // Aumentar largura para acomodar nomes
                            tick={{ fontSize: isMobile ? 10 : 12 }}
                            tickFormatter={(value) => truncateName(value, isMobile ? 10 : 20)} // Permitir nomes mais longos
                            tickMargin={5} // Adicionar margem aos ticks
                          />
                          <Tooltip content={<CustomBarTooltip />} />
                          <Bar
                            dataKey="value"
                            fill="#2563eb"
                            radius={[0, 4, 4, 0]}
                            barSize={isMobile ? 15 : 18} // Ajustar tamanho das barras
                            minPointSize={3} // Garantir tamanho mínimo
                          >
                            {!isMobile && (
                              <LabelList
                                dataKey="value"
                                position="right"
                                formatter={(value: number) => formatCurrency(value).replace("R$", "")}
                                style={{ fill: "#666", fontSize: "12px" }}
                              />
                            )}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="compras" className="mt-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Lista de Compras</CardTitle>
                  <div className="w-[200px]">
                    <Select value={teamFilter} onValueChange={setTeamFilter}>
                      <SelectTrigger>
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
                </CardHeader>
                <CardContent>
                  {isMobile ? (
                    <div>
                      {purchases.length === 0 ? (
                        <div className="text-center py-4">Nenhuma compra encontrada.</div>
                      ) : (
                        purchases.map((purchase) => <PurchaseCard key={purchase.id} purchase={purchase} />)
                      )}
                    </div>
                  ) : (
                    <div className="border rounded-lg overflow-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-primary text-primary-foreground">
                            <th className="px-4 py-2 text-left">Data</th>
                            <th className="px-4 py-2 text-left">Equipe</th>
                            <th className="px-4 py-2 text-left">Local</th>
                            <th className="px-4 py-2 text-left">Total</th>
                            <th className="px-4 py-2 text-left">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {purchases.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-2 text-center">
                                Nenhuma compra encontrada.
                              </td>
                            </tr>
                          ) : (
                            purchases.map((purchase) => (
                              <tr key={purchase.id} className="border-t hover:bg-muted/50">
                                <td className="px-4 py-2">{formatDate(purchase.purchase_date)}</td>
                                <td className="px-4 py-2">{purchase.team.name}</td>
                                <td className="px-4 py-2">{purchase.location_name}</td>
                                <td className="px-4 py-2">{formatCurrency(purchase.total)}</td>
                                <td className="px-4 py-2">
                                  <Button variant="ghost" size="icon" onClick={() => setSelectedPurchase(purchase)}>
                                    <Eye className="h-4 w-4" />
                                    <span className="sr-only">Ver detalhes</span>
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Botões para gerar PDF - SIMPLIFICADO */}
      <div className="flex flex-col sm:flex-row justify-end gap-4">
        <Button
          onClick={async () => {
            // Primeiro, mudar para a aba de gráficos
            setActiveTab("graficos")

            // Aguardar a renderização dos gráficos
            await new Promise((resolve) => setTimeout(resolve, 500))

            // Capturar os gráficos e gerar o PDF completo
            setIsGeneratingPDF(true)
            setPdfError(null)

            try {
              // Verificar se os gráficos estão disponíveis
              if (!pieChartRef.current || !barChartRef.current) {
                throw new Error("Os gráficos não estão disponíveis. Aguarde o carregamento completo da página.")
              }

              // Capturar os gráficos
              const captureElement = async (element: HTMLDivElement) => {
                const canvas = await html2canvas(element, {
                  scale: 3, // Aumentar a escala para melhor qualidade
                  logging: false,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: "#ffffff",
                })
                return canvas.toDataURL("image/png")
              }

              // Aguardar a renderização completa
              await new Promise((resolve) => setTimeout(resolve, 1000))

              // Capturar os gráficos
              const pieImage = await captureElement(pieChartRef.current)
              const barImage = await captureElement(barChartRef.current)

              // Criar o PDF
              const doc = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4",
              })

              // Adicionar título
              doc.setFontSize(20)
              doc.text(title, 105, 15, { align: "center" })

              // Adicionar subtítulo
              doc.setFontSize(12)
              const subtitleText =
                startDate && endDate
                  ? `Relatório de Custos de ${formatDate(startDate)} a ${formatDate(endDate)}`
                  : "Relatório de Custos"
              doc.text(subtitleText, 105, 25, { align: "center" })

              // Adicionar KPIs
              doc.setFontSize(14)
              doc.text("Resumo", 15, 35)

              doc.setFontSize(10)
              doc.text(`Total Gasto: ${formatCurrency(kpis.totalGasto)}`, 15, 45)
              doc.text(`Total de Compras: ${kpis.totalCompras}`, 15, 50)
              doc.text(`Total de Produtos: ${kpis.totalProdutos}`, 15, 55)

              // Adicionar gráfico de pizza com legenda ao lado
              doc.setFontSize(14)
              doc.text("Gastos por Equipe", 15, 70)

              // Calcular dimensões para o gráfico (metade da largura da página)
              const pageWidth = doc.internal.pageSize.getWidth()
              const margin = 15
              const graphWidth = (pageWidth - 2 * margin) / 2 // Metade da largura disponível
              const graphHeight = graphWidth // Manter proporção quadrada para o gráfico

              // Adicionar imagem do gráfico de pizza (lado esquerdo)
              doc.addImage(pieImage, "PNG", margin, 75, graphWidth, graphHeight)

              // Adicionar legenda personalizada (lado direito)
              const legendX = margin + graphWidth + 10 // Posição X da legenda (após o gráfico)
              const legendY = 75 // Posição Y inicial da legenda (alinhada com o topo do gráfico)
              const legendLineHeight = 8 // Espaçamento entre linhas da legenda
              const colorBoxSize = 5 // Tamanho do quadrado colorido

              doc.setFontSize(9)
              doc.setDrawColor(0)
              doc.setLineWidth(0.1)

              // Título da legenda
              doc.setFontSize(10)
              doc.setFont("helvetica", "bold")
              doc.text("Equipes", legendX, legendY)
              doc.setFont("helvetica", "normal")
              doc.setFontSize(9)

              // Desenhar cada item da legenda
              teamExpenses.forEach((team, index) => {
                const y = legendY + 8 + index * legendLineHeight

                // Desenhar quadrado colorido
                doc.setFillColor(COLORS[index % COLORS.length])
                doc.rect(legendX, y - colorBoxSize + 1, colorBoxSize, colorBoxSize, "F")

                // Texto da legenda
                const percentText = `${((team.value / kpis.totalGasto) * 100).toFixed(1)}%`
                const valueText = formatCurrency(team.value)

                // Nome da equipe (truncado se necessário)
                const teamName = team.name.length > 20 ? team.name.substring(0, 18) + "..." : team.name
                doc.text(teamName, legendX + colorBoxSize + 3, y)

                // Valor e percentual
                doc.text(`${percentText} - ${valueText}`, legendX + colorBoxSize + 3, y + 4)
              })

              // Adicionar tabela de equipes
              const tableY = 75 + graphHeight + 15
              doc.setFontSize(14)
              doc.text("Detalhamento por Equipe", 15, tableY)

              autoTable(doc, {
                startY: tableY + 5,
                head: [["Equipe", "Valor (R$)", "Percentual"]],
                body: teamExpenses.map((team) => [
                  team.name,
                  formatCurrency(team.value),
                  `${((team.value / kpis.totalGasto) * 100).toFixed(2)}%`,
                ]),
                theme: "grid",
                headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [240, 240, 240] },
                margin: { left: margin, right: margin },
              })

              // Adicionar nova página
              doc.addPage()

              // Adicionar gráfico de barras com legenda ao lado
              doc.setFontSize(14)
              doc.text("Top 10 Produtos (R$)", 15, 15)

              // Adicionar imagem do gráfico de barras (lado esquerdo)
              doc.addImage(barImage, "PNG", margin, 20, graphWidth + 20, graphHeight)

              // Adicionar legenda personalizada (lado direito)
              const barLegendX = margin + graphWidth + 30 // Posição X da legenda (após o gráfico)
              const barLegendY = 20 // Posição Y inicial da legenda (alinhada com o topo do gráfico)

              doc.setFontSize(9)
              doc.setDrawColor(0)
              doc.setLineWidth(0.1)

              // Título da legenda
              doc.setFontSize(10)
              doc.setFont("helvetica", "bold")
              doc.text("Produtos", barLegendX, barLegendY)
              doc.setFont("helvetica", "normal")
              doc.setFontSize(9)

              // Desenhar cada item da legenda
              productExpenses.forEach((product, index) => {
                const y = barLegendY + 8 + index * legendLineHeight

                // Desenhar quadrado colorido
                doc.setFillColor("#2563eb") // Cor azul para todas as barras
                doc.rect(barLegendX, y - colorBoxSize + 1, colorBoxSize, colorBoxSize, "F")

                // Texto da legenda
                const percentText = `${((product.value / kpis.totalGasto) * 100).toFixed(1)}%`
                const valueText = formatCurrency(product.value)

                // Nome do produto (truncado se necessário)
                const productName = product.name.length > 20 ? product.name.substring(0, 18) + "..." : product.name
                doc.text(productName, barLegendX + colorBoxSize + 3, y)

                // Valor e percentual
                doc.text(`${valueText}`, barLegendX + colorBoxSize + 3, y + 4)
              })

              // Adicionar tabela de produtos
              const tableY2 = 20 + graphHeight + 15
              doc.setFontSize(14)
              doc.text("Detalhamento por Produto", 15, tableY2)

              autoTable(doc, {
                startY: tableY2 + 5,
                head: [["Produto", "Valor (R$)"]],
                body: productExpenses.map((product) => [product.name, formatCurrency(product.value)]),
                theme: "grid",
                headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                alternateRowStyles: { fillColor: [240, 240, 240] },
                margin: { left: margin, right: margin },
              })

              // Adicionar lista de compras
              if (purchases.length > 0) {
                doc.addPage()
                doc.setFontSize(14)
                doc.text("Lista de Compras", 15, 15)

                autoTable(doc, {
                  startY: 20,
                  head: [["Data", "Equipe", "Local", "Total (R$)"]],
                  body: purchases.map((purchase) => [
                    formatDate(purchase.purchase_date),
                    purchase.team.name,
                    purchase.location_name,
                    formatCurrency(purchase.total),
                  ]),
                  theme: "grid",
                  headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255] },
                  alternateRowStyles: { fillColor: [240, 240, 240] },
                  margin: { left: margin, right: margin },
                })
              }

              // Adicionar rodapé
              const pageCount = doc.getNumberOfPages()
              for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i)
                doc.setFontSize(8)
                doc.text(`Relatório gerado em ${formatDateTime(new Date())}`, 105, 290, { align: "center" })
                doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: "right" })
              }

              // Salvar o PDF
              doc.save(`relatorio-ejc-${new Date().toISOString().split("T")[0]}.pdf`)

              toast({
                title: "PDF gerado com sucesso",
                description: "O relatório foi baixado com sucesso.",
              })
            } catch (error) {
              console.error("Erro ao gerar PDF:", error)
              setPdfError(error instanceof Error ? error.message : "Erro desconhecido ao gerar PDF")
              toast({
                title: "Erro ao gerar PDF",
                description: error instanceof Error ? error.message : "Não foi possível gerar o relatório em PDF.",
                variant: "destructive",
              })
            } finally {
              setIsGeneratingPDF(false)
            }
          }}
          disabled={isGeneratingPDF}
          className="w-full sm:w-auto"
        >
          {isGeneratingPDF ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Baixar Relatório Completo
            </>
          )}
        </Button>

        <Button onClick={generatePDFWithoutCharts} disabled={isGeneratingPDF} className="w-full sm:w-auto">
          {isGeneratingPDF ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Baixar Relatório Simples
            </>
          )}
        </Button>
      </div>

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
