import Sidebar from '@/components/dashboard/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-[260px]">{children}</main>
    </div>
  );
}
