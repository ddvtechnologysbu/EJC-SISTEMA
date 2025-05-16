"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { FileDown, Loader2 } from "lucide-react"
import dynamic from "next/dynamic"

// Tipos
interface TeamExpense {
  id: number
  name: string
  value: number
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

// Importação dinâmica do react-pdf
const PDFDownloadLink = dynamic(() => import("@react-pdf/renderer").then((mod) => mod.PDFDownloadLink), {
  ssr: false,
  loading: () => (
    <Button disabled>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Carregando PDF...
    </Button>
  ),
})

const PDFDocument = dynamic(() => import("./pdf-document").then((mod) => mod.PDFDocument), { ssr: false })

interface PDFDownloadButtonProps {
  title: string
  teamExpenses: TeamExpense[]
  productExpenses: ProductExpense[]
  kpis: KPIs
  startDate: string
  endDate: string
  pieChartImage: string
  barChartImage: string
  isGeneratingPDF: boolean
}

export function PDFDownloadButton({
  title,
  teamExpenses,
  productExpenses,
  kpis,
  startDate,
  endDate,
  pieChartImage,
  barChartImage,
  isGeneratingPDF,
}: PDFDownloadButtonProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted || !pieChartImage || !barChartImage || isGeneratingPDF) {
    return null
  }

  return (
    <PDFDownloadLink
      document={
        <PDFDocument
          title={title}
          teamExpenses={teamExpenses}
          productExpenses={productExpenses}
          kpis={kpis}
          startDate={startDate}
          endDate={endDate}
          pieChartImage={pieChartImage}
          barChartImage={barChartImage}
        />
      }
      fileName={`relatorio-ejc-${new Date().toISOString().split("T")[0]}.pdf`}
      className="ml-4"
    >
      {({ loading }) => (
        <Button disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando PDF...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Baixar Relatório em PDF
            </>
          )}
        </Button>
      )}
    </PDFDownloadLink>
  )
}
