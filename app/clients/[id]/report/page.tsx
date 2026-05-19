import { ClientReportClient } from "@/components/client-report-client";

interface PageProps {
  params: { id: string };
}

export default function ClientReportPage({ params }: PageProps) {
  return <ClientReportClient clientId={params.id} />;
}
