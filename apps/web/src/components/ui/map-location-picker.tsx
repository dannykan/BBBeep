'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Navigation, Search } from 'lucide-react';
import { toast } from 'sonner';

interface MapLocationPickerProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (location: { address: string; lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number };
}

// Google Maps Script 載入狀態
let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (googleMapsLoaded) {
      resolve();
      return;
    }

    if (googleMapsLoading) {
      loadCallbacks.push(() => resolve());
      return;
    }

    googleMapsLoading = true;

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&language=zh-TW`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      resolve();
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };

    script.onerror = () => {
      googleMapsLoading = false;
      reject(new Error('Failed to load Google Maps'));
    };

    document.head.appendChild(script);
  });
}

// 簡化台灣地址
// 預設位置：台北市中心
const DEFAULT_CENTER = { lat: 25.033, lng: 121.5654 };

function simplifyAddress(address: string): string {
  return address
    .replace(/,\s*台灣$/, '')
    .replace(/台灣/g, '')
    .replace(/\d{3,6}/g, '')
    .replace(/^\s*,\s*/, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/, '')
    .trim();
}

export function MapLocationPicker({
  open,
  onClose,
  onConfirm,
  initialLocation,
}: MapLocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const [isGettingAddress, setIsGettingAddress] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  // 反向地理編碼
  const reverseGeocode = useCallback(async (lat: number, lng: number): Promise<string> => {
    if (!apiKey) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=zh-TW`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        return simplifyAddress(data.results[0].formatted_address);
      }
    } catch (error) {
      console.error('Reverse geocode error:', error);
    }

    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }, [apiKey]);

  // 更新標記位置
  const updateMarker = useCallback(async (lat: number, lng: number) => {
    if (!mapInstanceRef.current) return;

    setIsGettingAddress(true);

    // 更新或創建標記
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      markerRef.current = new google.maps.Marker({
        position: { lat, lng },
        map: mapInstanceRef.current,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });

      // 標記拖曳結束事件
      markerRef.current.addListener('dragend', () => {
        const position = markerRef.current?.getPosition();
        if (position) {
          updateMarker(position.lat(), position.lng());
        }
      });
    }

    // 取得地址
    const address = await reverseGeocode(lat, lng);
    setSelectedLocation({ lat, lng, address });
    setIsGettingAddress(false);
  }, [reverseGeocode]);

  // 初始化地圖
  useEffect(() => {
    if (!open || !apiKey) return;

    let isMounted = true;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript(apiKey);

        if (!isMounted || !mapRef.current) return;

        const center = initialLocation || DEFAULT_CENTER;

        mapInstanceRef.current = new google.maps.Map(mapRef.current, {
          center,
          zoom: 15,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }],
            },
          ],
        });

        // 地圖點擊事件
        mapInstanceRef.current.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (e.latLng) {
            updateMarker(e.latLng.lat(), e.latLng.lng());
          }
        });

        // 如果有初始位置，顯示標記
        if (initialLocation) {
          updateMarker(initialLocation.lat, initialLocation.lng);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Map init error:', error);
        toast.error('無法載入地圖');
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      isMounted = false;
    };
  }, [open, apiKey, initialLocation, updateMarker]);

  // 關閉時清理
  useEffect(() => {
    if (!open) {
      setSelectedLocation(null);
      setSearchQuery('');
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
    }
  }, [open]);

  // 取得目前位置
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('您的瀏覽器不支援地理位置功能');
      return;
    }

    setIsGettingAddress(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat: latitude, lng: longitude });
          mapInstanceRef.current.setZoom(17);
        }
        updateMarker(latitude, longitude);
      },
      (error) => {
        setIsGettingAddress(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error('您已拒絕位置存取權限');
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error('無法取得位置資訊');
            break;
          default:
            toast.error('無法取得位置');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 搜尋地址
  const handleSearch = async () => {
    if (!searchQuery.trim() || !apiKey) return;

    setIsGettingAddress(true);

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${apiKey}&language=zh-TW&components=country:TW&region=tw`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry.location;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo({ lat, lng });
          mapInstanceRef.current.setZoom(17);
        }
        updateMarker(lat, lng);
      } else {
        toast.error('找不到此地址');
        setIsGettingAddress(false);
      }
    } catch (error) {
      toast.error('搜尋失敗');
      setIsGettingAddress(false);
    }
  };

  // 確認選擇
  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirm(selectedLocation);
      onClose();
    }
  };

  if (!apiKey) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-center">選擇事發地點</DialogTitle>
        </DialogHeader>

        {/* 搜尋框 */}
        <div className="px-4 pb-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="搜尋地址..."
                className="w-full h-9 pl-3 pr-9 text-sm border border-input rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleGetCurrentLocation}
              className="h-9 px-3 bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-1.5"
              title="使用目前位置"
            >
              <Navigation className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 地圖 */}
        <div className="relative h-[300px] bg-muted">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />

          {/* 中心提示 */}
          {!selectedLocation && !isLoading && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
              <div className="bg-background/90 px-3 py-2 rounded-lg shadow-lg text-sm text-muted-foreground">
                點擊地圖選擇位置
              </div>
            </div>
          )}
        </div>

        {/* 選中的地址 */}
        <div className="p-4 border-t border-border">
          {selectedLocation ? (
            <div className="flex items-start gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                {isGettingAddress ? (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">取得地址中...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground">
                      {selectedLocation.address}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      可拖曳標記調整位置
                    </p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground mb-4">
              <MapPin className="h-5 w-5" />
              <span className="text-sm">尚未選擇位置</span>
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              取消
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedLocation || isGettingAddress}
              className="flex-1"
            >
              確認選擇
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
