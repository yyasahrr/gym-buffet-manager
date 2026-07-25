// Lightweight loyalty program for the buffet. Points are earned on buffet
// purchases and can be redeemed as a discount. Kept separate from gym accounts.

export const LOYALTY_PER_TOMAN = 10000; // ۱ امتیاز به ازای هر ۱۰ هزار تومان
export const LOYALTY_REDEEM_TOMAN = 1000; // هر امتیاز = ۱۰۰۰ تومان تخفیف

export function earnPoints(amountToman: number): number {
  return Math.floor((amountToman || 0) / LOYALTY_PER_TOMAN);
}

export function pointsToToman(points: number): number {
  return Math.floor(points || 0) * LOYALTY_REDEEM_TOMAN;
}
