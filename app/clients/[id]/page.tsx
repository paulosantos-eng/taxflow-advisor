import { ClientDetailClient } from "@/components/client-detail-client";

interface PageProps {
  params: { id: string };
}

export default function ClientPage({ params }: PageProps) {
  return <ClientDetailClient clientId={params.id} />;
}
