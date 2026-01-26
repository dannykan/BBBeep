/**
 * AddressAutocomplete Component
 * Uses Google Geocoding API to suggest addresses (same as web version)
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
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
  latitude: number;
  longitude: number;
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

// Extract main text from address
function extractMainText(address: string, components?: any[]): string {
  if (components && components.length > 0) {
    const route = components.find((c: any) => c.types?.includes('route'));
    if (route) return route.long_name;

    const poi = components.find((c: any) => c.types?.includes('point_of_interest'));
    if (poi) return poi.long_name;

    return components[0].long_name;
  }

  const simplified = simplifyTaiwanAddress(address);
  const parts = simplified.split(/[,，]/);
  return parts[0] || simplified;
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

  // Fetch predictions using Geocoding API (same as web version)
  const fetchPredictions = useCallback(async (input: string) => {
    if (!googleMapsApiKey || input.length < 2) {
      setPredictions([]);
      setShowDropdown(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(input)}&key=${googleMapsApiKey}&language=zh-TW&components=country:TW&region=tw`
      );
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const results = data.results.slice(0, 5).map((result: any) => ({
          place_id: result.place_id,
          description: simplifyTaiwanAddress(result.formatted_address),
          main_text: extractMainText(result.formatted_address, result.address_components),
          latitude: result.geometry?.location?.lat,
          longitude: result.geometry?.location?.lng,
        }));

        // Filter duplicates
        const uniqueResults = results.filter(
          (item: Prediction, index: number, self: Prediction[]) =>
            index === self.findIndex((t) => t.description === item.description)
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

  const handleSelectPrediction = useCallback((prediction: Prediction) => {
    Keyboard.dismiss();
    setShowDropdown(false);
    setPredictions([]);
    onChangeText(prediction.description, prediction.latitude, prediction.longitude);
  }, [onChangeText]);

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
              borderColor: isFocused ? colors.primary.DEFAULT : colors.borderSolid,
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
        <View style={[styles.dropdown, { backgroundColor: colors.card.DEFAULT, borderColor: colors.borderSolid }]}>
          <FlatList
            data={predictions}
            keyExtractor={(item) => item.place_id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item, index }) => (
              <TouchableOpacity
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
                  <Text style={[styles.predictionSecondaryText, { color: colors.muted.foreground }]} numberOfLines={1}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
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
