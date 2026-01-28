/**
 * Saved Plates API Service
 */

import { getApiClient } from '../client';

export type VehicleType = 'car' | 'scooter';

export interface SavedPlate {
  id: string;
  licensePlate: string;
  nickname: string;
  vehicleType: VehicleType;
  createdAt: string;
}

export interface RecentSentPlate {
  licensePlate: string;
  vehicleType: VehicleType;
  lastSentAt: string;
}

export interface CheckSavedPlateResponse {
  isSaved: boolean;
  savedPlate?: SavedPlate;
}

export interface CreateSavedPlateRequest {
  licensePlate: string;
  nickname: string;
  vehicleType?: VehicleType;
}

export interface UpdateSavedPlateRequest {
  nickname?: string;
  vehicleType?: VehicleType;
}

export const savedPlatesApi = {
  create: (data: CreateSavedPlateRequest) =>
    getApiClient()
      .post<SavedPlate>('/saved-plates', data)
      .then((res) => res.data),

  getAll: () =>
    getApiClient()
      .get<SavedPlate[]>('/saved-plates')
      .then((res) => res.data),

  getRecentSent: (limit: number = 5) =>
    getApiClient()
      .get<RecentSentPlate[]>('/saved-plates/recent-sent', { params: { limit } })
      .then((res) => res.data),

  checkIfSaved: (licensePlate: string) =>
    getApiClient()
      .get<CheckSavedPlateResponse>(`/saved-plates/check/${encodeURIComponent(licensePlate)}`)
      .then((res) => res.data),

  update: (id: string, data: UpdateSavedPlateRequest) =>
    getApiClient()
      .patch<SavedPlate>(`/saved-plates/${id}`, data)
      .then((res) => res.data),

  delete: (id: string) =>
    getApiClient()
      .delete<{ success: boolean }>(`/saved-plates/${id}`)
      .then((res) => res.data),
};
