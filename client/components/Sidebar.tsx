import { CirclePlus } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

export function AppSidebar({ onNewIntake }: { onNewIntake?: () => void }) {
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
                <SidebarMenuButton onClick={onNewIntake} disabled={!onNewIntake}>
                  <CirclePlus className="!size-5" />
                  <span>New Intake</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Past sessions</SidebarGroupLabel>
          <SidebarGroupContent>
            <p className="px-2 text-xs text-muted-foreground">Past sessions appear here.</p>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
