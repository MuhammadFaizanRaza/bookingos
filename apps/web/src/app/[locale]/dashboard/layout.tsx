import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';
import { AuthGuard } from '@/components/dashboard/auth-guard';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-muted/20">
        <aside className="fixed inset-y-0 start-0 z-40 hidden w-64 border-e bg-background lg:block">
          <Sidebar />
        </aside>
        <div className="flex min-h-screen flex-1 flex-col lg:ps-64">
          <Topbar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  );
}
