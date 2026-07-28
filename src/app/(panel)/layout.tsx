import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { requireStaff } from "@/server/auth/guard";
import { getActiveEvent } from "@/server/services/events";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const { event, settings } = await getActiveEvent();

  return (
    <div className="flex min-h-dvh">
      <Sidebar event={event} settings={settings} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          eventName={event.name}
          user={{
            name: session.user.username || session.user.name || "Staff",
            avatarUrl: session.user.image,
            role: session.user.role,
          }}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1400px] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
