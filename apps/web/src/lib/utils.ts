import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Tailwind CSS utility (web-specific)
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Re-export shared utilities
export {
  formatLocationDisplay,
  getTotalPoints,
  hasEnoughPoints,
  isLowPoints,
  generateInviteCode,
  maskPhone,
} from '@bbbeeep/shared';
