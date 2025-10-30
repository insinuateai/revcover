import BrainReportButton from '@/components/BrainReportButton'

export default function Home() {
  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Revcover Dashboard</h1>
      <p>Generate the latest brain report and see the top next actions.</p>
      <BrainReportButton
        orgId="00000000-0000-0000-0000-000000000000"
        userId="11111111-1111-1111-1111-111111111111"
      />
    </main>
  )
}
