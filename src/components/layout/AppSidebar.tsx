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
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-3 p-2">
          <div className="w-10 h-10 bg-primary-foreground rounded-lg flex items-center justify-center text-white font-bold text-xl">
            SR
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">SmartRoutine</h1>
            <p className="text-xs text-sidebar-foreground/70">Dasbor Utama</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        {loading ? (
          <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>
        ) : (
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    className="h-11 justify-start"
                  >
                    <item.icon className="h-5 w-5 text-primary-foreground" />
                    <span className="text-base font-medium">{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter>
         <Button variant="ghost" className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:text-sidebar-foreground" onClick={() => handleSignOut(auth)}>
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
         </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
