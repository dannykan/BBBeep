/**
 * License Plate API Service
 */

import { getApiClient } from '../client';
import type { VehicleType, LicensePlateCheckResponse } from '../../types';

export const licensePlateApi = {
  checkAvailability: (plate: string) =>
    getApiClient()
      .get<LicensePlateCheckResponse>(`/users/check-license-plate/${plate}`)
      .then((res) => res.data),

  createApplication: (data: {
    licensePlate: string;
    vehicleType?: VehicleType;
    licenseImage?: string;
    email?: string;
  }) =>
    getApiClient()
      .post('/users/license-plate-application', data)
      .then((res) => res.data),

  getMyApplications: () =>
    getApiClient()
      .get('/users/license-plate-application')
      .then((res) => res.data),

  getApplication: (id: string) =>
    getApiClient()
      .get(`/users/license-plate-application/${id}`)
      .then((res) => res.data),
};
