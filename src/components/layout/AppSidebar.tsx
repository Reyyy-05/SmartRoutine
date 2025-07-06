"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut, Auth } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar, SidebarHeader, SidebarContent, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BarChart3, ShieldCheck, LogOut, Loader2 } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile, loading } = useAuth();

  const handleSignOut = async (auth: Auth) => {
    await signOut(auth);
    router.push("/login");
  };

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/statistics", label: "Statistics", icon: BarChart3 },
  ];

  if (userProfile?.role === 'admin') {
    menuItems.push({ href: "/admin", label: "Panel Admin", icon: ShieldCheck });
  }

  return (
    <Sidebar className="bg-white/25 backdrop-blur-xl border-r border-white/30 text-gray-800 shadow-2xl">
      <SidebarHeader>
        <div className="flex items-center gap-4 p-4">
          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg">
            SR
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-800">SmartRoutine</h1>
            <p className="text-gray-600 text-sm">Dasbor Utama</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-4">
        {loading ? (
          <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.label}
                    className="h-12 justify-start rounded-2xl text-base font-medium text-gray-600 hover:bg-black/5 hover:text-gray-900 data-[active=true]:bg-gradient-to-r data-[active=true]:from-pink-500/10 data-[active=true]:to-purple-500/10 data-[active=true]:text-pink-600 data-[active=true]:shadow-[inset_3px_0_0_0_hsl(var(--primary))]"
                  >
                    <item.icon className="h-5 w-5 text-gray-500 data-[active=true]:text-pink-500" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-gray-200/50">
         <Button variant="ghost" className="w-full justify-start gap-3 p-3 h-12 rounded-2xl text-base font-medium text-gray-600 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleSignOut(auth)}>
            <LogOut className="w-5 h-5" />
            <span>Logout</span>
         </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
