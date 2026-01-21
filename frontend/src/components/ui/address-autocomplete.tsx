'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { MapPin, Loader2, X } from 'lucide-react';

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (place: { address: string; placeId?: string }) => void;
  placeholder?: string;
  className?: string;
  maxLength?: number;
  disabled?: boolean;
}

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
}

// 簡化台灣地址格式
function simplifyTaiwanAddress(address: string): string {
  return address
    .replace(/,\s*台灣$/, '') // 移除結尾的 ", 台灣"
    .replace(/台灣/g, '') // 移除所有 "台灣"
    .replace(/\d{3,6}/g, '') // 移除郵遞區號
    .replace(/^\s*,\s*/, '') // 移除開頭的逗號
    .replace(/,\s*,/g, ',') // 移除重複逗號
    .replace(/,\s*$/, '') // 移除結尾的逗號
    .trim();
}

// 從地址中提取主要部分（路名或地標）
function extractMainText(address: string, components?: any[]): string {
  // 優先從 address_components 提取
  if (components && components.length > 0) {
    // 尋找路名
    const route = components.find((c: any) => c.types?.includes('route'));
    if (route) return route.long_name;

    // 尋找地標
    const poi = components.find((c: any) => c.types?.includes('point_of_interest'));
    if (poi) return poi.long_name;

    // 使用第一個組件
    return components[0].long_name;
  }

  // 從格式化地址提取
  const simplified = simplifyTaiwanAddress(address);
  const parts = simplified.split(/[,，]/);
  return parts[0] || simplified;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = '輸入地址',
  className,
  maxLength = 200,
  disabled = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 使用 Google Geocoding API 搜尋地址
  const fetchPredictions = useCallback(async (input: string) => {
    if (!input || input.length < 2 || !apiKey) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${apiKey}&language=zh-TW&components=country:TW&region=tw`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const results = data.results.slice(0, 5).map((result: any) => ({
          place_id: result.place_id,
          description: simplifyTaiwanAddress(result.formatted_address),
          main_text: extractMainText(result.formatted_address, result.address_components),
        }));

        // 過濾重複的地址
        const uniqueResults = results.filter((item: Prediction, index: number, self: Prediction[]) =>
          index === self.findIndex((t) => t.description === item.description)
        );

        setPredictions(uniqueResults);
        setShowDropdown(true);
        setSelectedIndex(-1);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [apiKey]);

  // Debounced search
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (newValue.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchPredictions(newValue);
      }, 400); // 增加延遲以減少 API 請求
    } else {
      setPredictions([]);
      setShowDropdown(false);
    }
  };

  // 選擇地址
  const handleSelect = (prediction: Prediction) => {
    onChange(prediction.description);
    onSelect?.({ address: prediction.description, placeId: prediction.place_id });
    setPredictions([]);
    setShowDropdown(false);
    inputRef.current?.blur();
  };

  // 清除輸入
  const handleClear = () => {
    onChange('');
    setPredictions([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  // 點擊外部關閉下拉選單
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 鍵盤導航
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || predictions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < predictions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && predictions[selectedIndex]) {
          handleSelect(predictions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            setIsFocused(true);
            if (predictions.length > 0) {
              setShowDropdown(true);
            }
          }}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={disabled}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'placeholder:text-muted-foreground',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'pr-16',
            className
          )}
        />

        {/* 右側圖示區域 */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {value && !isLoading && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 hover:bg-muted rounded transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* 下拉選單 */}
      {showDropdown && predictions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
        >
          {predictions.map((prediction, index) => (
            <button
              key={prediction.place_id}
              type="button"
              onClick={() => handleSelect(prediction)}
              className={cn(
                'w-full px-3 py-2.5 text-left hover:bg-muted transition-colors flex items-start gap-2',
                index === selectedIndex && 'bg-muted',
                index === 0 && 'rounded-t-lg',
                index === predictions.length - 1 && 'rounded-b-lg'
              )}
            >
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-foreground font-medium truncate">
                  {prediction.main_text}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {prediction.description}
                </p>
              </div>
            </button>
          ))}

          {/* Google 標誌（使用 Geocoding API 需要顯示） */}
          <div className="px-3 py-2 border-t border-border">
            <p className="text-xs text-muted-foreground text-right">
              powered by Google
            </p>
          </div>
        </div>
      )}

      {/* 無結果提示 - 只在輸入足夠長度且無結果時顯示 */}
      {isFocused && value.length >= 3 && !isLoading && predictions.length === 0 && showDropdown === false && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 p-3">
          <p className="text-sm text-muted-foreground text-center">
            可直接使用輸入的文字
          </p>
        </div>
      )}
    </div>
  );
}
