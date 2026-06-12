"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState } from "react";
import { EllipsisVerticalIcon, Trash2Icon } from "lucide-react";
import { BookTextIcon, type BookTextIconHandle } from "@/components/ui/book-text";
import { SquarePenIcon, type SquarePenIconHandle } from "@/components/ui/square-pen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import type { SessionSummaryRow } from "@/lib/types";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarMenuSkeleton } from "@/components/ui/sidebar";

interface AppSidebarProps {
  sessions: SessionSummaryRow[];
  activeSessionId?: string;
  loading?: boolean;
  onSelect: (id: string) => void;
  onNewIntake: () => void;
  onDelete: (id: string) => Promise<void>;
}

export function AppSidebar({ sessions, activeSessionId, loading = false, onSelect, onNewIntake, onDelete }: AppSidebarProps) {
  const pathname = usePathname();
  const onChat = pathname === "/";
  const summariesIconRef = useRef<BookTextIconHandle>(null);
  const newIntakeIconRef = useRef<SquarePenIconHandle>(null);

  // The session awaiting delete confirmation, or null when the dialog is closed.
  const [pendingDelete, setPendingDelete] = useState<SessionSummaryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await onDelete(pendingDelete.id);
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  };

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
                      {/* A row only reaches the list with a null preview while its title is still being generated (the active session's first turn); show a skeleton until it arrives. */}
                      {session.preview === null ? <Skeleton className="h-4 w-28" /> : <span>{session.preview}</span>}
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover title="Conversation options">
                          <EllipsisVerticalIcon />
                          <span className="sr-only">Conversation options</span>
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="right" align="start">
                        {/* Defer opening the confirm dialog until the dropdown has fully closed, so the two Radix overlays don't fight over focus / body pointer-events. */}
                        <DropdownMenuItem variant="destructive" onSelect={() => setTimeout(() => setPendingDelete(session), 0)}>
                          <Trash2Icon />
                          <span>Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <Dialog open={pendingDelete !== null} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation?</DialogTitle>
            <DialogDescription>
              This permanently deletes “{pendingDelete?.preview ?? "this intake"}” and its summary. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={deleting}>Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}
