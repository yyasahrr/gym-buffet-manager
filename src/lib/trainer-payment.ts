import type { AppData, TrainerBooking, TrainerWalletEntry } from './types';

export async function reconcileTrainerPayment(data: AppData, authority: string): Promise<AppData> {
  const res = await fetch(`/api/payments/status?authority=${encodeURIComponent(authority)}`);
  if (!res.ok) throw new Error('وضعیت پرداخت یافت نشد');
  const payment = await res.json();
  if (payment.status !== 'success' || payment.kind !== 'trainer_booking' || !payment.bookingId) return data;
  const bookings = (data.trainerBookings || []).map((b: TrainerBooking) => b.id === payment.bookingId ? { ...b, status: 'paid' as const } : b);
  const booking = bookings.find(b => b.id === payment.bookingId);
  if (!booking || (data.trainerWalletEntries || []).some((e: TrainerWalletEntry) => e.bookingId === booking.id && e.type === 'earning')) return { ...data, trainerBookings: bookings };
  const entry: TrainerWalletEntry = { id: `earning-${booking.id}`, trainerId: booking.trainerId, bookingId: booking.id, at: new Date().toISOString(), amount: booking.trainerShare, type: 'earning', status: 'approved', reference: payment.refId, description: 'درآمد رزرو مربی پس از تأیید درگاه' };
  return { ...data, trainerBookings: bookings, trainerWalletEntries: [...(data.trainerWalletEntries || []), entry] };
}
