export type FactorType = 'Quality' | 'Value' | 'Growth' | 'Risk';

export function getScoreLevel(score: number | null | undefined): number {
  if (score === null || score === undefined) return 0;
  if (score >= 1.5) return 5;
  if (score >= 0.5) return 4;
  if (score > -0.5) return 3;
  if (score >= -1.5) return 2;
  return 1;
}

export function getFactorLabel(score: number | null | undefined, factorType: FactorType): string {
  const level = getScoreLevel(score);
  if (level === 0) return 'N/A';

  const mapping: Record<FactorType, Record<number, string>> = {
    Quality: { 5: 'ดีเยี่ยม', 4: 'ดี', 3: 'ปานกลาง', 2: 'แย่', 1: 'แย่มาก' },
    Growth: { 5: 'ดีเยี่ยม', 4: 'ดี', 3: 'ปานกลาง', 2: 'แย่', 1: 'แย่มาก' },
    Value: { 5: 'ถูก/คุ้มค่ามาก', 4: 'ค่อนข้างถูก', 3: 'ปานกลาง (แฟร์)', 2: 'แพง', 1: 'แพงมาก' },
    Risk: { 5: 'ปลอดภัยสูง', 4: 'ปลอดภัย', 3: 'ปานกลาง', 2: 'เสี่ยง', 1: 'เสี่ยงสูง' },
  };

  return mapping[factorType]?.[level] || 'N/A';
}

export function getTotalRatingLabel(totalScore: number | null | undefined, regimeName: string): string {
  const level = getScoreLevel(totalScore);
  if (level === 0) return 'N/A';

  if (regimeName && regimeName.includes('5. High Inflationary Pressure')) {
    return {
      5: 'ปลอดภัยสูง (แนะนำอย่างยิ่ง)',
      4: 'ปลอดภัย (น่าสนใจ)',
      3: 'ปานกลาง (เฝ้าระวัง)',
      2: 'เสี่ยง (ไม่แนะนำ)',
      1: 'เสี่ยงสูงมาก (หลีกเลี่ยง)',
    }[level] || 'N/A';
  }

  if (regimeName && (regimeName.includes('6. Goldilocks') || regimeName.includes('7. Strong Expansion'))) {
    return {
      5: 'เติบโตโดดเด่น',
      4: 'เติบโตดี',
      3: 'เติบโตปานกลาง',
      2: 'ชะลอตัว',
      1: 'ถดถอย',
    }[level] || 'N/A';
  }

  return {
    5: 'ดีเยี่ยม (Top Tier)',
    4: 'ดี (Attractive)',
    3: 'ปานกลาง (Neutral)',
    2: 'อ่อนแอ (Underperform)',
    1: 'แย่มาก (Avoid)',
  }[level] || 'N/A';
}
