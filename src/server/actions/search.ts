"use server";

import { requireStaff } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/services/events";
import { globalSearch, type SearchResult } from "@/server/services/search";

/** Backs the ⌘K command palette. */
export async function searchAction(query: string): Promise<SearchResult[]> {
  await requireStaff();
  const { event } = await getActiveEvent();
  return globalSearch(event.id, query);
}
