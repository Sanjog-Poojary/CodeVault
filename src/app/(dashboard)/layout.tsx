import Sidebar from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        background: '#0F1117',
      }}
    >
      <Sidebar />
      <main
        style={{
          flex: 1,
          padding: '32px',
          maxWidth: '1200px',
          margin: '0 auto',
          paddingBottom: '80px', // mobile bottom bar clearance
        }}
        className="page-enter"
      >
        {children}
      </main>
    </div>
  );
}
