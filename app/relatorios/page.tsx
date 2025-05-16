import { AuthGuard } from "@/components/auth/auth-guard"
import ReportsContent from "@/components/reports/reports-content"

export default function ReportsPage() {
  return (
    <AuthGuard>
      <ReportsContent />
    </AuthGuard>
  )
}
