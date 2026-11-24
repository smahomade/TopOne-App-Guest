import { ActivityIndicator, Animated, Easing, FlatList, Image, ImageSourcePropType, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchLocations, LOCATION_CONTENT_TABLES, type LocationCard } from '@/lib/adminContent';
import { images } from '../../constants';
import { router } from 'expo-router';
import SalonLogo from '../../components/SalonLogo';

const SAVED_LOCATION_KEY = 'topone.currentLocationId';

const Location = () => {
  const insets = useSafeAreaInsets();
  const [selectedLocation, setSelectedLocation] = useState<LocationCard | null>(null);
  const [canScrollDetails, setCanScrollDetails] = useState(false);
  const [isAtDetailsBottom, setIsAtDetailsBottom] = useState(false);
  const detailsContentHeight = useRef(0);
  const detailsContainerHeight = useRef(0);
  const [currentLocationId, setCurrentLocationId] = useState<string | null>(null);
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const fallbackLocations: LocationCard[] = [
    {
      address: '31 the Quadrant, Surrey, TW9 1DN',
      addressLine1: '31 the Quadrant',
      addressLine2: null,
      country: 'United Kingdom',
      email: null,
      id: 'fallback-richmond',
      imageUrl: null,
      isDefault: true,
      name: 'Richmond Salon',
      openingHours: null,
      openingTimes: [],
      phone: null,
      postcode: 'TW9 1DN',
    },
  ];

  const {
    data: locationResult,
    loading,
    refreshing,
    refetch,
  } = useRealtimeQuery({
    fetcher: fetchLocations,
    initialData: {
      data: fallbackLocations,
      sourceTable: null,
    },
    tables: LOCATION_CONTENT_TABLES,
  });

  const locations = locationResult.sourceTable ? locationResult.data : fallbackLocations;
  const activeLocationId = useMemo(() => {
    if (currentLocationId && locations.some((location) => location.id === currentLocationId)) {
      return currentLocationId;
    }

    return locations.find((location) => location.isDefault)?.id ?? locations[0]?.id ?? null;
  }, [currentLocationId, locations]);

  useEffect(() => {
    let isActive = true;

    const loadSavedLocation = async () => {
      try {
        const savedLocationId = await AsyncStorage.getItem(SAVED_LOCATION_KEY);

        if (!isActive) {
          return;
        }

        if (savedLocationId) {
          setCurrentLocationId(savedLocationId);
        }
      } catch {
        // Ignore storage failures and fall back to default location.
      }
    };

    void loadSavedLocation();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!activeLocationId || currentLocationId) {
      return;
    }

    setCurrentLocationId(activeLocationId);
  }, [activeLocationId, currentLocationId]);

  const saveCurrentLocation = async (location: LocationCard) => {
    setCurrentLocationId(location.id);

    try {
      await AsyncStorage.setItem(SAVED_LOCATION_KEY, location.id);
    } catch {
      // Ignore storage failures and keep the in-memory selection.
    }
  };

  const handleSelectLocation = async (location: LocationCard) => {
    await saveCurrentLocation(location);
    setSelectedLocation(null);
  };

  const handleOpenLocationDetails = (location: LocationCard) => {
    detailsContentHeight.current = 0;
    detailsContainerHeight.current = 0;
    setCanScrollDetails(false);
    setIsAtDetailsBottom(false);
    setSelectedLocation(location);
  };

  const evaluateDetailsScrollable = () => {
    setCanScrollDetails(detailsContentHeight.current > detailsContainerHeight.current + 1);
  };

  const currentLocation = useMemo(
    () => locations.find((location) => location.id === activeLocationId) ?? null,
    [activeLocationId, locations]
  );

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          duration: 900,
          easing: Easing.out(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          duration: 900,
          easing: Easing.in(Easing.ease),
          toValue: 0,
          useNativeDriver: true,
        }),
      ])
    );

    pulseLoop.start();

    return () => {
      pulseLoop.stop();
    };
  }, [pulseAnimation]);

  const getLocationSource = (item: LocationCard): ImageSourcePropType => {
    if (item.imageUrl) {
      return { uri: item.imageUrl };
    }

    return images.richmondBanner;
  };

  return (
    <SafeAreaView className="flex-1 bg-cream" style={{ backgroundColor: '#F4F1EC' }}>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        className="bg-cream"
        style={{ backgroundColor: '#F4F1EC' }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#1A1817" />}
        renderItem={({ item }) => {
          const isActiveLocation = activeLocationId === item.id;
          const pulseScale = pulseAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [1, 1.8],
          });
          const pulseOpacity = pulseAnimation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.45, 0],
          });

          return (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => handleOpenLocationDetails(item)}
              className="mx-4 mb-4 overflow-hidden rounded-2xl bg-card"
              style={isActiveLocation ? styles.activeCard : styles.card}
            >
              <Image
                source={getLocationSource(item)}
                style={{ width: '100%', height: 180 }}
                resizeMode="cover"
              />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(26, 24, 23, 0.52)' }} />

              {isActiveLocation ? (
                <View style={styles.activeBadge}>
                  <View style={styles.activeIndicatorWrap}>
                    <Animated.View
                      style={[
                        styles.activePulse,
                        {
                          opacity: pulseOpacity,
                          transform: [{ scale: pulseScale }],
                        },
                      ]}
                    />
                    <View style={styles.activeDot} />
                  </View>
                  <Text style={styles.activeBadgeText}>Current location</Text>
                </View>
              ) : null}

              <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
                <Text className="font-display text-[26px] text-white">{item.name}</Text>
                <Text className="mt-2 font-pregular text-sm leading-6 text-[#E8E2DA]">{item.addressLine1}</Text>
                <Text className="font-pregular text-sm text-[#E8E2DA]">{item.postcode ?? ''}</Text>
                <Text className="mt-2 font-psemibold text-xs uppercase tracking-widest text-white underline">Tap for more details</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={() => (
          <View className="pt-4">
            <View className="flex-row items-center justify-between px-4 pb-4">
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons
                  name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
                  size={Platform.OS === 'ios' ? 30 : 26}
                  color="#1A1817"
                />
              </TouchableOpacity>
              <SalonLogo
                style={{ width: 120, height: 52 }}
                resizeMode="contain"
              />
            </View>
            <View style={{ height: 1, backgroundColor: '#E4DDD3' }} />
            <View className="px-4 pb-4 pt-5">
              <View className="mb-6">
                <Text className="font-pregular text-sm text-muted">Locations</Text>
                <Text className="mt-1 font-display text-3xl text-ink">Choose a salon</Text>
              </View>
              <Text className="mb-2 font-pregular text-sm text-muted">Pick the branch you want to visit.</Text>
              <Text className="font-pregular text-sm text-muted">
                Current location:{' '}
                <Text className="font-psemibold text-ink">{currentLocation?.name ?? 'Not selected'}</Text>
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center px-4 py-10">
            {loading ? <ActivityIndicator size="small" color="#1A1817" /> : <Text className="font-pregular text-sm text-muted">No locations have been published yet.</Text>}
          </View>
        )}
      />

      <Modal
        animationType="fade"
        transparent
        visible={selectedLocation !== null}
        onRequestClose={() => setSelectedLocation(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(26, 24, 23, 0.82)',
            justifyContent: 'center',
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 20,
          }}
        >
          <View className="overflow-hidden rounded-3xl border border-line bg-card" style={{ maxHeight: '100%' }}>
            {selectedLocation ? (
              <>
                <Image
                  source={getLocationSource(selectedLocation)}
                  style={{ width: '100%', height: 220 }}
                  resizeMode="cover"
                />
                <View style={{ flexShrink: 1 }}>
                <ScrollView
                  style={{ flexShrink: 1 }}
                  contentContainerStyle={{ padding: 20, paddingBottom: canScrollDetails ? 40 : 20 }}
                  scrollEventThrottle={16}
                  onLayout={(e) => {
                    detailsContainerHeight.current = e.nativeEvent.layout.height;
                    evaluateDetailsScrollable();
                  }}
                  onContentSizeChange={(_width, height) => {
                    detailsContentHeight.current = height;
                    evaluateDetailsScrollable();
                  }}
                  onScroll={(e) => {
                    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                    const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 16;
                    setIsAtDetailsBottom(atBottom);
                  }}
                >
                  <Text className="font-pregular text-sm text-ink">Location Details</Text>
                  <Text className="mt-2 font-display text-[28px] text-ink">{selectedLocation.name}</Text>

                  <View className="mt-5 gap-3 pb-2">
                    <View>
                      <Text className="font-psemibold text-xs text-ink">Address</Text>
                      <Text className="mt-1 font-pregular text-sm text-muted">{selectedLocation.addressLine1}</Text>
                      {selectedLocation.addressLine2 ? <Text className="mt-1 font-pregular text-sm text-muted">{selectedLocation.addressLine2}</Text> : null}
                      {selectedLocation.postcode ? <Text className="mt-1 font-pregular text-sm text-muted">{selectedLocation.postcode}</Text> : null}
                      {selectedLocation.country ? <Text className="mt-1 font-pregular text-sm text-muted">{selectedLocation.country}</Text> : null}
                    </View>

                    {selectedLocation.phone ? (
                      <View>
                        <Text className="font-psemibold text-xs text-ink">Phone</Text>
                        <Text className="mt-1 font-pregular text-sm text-muted">{selectedLocation.phone}</Text>
                      </View>
                    ) : null}

                    {selectedLocation.email ? (
                      <View>
                        <Text className="font-psemibold text-xs text-ink">Email</Text>
                        <Text className="mt-1 font-pregular text-sm text-muted">{selectedLocation.email}</Text>
                      </View>
                    ) : null}

                    {selectedLocation.openingHours ? (
                      <View>
                        <Text className="font-psemibold text-xs text-ink">Opening Hours</Text>
                        <Text className="mt-1 font-pregular text-sm leading-6 text-muted">{selectedLocation.openingHours}</Text>
                      </View>
                    ) : null}
                  </View>
                </ScrollView>

                {canScrollDetails && !isAtDetailsBottom ? (
                  <View
                    pointerEvents="none"
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      alignItems: 'center',
                      paddingBottom: 6,
                    }}
                  >
                    <View
                      style={{
                        backgroundColor: '#1A1817',
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: '#F4F1EC', fontSize: 11, fontFamily: 'DMSans-SemiBold' }}>
                        Scroll for more ⌄
                      </Text>
                    </View>
                  </View>
                ) : null}
                </View>

                <View className="border-t border-line/60 px-5 py-4">
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => setSelectedLocation(null)}
                      className={`${selectedLocation.id === activeLocationId ? 'flex-1 bg-ink' : 'flex-1 border border-line bg-cream'} items-center rounded-2xl px-4 py-4`}
                    >
                      <Text className={`font-psemibold text-sm ${selectedLocation.id === activeLocationId ? 'text-cream' : 'text-ink'}`}>Close</Text>
                    </Pressable>

                    {selectedLocation.id !== activeLocationId ? (
                      <Pressable
                        onPress={() => void handleSelectLocation(selectedLocation)}
                        className="flex-1 items-center rounded-2xl bg-ink px-4 py-4"
                      >
                        <Text className="font-psemibold text-sm text-cream">Select Location</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  activeBadge: {
    alignItems: 'center',
    backgroundColor: 'rgba(244, 241, 236, 0.94)',
    borderColor: '#1A1817',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    position: 'absolute',
    right: 16,
    top: 16,
  },
  activeBadgeText: {
    color: '#1A1817',
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
  },
  activeCard: {
    borderColor: '#1A1817',
    borderWidth: 1.5,
    shadowColor: '#1A1817',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  activeDot: {
    backgroundColor: '#1A1817',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  activeIndicatorWrap: {
    alignItems: 'center',
    height: 12,
    justifyContent: 'center',
    marginRight: 8,
    width: 12,
  },
  activePulse: {
    backgroundColor: '#1A1817',
    borderRadius: 999,
    height: 12,
    position: 'absolute',
    width: 12,
  },
  card: {
    borderColor: '#E4DDD3',
    borderWidth: 1,
  },
});

export default Location;
