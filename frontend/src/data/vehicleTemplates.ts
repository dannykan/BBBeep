/**
 * 🚗🛵 汽車 / 機車分流模板庫 v1.0
 */

export type VehicleType = 'car' | 'scooter';

export const SITUATIONS_CAR = {
  '車況提醒': [
    { id: 'lights', label: '車燈未開' },
    { id: 'door', label: '車門未關' },
    { id: 'trunk', label: '行李箱' },
    { id: 'tire', label: '輪胎異常' },
    { id: 'window', label: '車窗未關' },
    { id: 'other-vehicle', label: '其他車況' },
  ],
  '行車安全提醒': [
    { id: 'signal', label: '未打方向燈' },
    { id: 'lane', label: '變換車道' },
    { id: 'speed', label: '車速過快' },
    { id: 'distance', label: '跟車太近' },
    { id: 'pedestrian', label: '路口/行人' },
    { id: 'other-safety', label: '其他安全' },
  ],
  '讚美感謝': [
    { id: 'thank-yield', label: '謝謝讓路' },
    { id: 'stable', label: '行車穩定' },
    { id: 'pedestrian-yield', label: '禮讓行人' },
    { id: 'distance-keep', label: '保持距離' },
    { id: 'other-praise', label: '其他讚美' },
  ],
};

export const GENERATED_MESSAGES_CAR: Record<string, string> = {
  'lights': '提醒您車燈似乎尚未開啟，行駛時請多注意安全。',
  'door': '提醒您車門可能未完全關閉，為了安全請多留意。',
  'trunk': '提醒您行李箱似乎未完全關好，行駛時請多注意。',
  'tire': '提醒您車輛輪胎狀況似乎有些異常，建議留意安全。',
  'window': '提醒您車窗可能尚未關閉，行駛時請多注意。',
  'other-vehicle': '提醒您車輛狀況可能需要留意，請多注意行車安全。',
  'signal': '剛剛變換車道時似乎未打方向燈，提醒您注意行車安全。',
  'lane': '剛剛變換車道時距離較近，提醒您多留意行車安全。',
  'speed': '剛剛行駛速度似乎較快，提醒您注意行車安全。',
  'distance': '剛剛與前車距離較近，提醒您保持安全車距。',
  'pedestrian': '經過路口時情況較複雜，提醒您多留意行人安全。',
  'other-safety': '剛剛的行車狀況可能較有風險，提醒您多注意安全。',
  'thank-yield': '謝謝您剛剛的禮讓，讓行車更加順暢。',
  'stable': '剛剛的行車方式很穩定，謝謝您保持良好習慣。',
  'pedestrian-yield': '謝謝您禮讓行人，讓道路環境更加友善。',
  'distance-keep': '謝謝您保持良好的車距，讓行車更安全。',
  'other-praise': '謝謝您的駕駛方式，讓人感到安心。',
};

export const SITUATIONS_SCOOTER = {
  '車況提醒': [
    { id: 'lights', label: '大燈未開' },
    { id: 'rear-cargo', label: '後座物品' },
    { id: 'plate-blocked', label: '車牌遮擋' },
    { id: 'tire', label: '輪胎異常' },
    { id: 'exhaust', label: '排氣管異常' },
    { id: 'other-vehicle', label: '其他車況' },
  ],
  '行車安全提醒': [
    { id: 'helmet', label: '未戴安全帽' },
    { id: 'signal', label: '未打方向燈' },
    { id: 'lane', label: '變換車道' },
    { id: 'unstable', label: '騎乘不穩' },
    { id: 'pedestrian', label: '行人/路口' },
    { id: 'other-safety', label: '其他安全' },
  ],
  '讚美感謝': [
    { id: 'thank-yield', label: '謝謝讓路' },
    { id: 'stable', label: '騎乘穩定' },
    { id: 'pedestrian-yield', label: '禮讓行人' },
    { id: 'distance-keep', label: '保持距離' },
    { id: 'other-praise', label: '其他讚美' },
  ],
};

export const GENERATED_MESSAGES_SCOOTER: Record<string, string> = {
  'lights': '提醒您大燈似乎尚未開啟，夜間騎乘請多注意安全。',
  'rear-cargo': '提醒您後座物品可能未固定，騎乘時請多留意。',
  'plate-blocked': '提醒您車牌可能被遮擋，騎乘時請多注意。',
  'tire': '提醒您輪胎狀況似乎有些異常，建議留意安全。',
  'exhaust': '提醒您排氣管狀況可能異常，騎乘時請多注意。',
  'other-vehicle': '提醒您機車狀況可能需要留意，請多注意騎乘安全。',
  'helmet': '提醒您騎乘時請記得配戴安全帽，注意行車安全。',
  'signal': '剛剛變換車道時似乎未打方向燈，騎乘時請多注意。',
  'lane': '剛剛變換車道時距離較近，提醒您注意騎乘安全。',
  'unstable': '剛剛騎乘狀況似乎不太穩定，提醒您多留意安全。',
  'pedestrian': '經過路口時情況較複雜，提醒您多注意行人安全。',
  'other-safety': '剛剛的騎乘狀況可能較有風險，提醒您多注意安全。',
  'thank-yield': '謝謝您剛剛的禮讓，讓道路更加順暢。',
  'stable': '剛剛的騎乘方式很穩定，謝謝您保持良好習慣。',
  'pedestrian-yield': '謝謝您禮讓行人，讓道路環境更加友善。',
  'distance-keep': '謝謝您保持適當距離，讓騎乘更安全。',
  'other-praise': '謝謝您的騎乘方式，讓人感到安心。',
};

export const getSituationsByVehicleType = (vehicleType: VehicleType, category: string) => {
  const situations = vehicleType === 'car' ? SITUATIONS_CAR : SITUATIONS_SCOOTER;
  return situations[category as keyof typeof situations] || [];
};

export const getMessageByVehicleType = (vehicleType: VehicleType, situationId: string): string => {
  const messages = vehicleType === 'car' ? GENERATED_MESSAGES_CAR : GENERATED_MESSAGES_SCOOTER;
  return messages[situationId] || '';
};

export const formatPlateNumber = (input: string, vehicleType: VehicleType): string => {
  // 只去除非字母數字字符，不添加分隔符（用戶不喜歡輸入分隔符）
  const cleaned = input.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned;
};

export const validatePlateFormat = (plate: string, vehicleType: VehicleType): boolean => {
  if (!plate || plate.length < 3) return false;
  const cleaned = plate.replace(/[^A-Z0-9]/g, '');
  if (vehicleType === 'car') {
    return cleaned.length >= 4 && cleaned.length <= 7;
  } else {
    return cleaned.length >= 4 && cleaned.length <= 6;
  }
};

export const getPlatePlaceholder = (vehicleType: VehicleType): string => {
  return vehicleType === 'car' ? 'ABC-1234' : 'ABC-123 或 123-ABC';
};

export const getVehicleTypeName = (vehicleType: VehicleType): string => {
  return vehicleType === 'car' ? '汽車' : '機車';
};
