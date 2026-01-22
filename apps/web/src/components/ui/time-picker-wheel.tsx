'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface WheelColumnProps {
  items: string[];
  value: string;
  onChange: (value: string) => void;
}

function WheelColumn({ items, value, onChange }: WheelColumnProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const itemHeight = 40;
  const visibleItems = 5;

  // 當 value 改變時，滾動到正確位置
  React.useEffect(() => {
    const index = items.indexOf(value);
    if (index !== -1 && containerRef.current) {
      containerRef.current.scrollTop = index * itemHeight;
    }
  }, [value, items]);

  const handleScroll = React.useCallback(() => {
    if (!containerRef.current) return;
    const scrollTop = containerRef.current.scrollTop;
    const index = Math.round(scrollTop / itemHeight);
    const clampedIndex = Math.max(0, Math.min(index, items.length - 1));
    if (items[clampedIndex] !== value) {
      onChange(items[clampedIndex]);
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
    <div className="relative h-[200px] overflow-hidden">
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
            key={item}
            className={cn(
              'h-[40px] flex items-center justify-center text-lg transition-colors snap-center',
              item === value ? 'text-foreground font-medium' : 'text-muted-foreground'
            )}
            onClick={() => onChange(item)}
          >
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

interface TimePickerWheelProps {
  value: Date;
  onChange: (date: Date) => void;
  maxTime?: Date; // 最大可選時間（預設為現在）
}

export function TimePickerWheel({ value, onChange, maxTime }: TimePickerWheelProps) {
  const now = maxTime || new Date();

  // 生成小時選項 (0-23)
  const hours = React.useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  }, []);

  // 生成分鐘選項 (0-59)
  const minutes = React.useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));
  }, []);

  const currentHour = value.getHours().toString().padStart(2, '0');
  const currentMinute = value.getMinutes().toString().padStart(2, '0');

  const handleHourChange = (hour: string) => {
    const newDate = new Date(value);
    newDate.setHours(parseInt(hour, 10));

    // 確保不超過最大時間
    if (newDate > now) {
      newDate.setTime(now.getTime());
    }

    onChange(newDate);
  };

  const handleMinuteChange = (minute: string) => {
    const newDate = new Date(value);
    newDate.setMinutes(parseInt(minute, 10));

    // 確保不超過最大時間
    if (newDate > now) {
      newDate.setTime(now.getTime());
    }

    onChange(newDate);
  };

  return (
    <div className="flex items-center justify-center gap-2">
      <WheelColumn
        items={hours}
        value={currentHour}
        onChange={handleHourChange}
      />
      <span className="text-2xl font-medium text-muted-foreground">:</span>
      <WheelColumn
        items={minutes}
        value={currentMinute}
        onChange={handleMinuteChange}
      />
    </div>
  );
}
