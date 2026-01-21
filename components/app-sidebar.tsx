"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, LayoutDashboard, LineChart, LogOut, Menu, Settings, Star } from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  {
    title: "Favoris",
    href: "/favorites",
    match: "/favorites",
    icon: Star,
  },
  {
    title: "Actions",
    href: "/#stocks",
    match: "/",
    icon: BarChart3,
  },
  {
    title: "Dashboard",
    href: "/dashboard",
    match: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Aggregation",
    href: "/admin/aggregation",
    match: "/admin/aggregation",
    icon: LineChart,
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  const { state, toggleSidebar } = useSidebar();

  const handleLogout = () => {
    window.localStorage.removeItem("jwt_token");
    window.localStorage.removeItem("user_email");
    window.location.reload();
  };

  const shouldIgnoreToggle = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return false;
    return Boolean(
      target.closest(
        '[data-sidebar="menu-button"], [data-sidebar="trigger"], a, button, input, textarea, select'
      )
    );
  };

  const handleEmptyClick = (event: React.MouseEvent) => {
    if (shouldIgnoreToggle(event.target)) return;
    if (state === "collapsed") {
      toggleSidebar();
    }
  };

  const handleEmptyDoubleClick = (event: React.MouseEvent) => {
    if (shouldIgnoreToggle(event.target)) return;
    if (state === "expanded") {
      toggleSidebar();
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="bg-black text-white [--sidebar-background:0_0%_0%] [--sidebar-foreground:0_0%_100%] [--sidebar-border:0_0%_20%] [--sidebar-accent:0_0%_12%] [--sidebar-accent-foreground:0_0%_100%] [&[data-state=collapsed]_span]:hidden [&[data-state=collapsed]_[data-sidebar=menu]]:items-center"
    >
      <div
        className="flex h-full w-full flex-col"
        onClick={handleEmptyClick}
        onDoubleClick={handleEmptyDoubleClick}
      >
        <SidebarHeader className="h-16 flex flex-row items-center px-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton onClick={toggleSidebar} tooltip="Menu" className="justify-center">
                <Menu />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === item.match}
                      tooltip={item.title}
                    >
                      <Link href={item.href}>
                        <item.icon />
                        <span className="group-data-[collapsible=icon]:hidden">
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip="Parametres">
                <Link href="/settings">
                  <Settings />
                  <span className="group-data-[collapsible=icon]:hidden">Parametres</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip="Se deconnecter"
                className="text-red-500 hover:text-red-500"
              >
                <LogOut />
                <span className="group-data-[collapsible=icon]:hidden">Se deconnecter</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </div>
      <SidebarRail />
    </Sidebar>
  );
}
