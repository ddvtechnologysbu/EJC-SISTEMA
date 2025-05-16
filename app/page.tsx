import { AuthGuard } from "@/components/auth/auth-guard"
import DashboardContent from "@/components/dashboard/dashboard-content"

export default function Dashboard() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
