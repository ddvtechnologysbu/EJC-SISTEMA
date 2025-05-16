import { AuthGuard } from "@/components/auth/auth-guard"
import RegisterPurchaseForm from "@/components/purchases/register-purchase-form"

export default function RegisterPurchasePage() {
  return (
    <AuthGuard>
      <RegisterPurchaseForm />
    </AuthGuard>
  )
}
