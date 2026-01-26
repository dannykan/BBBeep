/**
 * DraftContext - 語音草稿狀態管理
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Audio } from 'expo-av';
import * as Location from 'expo-location';
import {
  draftsApi,
  uploadApi,
  VoiceDraft,
  CreateDraftRequest,
} from '@bbbeeep/shared';

interface DraftState {
  // 草稿列表
  drafts: VoiceDraft[];
  pendingCount: number;
  isLoading: boolean;
  error: string | null;

  // 錄音狀態
  isRecording: boolean;
  recordingDuration: number;
  recordingUri: string | null;
}

interface DraftContextValue extends DraftState {
  // 草稿管理
  fetchDrafts: () => Promise<void>;
  fetchPendingCount: () => Promise<void>;
  deleteDraft: (id: string) => Promise<void>;
  markDraftAsSent: (id: string) => Promise<void>;

  // 錄音控制
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<{ uri: string; duration: number } | null>;
  cancelRecording: () => Promise<void>;

  // 儲存草稿
  saveDraft: (
    voiceUri: string,
    duration: number,
    transcript?: string,
  ) => Promise<VoiceDraft>;
}

const DraftContext = createContext<DraftContextValue | null>(null);

const MAX_RECORDING_DURATION = 30; // 最大錄音秒數

export function DraftProvider({ children }: { children: ReactNode }) {
  // 狀態
  const [drafts, setDrafts] = useState<VoiceDraft[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 錄音狀態
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [durationInterval, setDurationInterval] = useState<NodeJS.Timeout | null>(null);

  // 清理錄音 interval
  useEffect(() => {
    return () => {
      if (durationInterval) {
        clearInterval(durationInterval);
      }
    };
  }, [durationInterval]);

  // 取得草稿列表
  const fetchDrafts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await draftsApi.getAll();
      setDrafts(response.drafts);
      setPendingCount(
        response.drafts.filter((d) => d.status === 'READY').length,
      );
    } catch (err: any) {
      setError(err.message || '無法載入草稿');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 取得待處理數量
  const fetchPendingCount = useCallback(async () => {
    try {
      const response = await draftsApi.getCount();
      setPendingCount(response.count);
    } catch (err) {
      console.error('Failed to fetch pending count:', err);
    }
  }, []);

  // 刪除草稿
  const deleteDraft = useCallback(async (id: string) => {
    try {
      await draftsApi.delete(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      throw new Error(err.message || '刪除失敗');
    }
  }, []);

  // 標記為已發送
  const markDraftAsSent = useCallback(async (id: string) => {
    try {
      await draftsApi.markAsSent(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setPendingCount((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      throw new Error(err.message || '更新失敗');
    }
  }, []);

  // 開始錄音
  const startRecording = useCallback(async () => {
    try {
      // 請求權限
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('需要麥克風權限才能錄音');
      }

      // 設定音訊模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // 開始錄音
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      setRecordingUri(null);

      // 計時器
      const interval = setInterval(() => {
        setRecordingDuration((prev) => {
          const next = prev + 1;
          // 自動停止
          if (next >= MAX_RECORDING_DURATION) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
      setDurationInterval(interval);
    } catch (err: any) {
      console.error('Failed to start recording:', err);
      throw new Error(err.message || '無法開始錄音');
    }
  }, []);

  // 停止錄音
  const stopRecording = useCallback(async () => {
    if (!recording) return null;

    try {
      // 清理計時器
      if (durationInterval) {
        clearInterval(durationInterval);
        setDurationInterval(null);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      const status = await recording.getStatusAsync();
      const duration = Math.ceil((status.durationMillis || 0) / 1000);

      setRecording(null);
      setIsRecording(false);
      setRecordingUri(uri);

      // 重置音訊模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      if (uri) {
        return { uri, duration };
      }
      return null;
    } catch (err: any) {
      console.error('Failed to stop recording:', err);
      setIsRecording(false);
      throw new Error(err.message || '無法停止錄音');
    }
  }, [recording, durationInterval]);

  // 取消錄音
  const cancelRecording = useCallback(async () => {
    if (!recording) return;

    try {
      // 清理計時器
      if (durationInterval) {
        clearInterval(durationInterval);
        setDurationInterval(null);
      }

      await recording.stopAndUnloadAsync();
      setRecording(null);
      setIsRecording(false);
      setRecordingDuration(0);
      setRecordingUri(null);

      // 重置音訊模式
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (err: any) {
      console.error('Failed to cancel recording:', err);
      setIsRecording(false);
    }
  }, [recording, durationInterval]);

  // 儲存草稿
  const saveDraft = useCallback(
    async (
      voiceUri: string,
      duration: number,
      transcript?: string,
    ): Promise<VoiceDraft> => {
      setIsLoading(true);
      setError(null);

      try {
        // 1. 上傳語音檔案
        const uploadResult = await uploadApi.uploadVoice(voiceUri);

        // 2. 取得位置（如果可用）
        let latitude: number | undefined;
        let longitude: number | undefined;
        let address: string | undefined;

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({
              accuracy: Location.Accuracy.Balanced,
            });
            latitude = location.coords.latitude;
            longitude = location.coords.longitude;

            // 反向地理編碼取得地址
            const [addressResult] = await Location.reverseGeocodeAsync({
              latitude,
              longitude,
            });
            if (addressResult) {
              address = [
                addressResult.city,
                addressResult.district,
                addressResult.street,
              ]
                .filter(Boolean)
                .join('');
            }
          }
        } catch (locationErr) {
          console.warn('Could not get location:', locationErr);
        }

        // 3. 語音轉文字（如果前端沒有提供）
        let finalTranscript = transcript;
        if (!finalTranscript) {
          try {
            const transcribeResult = await uploadApi.transcribeVoice(voiceUri);
            finalTranscript = transcribeResult.text;
          } catch (transcribeErr) {
            console.warn('Could not transcribe voice:', transcribeErr);
          }
        }

        // 4. 建立草稿
        const draftData: CreateDraftRequest = {
          voiceUrl: uploadResult.url,
          voiceDuration: duration,
          transcript: finalTranscript,
          latitude,
          longitude,
          address,
        };

        const draft = await draftsApi.create(draftData);

        // 更新本地狀態
        setDrafts((prev) => [draft, ...prev]);
        setPendingCount((prev) => prev + 1);

        return draft;
      } catch (err: any) {
        setError(err.message || '儲存草稿失敗');
        throw new Error(err.message || '儲存草稿失敗');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const value: DraftContextValue = {
    // 狀態
    drafts,
    pendingCount,
    isLoading,
    error,
    isRecording,
    recordingDuration,
    recordingUri,

    // 方法
    fetchDrafts,
    fetchPendingCount,
    deleteDraft,
    markDraftAsSent,
    startRecording,
    stopRecording,
    cancelRecording,
    saveDraft,
  };

  return (
    <DraftContext.Provider value={value}>{children}</DraftContext.Provider>
  );
}

export function useDraft() {
  const context = useContext(DraftContext);
  if (!context) {
    throw new Error('useDraft must be used within a DraftProvider');
  }
  return context;
}
