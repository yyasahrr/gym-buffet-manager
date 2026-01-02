import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import OrderClient from '@/components/orders/order-client';

export default function OrdersPage() {
  return (
    <>
      <Header breadcrumbs={[]} activeBreadcrumb="سفارشات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-6">
        <PageHeader title="ایجاد سفارش" />
        <OrderClient />
      </main>
    </>
  );
}
