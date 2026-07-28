import { GlobalSearch } from "@/components/search/global-search";
import type { AppRole } from "@/lib/constants";

import { MobileNav } from "./mobile-nav";
import { SyncButton } from "./sync-button";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

interface TopbarProps {
  eventName: string;
  user: { name: string; avatarUrl?: string | null; role: AppRole };
}

export function Topbar({ eventName, user }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border/70 bg-background/80 px-4 backdrop-blur-md">
      <MobileNav eventName={eventName} />

      <div className="flex flex-1 items-center">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-1">
        <SyncButton />
        <ThemeToggle />
        <UserMenu
          name={user.name}
          avatarUrl={user.avatarUrl}
          role={user.role}
        />
      </div>
    </header>
  );
}
