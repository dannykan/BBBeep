/**
 * Onboarding Context
 * 用於在 Onboarding 各步驟之間共享狀態
 */

import React, { createContext, useContext, useState, useCallback } from 'react';
import type {
  UserType,
  VehicleType,
  ValidateCodeResponse,
  LicensePlateCheckResponse,
} from '@bbbeeep/shared';

interface OnboardingState {
  // Step 1: User Type
  userType: UserType | null;
  vehicleType: VehicleType | null;

  // Step 2: License Plate
  licensePlate: string;
  licensePlateCheckResult: LicensePlateCheckResponse | null;

  // Step 3: Nickname
  nickname: string;

  // Step 5: Invite Code
  inviteCode: string;
  inviteCodeValidation: ValidateCodeResponse | null;
  inviteCodeApplied: boolean;

  // Loading states
  isLoading: boolean;
  isValidatingCode: boolean;
}

interface OnboardingContextType extends OnboardingState {
  // Setters
  setUserType: (type: UserType | null) => void;
  setVehicleType: (type: VehicleType | null) => void;
  setLicensePlate: (plate: string) => void;
  setLicensePlateCheckResult: (result: LicensePlateCheckResponse | null) => void;
  setNickname: (name: string) => void;
  setInviteCode: (code: string) => void;
  setInviteCodeValidation: (result: ValidateCodeResponse | null) => void;
  setInviteCodeApplied: (applied: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setIsValidatingCode: (validating: boolean) => void;

  // Helper methods
  resetOnboarding: () => void;
  getTotalSteps: () => number;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

const initialState: OnboardingState = {
  userType: null,
  vehicleType: null,
  licensePlate: '',
  licensePlateCheckResult: null,
  nickname: '',
  inviteCode: '',
  inviteCodeValidation: null,
  inviteCodeApplied: false,
  isLoading: false,
  isValidatingCode: false,
};

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState);

  const setUserType = useCallback((type: UserType | null) => {
    setState((prev) => ({ ...prev, userType: type }));
  }, []);

  const setVehicleType = useCallback((type: VehicleType | null) => {
    setState((prev) => ({ ...prev, vehicleType: type }));
  }, []);

  const setLicensePlate = useCallback((plate: string) => {
    setState((prev) => ({ ...prev, licensePlate: plate }));
  }, []);

  const setLicensePlateCheckResult = useCallback(
    (result: LicensePlateCheckResponse | null) => {
      setState((prev) => ({ ...prev, licensePlateCheckResult: result }));
    },
    []
  );

  const setNickname = useCallback((name: string) => {
    setState((prev) => ({ ...prev, nickname: name }));
  }, []);

  const setInviteCode = useCallback((code: string) => {
    setState((prev) => ({ ...prev, inviteCode: code }));
  }, []);

  const setInviteCodeValidation = useCallback(
    (result: ValidateCodeResponse | null) => {
      setState((prev) => ({ ...prev, inviteCodeValidation: result }));
    },
    []
  );

  const setInviteCodeApplied = useCallback((applied: boolean) => {
    setState((prev) => ({ ...prev, inviteCodeApplied: applied }));
  }, []);

  const setIsLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, isLoading: loading }));
  }, []);

  const setIsValidatingCode = useCallback((validating: boolean) => {
    setState((prev) => ({ ...prev, isValidatingCode: validating }));
  }, []);

  const resetOnboarding = useCallback(() => {
    setState(initialState);
  }, []);

  const getTotalSteps = useCallback(() => {
    return state.userType === 'pedestrian' ? 5 : 6;
  }, [state.userType]);

  const value: OnboardingContextType = {
    ...state,
    setUserType,
    setVehicleType,
    setLicensePlate,
    setLicensePlateCheckResult,
    setNickname,
    setInviteCode,
    setInviteCodeValidation,
    setInviteCodeApplied,
    setIsLoading,
    setIsValidatingCode,
    resetOnboarding,
    getTotalSteps,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}
