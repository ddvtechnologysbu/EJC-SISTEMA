"use client"

import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format"

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

// Estilos para o PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  title: {
    fontSize: 24,
    marginBottom: 10,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },
  table: {
    display: "flex",
    width: "auto",
    borderStyle: "solid",
    borderWidth: 1,
    borderColor: "#bfbfbf",
    marginBottom: 20,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#bfbfbf",
  },
  tableHeader: {
    backgroundColor: "#f0f0f0",
  },
  tableCell: {
    padding: 5,
    flex: 1,
    fontSize: 10,
  },
  tableCellBold: {
    padding: 5,
    flex: 1,
    fontSize: 10,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    fontSize: 10,
    textAlign: "center",
  },
  image: {
    marginVertical: 10,
    width: "100%",
    height: 200,
  },
  kpiContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  kpiItem: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
    marginHorizontal: 5,
  },
  kpiTitle: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  kpiValue: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 5,
  },
})

// Componente PDF
interface PDFDocumentProps {
  title: string
  teamExpenses: TeamExpense[]
  productExpenses: ProductExpense[]
  kpis: KPIs
  startDate: string
  endDate: string
  pieChartImage: string
  barChartImage: string
}

export function PDFDocument({
  title,
  teamExpenses,
  productExpenses,
  kpis,
  startDate,
  endDate,
  pieChartImage,
  barChartImage,
}: PDFDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Relatório de Custos {startDate && endDate ? `de ${formatDate(startDate)} a ${formatDate(endDate)}` : ""}
        </Text>

        <View style={styles.kpiContainer}>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiTitle}>Total Gasto</Text>
            <Text style={styles.kpiValue}>{formatCurrency(kpis.totalGasto)}</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiTitle}>Total de Compras</Text>
            <Text style={styles.kpiValue}>{kpis.totalCompras}</Text>
          </View>
          <View style={styles.kpiItem}>
            <Text style={styles.kpiTitle}>Total de Produtos</Text>
            <Text style={styles.kpiValue}>{kpis.totalProdutos}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gastos por Equipe</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCellBold}>Equipe</Text>
              <Text style={styles.tableCellBold}>Valor (R$)</Text>
              <Text style={styles.tableCellBold}>Percentual</Text>
            </View>
            {teamExpenses.map((team, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{team.name}</Text>
                <Text style={styles.tableCell}>{formatCurrency(team.value)}</Text>
                <Text style={styles.tableCell}>{((team.value / kpis.totalGasto) * 100).toFixed(2)}%</Text>
              </View>
            ))}
          </View>

          {pieChartImage && <Image src={pieChartImage || "/placeholder.svg"} style={styles.image} />}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top 10 Produtos (R$)</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeader]}>
              <Text style={styles.tableCellBold}>Produto</Text>
              <Text style={styles.tableCellBold}>Valor (R$)</Text>
            </View>
            {productExpenses.map((product, index) => (
              <View key={index} style={styles.tableRow}>
                <Text style={styles.tableCell}>{product.name}</Text>
                <Text style={styles.tableCell}>{formatCurrency(product.value)}</Text>
              </View>
            ))}
          </View>

          {barChartImage && <Image src={barChartImage || "/placeholder.svg"} style={styles.image} />}
        </View>

        <Text style={styles.footer}>Relatório gerado em {formatDateTime(new Date())}</Text>
      </Page>
    </Document>
  )
}
