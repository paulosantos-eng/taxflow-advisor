import { RebalanceClient } from "@/components/rebalance-client";

interface PageProps {
  params: { id: string };
}

export default function RebalancePage({ params }: PageProps) {
  return <RebalanceClient clientId={params.id} />;
}
