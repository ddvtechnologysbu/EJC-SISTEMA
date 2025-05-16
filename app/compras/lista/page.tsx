import { AuthGuard } from "@/components/auth/auth-guard"
import PurchaseList from "@/components/purchases/purchase-list"

export default function PurchaseListPage() {
  return (
    <AuthGuard>
      <PurchaseList />
    </AuthGuard>
  )
}
