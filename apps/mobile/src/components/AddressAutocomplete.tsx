/**
 * AddressAutocomplete Component
 * Uses Google Places Autocomplete API to suggest addresses and landmarks
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { typography, spacing, borderRadius } from '../theme';

interface Prediction {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
  latitude?: number;
  longitude?: number;
}

interface AddressAutocompleteProps {
  value: string;
  onChangeText: (text: string, latitude?: number, longitude?: number) => void;
  placeholder?: string;
}

// Simplify Taiwan address format
function simplifyTaiwanAddress(address: string): string {
  return address
    .replace(/,\s*台灣$/, '')
    .replace(/台灣/g, '')
    .replace(/\d{3,6}/g, '')
    .replace(/^\s*,\s*/, '')
    .replace(/,\s*,/g, ',')
    .replace(/,\s*$/, '')
    .trim();
}

export default function AddressAutocomplete({
  value,
  onChangeText,
  placeholder = '輸入地址...',
}: AddressAutocompleteProps) {
  const { colors } = useTheme();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Fetch place details to get coordinates
  const fetchPlaceDetails = useCallback(async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
    if (!googleMapsApiKey) return null;

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${googleMapsApiKey}&fields=geometry&language=zh-TW`
      );
      const data = await response.json();

      if (data.result?.geometry?.location) {
        return {
          lat: data.result.geometry.location.lat,
          lng: data.result.geometry.location.lng,
        };
      }
    } catch (error) {
      console.error('Place details error:', error);
    }
    return null;
  }, [googleMapsApiKey]);

  // Fetch predictions using Places Autocomplete API (supports landmarks, POIs, addresses)
  const fetchPredictions = useCallback(async (input: string) => {
    if (!googleMapsApiKey || input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${googleMapsApiKey}&language=zh-TW&components=country:tw`
      );
      const data = await response.json();

      if (data.predictions && data.predictions.length > 0) {
        const results = data.predictions.slice(0, 5).map((prediction: any) => ({
          place_id: prediction.place_id,
          description: simplifyTaiwanAddress(prediction.description),
          main_text: prediction.structured_formatting?.main_text || prediction.description.split(',')[0],
          secondary_text: simplifyTaiwanAddress(prediction.structured_formatting?.secondary_text || ''),
        }));

        // Filter duplicates
        const uniqueResults = results.filter(
          (item: Prediction, index: number, self: Prediction[]) =>
            index === self.findIndex((t) => t.place_id === item.place_id)
        );

        setPredictions(uniqueResults);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    } catch (error) {
      console.error('Address autocomplete error:', error);
      setPredictions([]);
      setShowDropdown(false);
    } finally {
      setIsLoading(false);
    }
  }, [googleMapsApiKey]);

  const handleTextChange = useCallback((text: string) => {
    onChangeText(text, undefined, undefined);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (text.length >= 2) {
      debounceRef.current = setTimeout(() => {
        fetchPredictions(text);
      }, 400);
    } else {
      setPredictions([]);
      setShowDropdown(false);
    }
  }, [onChangeText, fetchPredictions]);

  const handleSelectPrediction = useCallback(async (prediction: Prediction) => {
    Keyboard.dismiss();
    setShowDropdown(false);
    setPredictions([]);

    // Fetch coordinates from Place Details API
    const coords = await fetchPlaceDetails(prediction.place_id);
    if (coords) {
      onChangeText(prediction.description, coords.lat, coords.lng);
    } else {
      onChangeText(prediction.description, undefined, undefined);
    }
  }, [onChangeText, fetchPlaceDetails]);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    if (predictions.length > 0) {
      setShowDropdown(true);
    }
  }, [predictions.length]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={[
            styles.input,
            {
              backgroundColor: colors.card.DEFAULT,
              borderColor: isFocused ? colors.primary.DEFAULT : colors.border,
              color: colors.foreground,
            },
          ]}
          value={value}
          onChangeText={handleTextChange}
          placeholder={placeholder}
          placeholderTextColor={colors.muted.foreground}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="done"
        />
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <ActivityIndicator size="small" color={colors.primary.DEFAULT} />
          </View>
        )}
      </View>

      {showDropdown && predictions.length > 0 && (
        <View style={[styles.dropdown, { backgroundColor: colors.card.DEFAULT, borderColor: colors.border }]}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled
            style={styles.predictionsList}
          >
            {predictions.map((item, index) => (
              <TouchableOpacity
                key={item.place_id}
                style={[
                  styles.predictionItem,
                  index < predictions.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
                onPress={() => handleSelectPrediction(item)}
                activeOpacity={0.7}
              >
                <Ionicons name="location-outline" size={16} color={colors.muted.foreground} style={styles.predictionIcon} />
                <View style={styles.predictionTextContainer}>
                  <Text style={[styles.predictionMainText, { color: colors.foreground }]} numberOfLines={1}>
                    {item.main_text}
                  </Text>
                  {item.secondary_text ? (
                    <Text style={[styles.predictionSecondaryText, { color: colors.muted.foreground }]} numberOfLines={1}>
                      {item.secondary_text}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {/* Google attribution */}
          <View style={[styles.attribution, { borderTopColor: colors.border }]}>
            <Text style={[styles.attributionText, { color: colors.muted.foreground }]}>
              powered by Google
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.fontSize.sm,
    minHeight: 48,
  },
  loadingIndicator: {
    position: 'absolute',
    right: spacing[3],
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  dropdown: {
    position: 'absolute',
    top: 52,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    maxHeight: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  predictionsList: {
    maxHeight: 240,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
  },
  predictionIcon: {
    marginRight: spacing[2],
    marginTop: 2,
  },
  predictionTextContainer: {
    flex: 1,
  },
  predictionMainText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium as any,
  },
  predictionSecondaryText: {
    fontSize: typography.fontSize.xs,
    marginTop: 2,
  },
  attribution: {
    borderTopWidth: 1,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
  },
  attributionText: {
    fontSize: typography.fontSize.xs,
    textAlign: 'right',
  },
});
