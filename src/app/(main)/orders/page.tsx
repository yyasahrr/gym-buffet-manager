import { Header } from '@/components/header';
import { PageHeader } from '@/components/page-header';
import OrderClient from '@/components/orders/order-client';

export default function OrdersPage() {
  return (
    <div className="flex flex-col sm:gap-4 sm:py-4">
      <Header breadcrumbs={[]} activeBreadcrumb="سفارشات" />
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <PageHeader title="ایجاد سفارش" />
        <OrderClient />
      </main>
    </div>
  );
}
