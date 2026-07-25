import { PortalView } from '@/components/portal/portal-view';

export default async function PortalTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PortalView token={token} />;
}
