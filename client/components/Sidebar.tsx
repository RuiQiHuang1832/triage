"use client";

import { CirclePlus, ScrollText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { SessionSummaryRow } from "@/lib/types";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";

interface AppSidebarProps {
  sessions: SessionSummaryRow[];
  activeSessionId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNewIntake: () => void;
}

export function AppSidebar({ sessions, activeSessionId, loading = false, onSelect, onNewIntake }: AppSidebarProps) {
  const pathname = usePathname();
  const onChat = pathname === "/";

  const visible = sessions.filter((s) => s.preview !== null || s.id === activeSessionId);

  return (
    <Sidebar>
      <SidebarHeader>
        <span className="px-2 py-1 text-xl font-semibold">Triage</span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onNewIntake}>
                  <CirclePlus className="size-5!" />
                  <span>New Intake</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/summaries"}>
                  <Link href="/summaries">
                    <ScrollText className="size-5!" />
                    <span>Summaries</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Past sessions</SidebarGroupLabel>
          <SidebarGroupContent>
            {loading && visible.length === 0 ? (
              <SidebarMenu>
                {Array.from({ length: 4 }).map((_, i) => (
                  <SidebarMenuItem key={i}>
                    <SidebarMenuSkeleton />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            ) : visible.length === 0 ? (
              <p className="px-2 text-xs text-muted-foreground">Past sessions appear here.</p>
            ) : (
              <SidebarMenu>
                {visible.map((session) => (
                  <SidebarMenuItem key={session.id}>
                    <SidebarMenuButton
                      isActive={onChat && session.id === activeSessionId}
                      onClick={() => onSelect(session.id)}
                      title={session.preview ?? undefined}
                    >
                      <span>{session.preview ?? "New intake"}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
