"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListChecks, Search, UsersRound, User } from "lucide-react";

import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { UserAvatar } from "@/components/shared/user-avatar";
import useDebounce from "@/hooks/use-debounce";
import { searchAction } from "@/server/actions/search";
import type { SearchResult, SearchResultKind } from "@/server/services/search";

const GROUPS: { kind: SearchResultKind; label: string }[] = [
  { kind: "participant", label: "Participantes" },
  { kind: "team", label: "Equipos" },
  { kind: "checkpoint", label: "Checkpoints" },
];

const ICONS = {
  participant: User,
  team: UsersRound,
  checkpoint: ListChecks,
} as const;

/**
 * ⌘K palette searching participants, teams and checkpoints in one place.
 * Queries run as a server action so no public search endpoint is exposed.
 */
export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  const debounced = useDebounce(query, 200);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const term = debounced.trim();

    startTransition(async () => {
      const next = term.length < 2 ? [] : await searchAction(term);
      // Guards against an earlier request resolving after a newer one.
      if (!cancelled) setResults(next);
    });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const onSelect = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery("");
      router.push(href);
    },
    [router],
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex h-8 w-full max-w-72 items-center gap-2 rounded-lg bg-muted/60 px-2.5 text-sm text-muted-foreground ring-1 ring-transparent transition-colors hover:bg-muted hover:ring-border focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Search className="size-3.5 shrink-0" />
        <span className="truncate">Buscar…</span>
        <kbd className="ml-auto hidden shrink-0 items-center gap-0.5 rounded border border-border bg-background px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
          ⌘K
        </kbd>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Buscador global"
        description="Busca participantes, equipos y checkpoints"
      >
        {/* Results are already filtered server-side. */}
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Busca participantes, equipos o checkpoints…"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
          <CommandEmpty>
            {query.trim().length < 2
              ? "Escribe al menos 2 caracteres."
              : isPending
                ? "Buscando…"
                : "Sin resultados."}
          </CommandEmpty>

          {GROUPS.map((group) => {
            const items = results.filter((item) => item.kind === group.kind);
            if (!items.length) return null;
            const Icon = ICONS[group.kind];

            return (
              <CommandGroup key={group.kind} heading={group.label}>
                {items.map((item) => (
                  <CommandItem
                    key={`${item.kind}-${item.id}`}
                    value={`${item.kind}-${item.id}`}
                    onSelect={() => onSelect(item.href)}
                    className="gap-2.5"
                  >
                    {item.kind === "participant" ? (
                      <UserAvatar
                        name={item.title}
                        avatarUrl={item.avatarUrl}
                        className="size-5"
                      />
                    ) : (
                      <span
                        className="flex size-5 items-center justify-center rounded-md"
                        style={{
                          backgroundColor: `${item.color ?? "#6366f1"}22`,
                          color: item.color ?? undefined,
                        }}
                      >
                        <Icon className="size-3" />
                      </span>
                    )}
                    <span className="truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">
                        {item.subtitle}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            );
          })}
          </CommandList>
        </Command>
      </CommandDialog>
    </>
  );
}
