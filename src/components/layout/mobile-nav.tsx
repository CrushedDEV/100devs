"use client";

import { useState } from "react";
import { Gamepad2, PanelLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { SidebarNav } from "./sidebar-nav";

export function MobileNav({ eventName }: { eventName: string }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className="lg:hidden"
          aria-label="Abrir navegación"
        >
          <PanelLeft className="size-4" />
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-64 bg-sidebar p-0">
        <div className="flex items-center gap-2.5 px-4 py-4">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Gamepad2 className="size-4" />
          </span>
          <SheetTitle className="truncate font-heading text-sm font-semibold">
            {eventName}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navegación principal del panel
          </SheetDescription>
        </div>

        <SidebarNav onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  );
}
