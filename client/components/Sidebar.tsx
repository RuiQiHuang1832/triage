"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { BookTextIcon, type BookTextIconHandle } from "@/components/ui/book-text";
import { SquarePenIcon, type SquarePenIconHandle } from "@/components/ui/square-pen";
import type { SessionSummaryRow } from "@/lib/types";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton } from "@/components/ui/sidebar";

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
  const summariesIconRef = useRef<BookTextIconHandle>(null);
  const newIntakeIconRef = useRef<SquarePenIconHandle>(null);

  const visible = sessions.filter((s) => s.preview !== null || s.id === activeSessionId);

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 pb-4 pt-2">
          <Image src="/android-chrome-192x192.png" alt="" width={24} height={24} className="rounded-md" priority />
          <span className="text-xl font-semibold">Triage</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup className="py-0">
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={onNewIntake} onMouseEnter={() => newIntakeIconRef.current?.startAnimation()} onMouseLeave={() => newIntakeIconRef.current?.stopAnimation()}>
                  <SquarePenIcon ref={newIntakeIconRef} size={20} className="shrink-0 [&>svg]:size-5!" />
                  <span>New Intake</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={pathname === "/summaries"}>
                  <Link href="/summaries" onMouseEnter={() => summariesIconRef.current?.startAnimation()} onMouseLeave={() => summariesIconRef.current?.stopAnimation()}>
                    <BookTextIcon ref={summariesIconRef} size={20} className="shrink-0 [&>svg]:size-5!" />
                    <span>Summaries</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Recents</SidebarGroupLabel>
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
                    <SidebarMenuButton isActive={onChat && session.id === activeSessionId} onClick={() => onSelect(session.id)} title={session.preview ?? undefined}>
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
