import Sidebar from "./Sidebar";
import Navbar from "./Navbar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />

      <Navbar />

      <main className="ml-64 pt-20">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}