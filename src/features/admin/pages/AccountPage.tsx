import { AdminShell } from "../layout/AdminShell";

export function AccountPage() {
  return (
    <AdminShell>
      <div className="flex min-h-full flex-1 flex-col bg-white p-4 shadow-[0_10px_20px_rgba(148,163,184,0.2)]">
        <main className="flex min-h-[calc(100vh-6rem)] items-center justify-center">
          <div className="rounded-lg border border-[#e2e8f0] bg-[#f8fafc] px-8 py-6 text-center">
            <h1 className="text-2xl font-semibold text-[#2c2c2c]">Account</h1>
            <p className="mt-2 text-sm text-[#667085]">Coming soon</p>
          </div>
        </main>
      </div>
    </AdminShell>
  );
}

