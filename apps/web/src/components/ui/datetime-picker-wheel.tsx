'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface WheelColumnProps {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  width?: string;
}

function WheelColumn({ items, value, onChange, width = 'w-20' }: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemHeight = 40;
  const visibleItems = 5;

  // 當 value 改變時，滾動到正確位置
  React.useEffect(() => {
    const index = items.findIndex(item => item.value === value);
    if (index !== -1 && containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [value, items]);

  const handleScroll = React.useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    if (items[clampedIndex].value !== value) {
      onChange(items[clampedIndex].value);
    }
  }, [items, value, onChange]);

  // 使用 debounced scroll handler
  const scrollTimeoutRef = React.useRef<NodeJS.Timeout>();
  const onScroll = () => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(handleScroll, 50);
  };

  return (
    <div className={cn("relative h-[200px] overflow-hidden", width)}>
      {/* 選中區域高亮 */}
      <div
        className="absolute left-0 right-0 pointer-events-none z-10 border-y border-primary/30 bg-primary/5"
        style={{
          top: `${(visibleItems - 1) / 2 * itemHeight}px`,
          height: `${itemHeight}px`,
        }}
      />

      {/* 上方漸層 */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none z-20 bg-gradient-to-b from-background to-transparent"
        style={{ height: `${(visibleItems - 1) / 2 * itemHeight}px` }}
      />

      {/* 下方漸層 */}
      <div
        className="absolute bottom-0 left-0 right-0 pointer-events-none z-20 bg-gradient-to-t from-background to-transparent"
        style={{ height: `${(visibleItems - 1) / 2 * itemHeight}px` }}
      />

      {/* 滾動容器 */}
      <div
        ref={containerRef}
        className="h-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
        onScroll={onScroll}
        style={{
          scrollSnapType: 'y mandatory',
          paddingTop: `${(visibleItems - 1) / 2 * itemHeight}px`,
          paddingBottom: `${(visibleItems - 1) / 2 * itemHeight}px`,
        }}
      >
        {items.map((item) => (
          <div
            key={item.value}
            className={cn(
              'h-[40px] flex items-center justify-center text-base transition-colors snap-center px-1',
              item.value === value ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}
            onClick={() => onChange(item.value)}
          >
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

interface DateTimePickerWheelProps {
  value: Date;
  onChange: (date: Date) => void;
  maxDate?: Date; // 最大可選日期時間（預設為現在）
  minDate?: Date; // 最小可選日期時間（預設為 7 天前）
}

export function DateTimePickerWheel({ value, onChange, maxDate, minDate }: DateTimePickerWheelProps) {
  const now = React.useMemo(() => maxDate || new Date(), [maxDate]);
  const sevenDaysAgo = React.useMemo(
    () => minDate || new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    [minDate, now]
  );

  // 判斷是否為今天
  const todayStr = React.useMemo(() => {
    const today = new Date(now);
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, [now]);

  const currentDateStr = React.useMemo(() => {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }, [value]);

  const isToday = currentDateStr === todayStr;
  const nowHour = now.getHours();
  const nowMinute = now.getMinutes();

  // 生成日期選項（今天到 7 天前）
  const dates = React.useMemo(() => {
    const result: { value: string; label: string }[] = [];
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i <= 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

      let label = `${month}/${day}`;
      if (i === 0) label = `今天 (${month}/${day})`;
      else if (i === 1) label = `昨天 (${month}/${day})`;

      result.push({ value: dateStr, label });
    }
    return result;
  }, [now]);

  // 生成小時選項 - 如果是今天，只顯示到當前小時
  const hours = React.useMemo(() => {
    const maxHour = isToday ? nowHour : 23;
    return Array.from({ length: maxHour + 1 }, (_, i) => ({
      value: i.toString().padStart(2, '0'),
      label: i.toString().padStart(2, '0'),
    }));
  }, [isToday, nowHour]);

  // 生成分鐘選項 - 如果是今天且是當前小時，只顯示到當前分鐘
  const selectedHour = value.getHours();
  const minutes = React.useMemo(() => {
    const maxMinute = (isToday && selectedHour === nowHour) ? nowMinute : 59;
    // 四捨五入到 5 分鐘
    const maxMinuteRounded = Math.floor(maxMinute / 5) * 5;
    const count = Math.floor(maxMinuteRounded / 5) + 1;
    return Array.from({ length: count }, (_, i) => ({
      value: (i * 5).toString().padStart(2, '0'),
      label: (i * 5).toString().padStart(2, '0'),
    }));
  }, [isToday, selectedHour, nowHour, nowMinute]);

  const currentHour = value.getHours().toString().padStart(2, '0');
  // 四捨五入到最近的 5 分鐘
  const currentMinute = (Math.floor(value.getMinutes() / 5) * 5).toString().padStart(2, '0');

  const handleDateChange = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    const newDate = new Date(value);
    newDate.setFullYear(year, month - 1, day);

    // 如果切換到今天，且時間超過當前時間，調整為當前時間
    const newDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    if (newDateStr === todayStr && newDate > now) {
      newDate.setHours(nowHour);
      newDate.setMinutes(Math.floor(nowMinute / 5) * 5);
    }

    // 確保不早於最小時間
    if (newDate < sevenDaysAgo) {
      newDate.setTime(sevenDaysAgo.getTime());
    }

    onChange(newDate);
  };

  const handleHourChange = (hour: string) => {
    const newDate = new Date(value);
    const hourNum = parseInt(hour, 10);
    newDate.setHours(hourNum);

    // 如果是今天且選擇當前小時，分鐘不能超過當前分鐘
    if (isToday && hourNum === nowHour && newDate.getMinutes() > nowMinute) {
      newDate.setMinutes(Math.floor(nowMinute / 5) * 5);
    }

    // 確保不超過最大時間
    if (newDate > now) {
      newDate.setMinutes(Math.floor(nowMinute / 5) * 5);
    }

    onChange(newDate);
  };

  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(value);
    newDate.setMinutes(parseInt(minute, 10));

    // 確保不超過最大時間
    if (newDate > now) {
      newDate.setTime(now.getTime());
      newDate.setMinutes(Math.floor(nowMinute / 5) * 5);
    }

    onChange(newDate);
  };

  return (
    <div className="flex items-center justify-center gap-1">
      <WheelColumn
        items={dates}
        value={currentDateStr}
        onChange={handleDateChange}
        width="w-28"
      />
      <WheelColumn
        items={hours}
        value={currentHour}
        onChange={handleHourChange}
        width="w-14"
      />
      <span className="text-xl font-medium text-muted-foreground">:</span>
      <WheelColumn
        items={minutes}
        value={currentMinute}
        onChange={handleMinuteChange}
        width="w-14"
      />
    </div>
  );
}
