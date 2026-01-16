import { useMemo } from 'react';
import { GiftData } from '@/types';

interface GiftWithRecord {
  record: { id: string };
  data: GiftData | null;
}

interface GiftStats {
  validGifts: GiftData[];
  totalAmount: number;
  totalGivers: number;
  typeStats: Record<string, { amount: number; count: number }>;
}

/**
 * 计算礼金统计信息的 Hook
 */
export function useGiftStats(gifts: GiftWithRecord[]): GiftStats {
  const validGifts = useMemo(
    () =>
      gifts
        .filter((g) => g.data && !g.data.abolished)
        .map((g) => g.data!),
    [gifts]
  );

  const totalAmount = useMemo(
    () => validGifts.reduce((sum, g) => sum + g.amount, 0),
    [validGifts]
  );

  const totalGivers = validGifts.length;

  const typeStats = useMemo(() => {
    const stats: Record<string, { amount: number; count: number }> = {};
    validGifts.forEach((gift) => {
      if (!stats[gift.type]) {
        stats[gift.type] = { amount: 0, count: 0 };
      }
      stats[gift.type].amount += gift.amount;
      stats[gift.type].count += 1;
    });
    return stats;
  }, [validGifts]);

  return {
    validGifts,
    totalAmount,
    totalGivers,
    typeStats,
  };
}
