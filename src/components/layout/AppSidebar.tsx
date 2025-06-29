"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, BarChart3, ShieldCheck, LogOut, Loader2, Workflow } from "lucide-react";

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { userProfile, loading } = useAuth();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const menuItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/statistics", label: "Statistics", icon: BarChart3 },
  ];

  if (userProfile?.role === 'admin') {
    menuItems.push({ href: "/admin", label: "Admin Panel", icon: ShieldCheck });
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 p-2">
          <Workflow className="w-8 h-8 text-primary" />
          <h1 className="text-xl font-bold">SmartRoutine</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
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
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        )}
      </SidebarContent>
      <SidebarFooter>
         <Button variant="ghost" className="w-full justify-start gap-2" onClick={handleSignOut}>
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
         </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
