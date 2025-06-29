import { AuthGuard } from "@/components/auth/AuthGuard";
import { AdminPanelClient } from "@/components/admin/AdminPanelClient";

export default function AdminPage() {
  return (
    <AuthGuard roles={["admin"]}>
      <AdminPanelClient />
    </AuthGuard>
  );
}
