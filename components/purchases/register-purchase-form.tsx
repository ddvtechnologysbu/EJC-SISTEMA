"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, useFieldArray } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supabaseClient } from "@/lib/supabase/client"
import { formatCurrency } from "@/lib/utils/format"
import { Trash2, Plus, CheckCircle2 } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Lista de equipes
const TEAMS = [
  "COORDENAÇÃO GERAL",
  "CIRCULO",
  "SECRETARIA",
  "BANDINHA",
  "TRANSITO",
  "SOCIODRAMA",
  "COMPRAS",
  "EXTERNA 1",
  "EXTERNA 2",
  "COZINHA",
  "MERCADEJO",
  "LITURGIA E VIGILIA",
  "GARÇOM E LANCHE",
  "RECEPÇÃO E PALESTRA",
  "APRESENTADORES",
  "CORREIO INTERNO",
  "ORDEM E LIMPEZA",
  "BOA VONTADE",
  "MINI-BOX",
  "OUTROS CUSTO",
]

// Unidades de medida comuns
const UNITS = ["unidade", "kg", "g", "litro", "ml", "caixa", "pacote", "metro", "cm", "outro"]

// Schema de validação
const purchaseItemSchema = z.object({
  product_name: z.string().min(1, "Nome do produto é obrigatório"),
  unit_of_measure: z.string().min(1, "Unidade de medida é obrigatória"),
  quantity: z.coerce.number().positive("Quantidade deve ser maior que zero"),
  unit_price: z.coerce.number().positive("Preço unitário deve ser maior que zero"),
  notes: z.string().optional(),
})

const purchaseFormSchema = z.object({
  purchase_date: z.string().min(1, "Data da compra é obrigatória"),
  team_id: z.string().min(1, "Equipe é obrigatória"),
  location_name: z.string().min(1, "Local da compra é obrigatório"),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "Adicione pelo menos um item"),
})

type PurchaseFormValues = z.infer<typeof purchaseFormSchema>

export default function RegisterPurchaseForm() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  // Inicializar o formulário
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseFormSchema),
    defaultValues: {
      purchase_date: new Date().toISOString().split("T")[0],
      team_id: "",
      location_name: "",
      notes: "",
      items: [
        {
          product_name: "",
          unit_of_measure: "unidade",
          quantity: 1,
          unit_price: 0,
          notes: "",
        },
      ],
    },
  })

  // Configurar o field array para os itens
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  })

  // Calcular o subtotal de um item
  const calculateSubtotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice
  }

  // Calcular o total da compra
  const calculateTotal = () => {
    const items = form.getValues("items")
    return items.reduce((total, item) => {
      return total + calculateSubtotal(Number(item.quantity), Number(item.unit_price))
    }, 0)
  }

  // Reiniciar o formulário
  const resetForm = () => {
    form.reset({
      purchase_date: new Date().toISOString().split("T")[0],
      team_id: "",
      location_name: "",
      notes: "",
      items: [
        {
          product_name: "",
          unit_of_measure: "unidade",
          quantity: 1,
          unit_price: 0,
          notes: "",
        },
      ],
    })
    setPurchaseSuccess(false)
  }

  // Enviar o formulário
  const onSubmit = async (data: PurchaseFormValues) => {
    try {
      setIsSubmitting(true)

      // Buscar o ID da equipe
      const { data: teams, error: teamError } = await supabaseClient
        .from("teams")
        .select("id")
        .eq("name", data.team_id)
        .single()

      if (teamError) {
        throw new Error(`Erro ao buscar equipe: ${teamError.message}`)
      }

      // Criar a compra
      const { data: purchase, error: purchaseError } = await supabaseClient
        .from("purchases")
        .insert({
          purchase_date: data.purchase_date,
          team_id: teams.id,
          location_name: data.location_name,
          notes: data.notes,
        })
        .select()
        .single()

      if (purchaseError) {
        throw new Error(`Erro ao criar compra: ${purchaseError.message}`)
      }

      // Criar os itens da compra
      const purchaseItems = data.items.map((item) => ({
        purchase_id: purchase.id,
        product_name: item.product_name,
        unit_of_measure: item.unit_of_measure,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal: calculateSubtotal(Number(item.quantity), Number(item.unit_price)),
        notes: item.notes,
      }))

      const { error: itemsError } = await supabaseClient.from("purchase_items").insert(purchaseItems)

      if (itemsError) {
        throw new Error(`Erro ao criar itens: ${itemsError.message}`)
      }

      toast({
        title: "Compra registrada com sucesso!",
        description: "A compra foi registrada com sucesso no sistema.",
      })

      // Mostrar mensagem de sucesso e permitir nova compra
      setPurchaseSuccess(true)
    } catch (error) {
      console.error("Erro ao registrar compra:", error)
      toast({
        title: "Erro ao registrar compra",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (purchaseSuccess) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Compra Registrada</h1>
          <p className="text-muted-foreground">Sua compra foi registrada com sucesso</p>
        </div>

        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-5 w-5 text-green-600" />
          <AlertTitle className="text-green-800">Compra registrada com sucesso!</AlertTitle>
          <AlertDescription className="text-green-700">Todos os itens foram salvos no sistema.</AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={resetForm} className="w-full sm:w-auto">
            Registrar Nova Compra
          </Button>
          <Button variant="outline" onClick={() => router.push("/compras/lista")} className="w-full sm:w-auto">
            Ver Lista de Compras
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Registrar Compra</h1>
        <p className="text-muted-foreground">Preencha os dados da compra e adicione os itens</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Dados da Compra</CardTitle>
              <CardDescription>Informações gerais sobre a compra</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="purchase_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Compra</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="team_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Equipe</FormLabel>
                      <FormControl>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma equipe" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px] overflow-y-auto">
                            {TEAMS.map((team) => (
                              <SelectItem key={team} value={team}>
                                {team}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="location_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Local da Compra</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Supermercado ABC" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observações (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Observações adicionais sobre a compra" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Itens da Compra</CardTitle>
              <CardDescription>Adicione os produtos comprados</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-4 p-4 border rounded-lg">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Item {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Remover item</span>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.product_name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Produto</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Arroz" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.unit_of_measure`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unidade de Medida</FormLabel>
                          <FormControl>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma unidade" />
                              </SelectTrigger>
                              <SelectContent>
                                {UNITS.map((unit) => (
                                  <SelectItem key={unit} value={unit}>
                                    {unit}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                form.trigger(`items.${index}.quantity`)
                                form.trigger(`items.${index}.unit_price`)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`items.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Preço Unitário (R$)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              {...field}
                              onChange={(e) => {
                                field.onChange(e)
                                form.trigger(`items.${index}.quantity`)
                                form.trigger(`items.${index}.unit_price`)
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.notes`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observações (opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Observações sobre o item" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex items-end">
                      <div>
                        <Label>Subtotal</Label>
                        <p className="text-lg font-medium">
                          {formatCurrency(
                            calculateSubtotal(
                              Number(form.watch(`items.${index}.quantity`)) || 0,
                              Number(form.watch(`items.${index}.unit_price`)) || 0,
                            ),
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() =>
                  append({
                    product_name: "",
                    unit_of_measure: "unidade",
                    quantity: 1,
                    unit_price: 0,
                    notes: "",
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>

              <div className="flex justify-between items-center pt-4 border-t">
                <h3 className="text-lg font-semibold">Total da Compra</h3>
                <p className="text-xl font-bold">{formatCurrency(calculateTotal())}</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col sm:flex-row justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/compras/lista")}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? "Salvando..." : "Salvar Compra"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
