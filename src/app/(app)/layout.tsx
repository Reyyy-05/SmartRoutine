import { AuthProvider } from "@/hooks/useAuth";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AuthGuard>
        <SidebarProvider>
          <div className="flex min-h-screen">
            <AppSidebar />
            <main className="flex-1 bg-transparent overflow-y-auto p-4 lg:p-6">
              {children}
            </main>
          </div>
        </SidebarProvider>
      </AuthGuard>
    </AuthProvider>
  );
}
