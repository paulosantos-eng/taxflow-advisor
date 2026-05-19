import { OperationsClient } from "@/components/operations-client";

interface PageProps {
  params: { id: string };
}

export default function OperationsPage({ params }: PageProps) {
  return <OperationsClient clientId={params.id} />;
}
