export function calculateTargetAmountMinor(sourceAmountMinor: number, rate: string): number {
  const [integerPart, fractionPart = ''] = rate.split('.');
  if (!integerPart) throw new Error('Exchange rate is outside supported format');
  const normalizedFraction = `${fractionPart}0000000000`.slice(0, 10);
  const scaledRate = BigInt(integerPart) * 10_000_000_000n + BigInt(normalizedFraction);
  const numerator = BigInt(sourceAmountMinor) * scaledRate;
  const rounded = (numerator + 5_000_000_000n) / 10_000_000_000n;
  const result = Number(rounded);
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('Calculated exchange amount is outside supported range');
  return result;
}
