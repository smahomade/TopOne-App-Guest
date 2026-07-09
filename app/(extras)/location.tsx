import { ActivityIndicator, Animated, Easing, FlatList, Image, ImageSourcePropType, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchLocations, LOCATION_CONTENT_TABLES, type LocationCard } from '@/lib/adminContent';
import { images } from '../../constants';
import { router } from 'expo-router';

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
    <SafeAreaView className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
      <FlatList
        data={locations}
        keyExtractor={(item) => item.id}
        className="bg-primary"
        style={{ backgroundColor: '#161622' }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#8ED1FC" />}
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
              className="mx-4 mb-4 overflow-hidden rounded-2xl bg-black-100"
              style={isActiveLocation ? styles.activeCard : styles.card}
            >
              <Image
                source={getLocationSource(item)}
                style={{ width: '100%', height: 180 }}
                resizeMode="cover"
              />
              <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8, 11, 20, 0.52)' }} />

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
                <Text className="font-psemibold text-[24px] text-white">{item.name}</Text>
                <Text className="mt-2 font-pregular text-sm leading-6 text-gray-100">{item.addressLine1}</Text>
                <Text className="font-pregular text-sm text-gray-100">{item.postcode ?? ''}</Text>
                <Text className="mt-2 font-psemibold text-xs text-secondary">Tap for more details</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListHeaderComponent={() => (
          <View className="px-4 pb-4 pt-4">
            <View className="mb-5 flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 38, height: 38, borderRadius: 999, backgroundColor: '#1E1E2D', borderWidth: 1, borderColor: '#232533', alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#8ED1FC', fontSize: 22, lineHeight: 26, marginLeft: -2 }}>‹</Text>
              </TouchableOpacity>
              <Image
                source={images.logoTopOneWhite}
                style={{ width: 120, height: 52 }}
                resizeMode="contain"
              />
            </View>
            <View className="mb-5">
              <Text className="font-pregular text-sm text-gray-100">Locations</Text>
              <Text className="mt-1 font-psemibold text-2xl text-white">Choose a salon</Text>
            </View>
            <Text className="mb-2 font-pregular text-sm text-gray-100">Pick the branch you want to visit.</Text>
            <Text className="font-pregular text-sm text-gray-100">
              Current location:{' '}
              <Text className="font-psemibold text-secondary">{currentLocation?.name ?? 'Not selected'}</Text>
            </Text>
            <Text className="mb-4 mt-2 font-psemibold text-xs text-secondary">The highlighted card shows the saved current location.</Text>
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center px-4 py-10">
            {loading ? <ActivityIndicator size="small" color="#8ED1FC" /> : <Text className="font-pregular text-sm text-gray-100">No locations have been published yet.</Text>}
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
            backgroundColor: 'rgba(7, 11, 19, 0.82)',
            justifyContent: 'center',
            paddingTop: insets.top + 20,
            paddingBottom: insets.bottom + 20,
            paddingHorizontal: 20,
          }}
        >
          <View className="overflow-hidden rounded-3xl border border-black-200 bg-black-100" style={{ maxHeight: '100%' }}>
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
                  <Text className="font-pregular text-sm text-secondary">Location Details</Text>
                  <Text className="mt-2 font-pbold text-2xl text-white">{selectedLocation.name}</Text>

                  <View className="mt-5 gap-3 pb-2">
                    <View>
                      <Text className="font-psemibold text-xs text-secondary">Address</Text>
                      <Text className="mt-1 font-pregular text-sm text-gray-100">{selectedLocation.addressLine1}</Text>
                      {selectedLocation.addressLine2 ? <Text className="mt-1 font-pregular text-sm text-gray-100">{selectedLocation.addressLine2}</Text> : null}
                      {selectedLocation.postcode ? <Text className="mt-1 font-pregular text-sm text-gray-100">{selectedLocation.postcode}</Text> : null}
                      {selectedLocation.country ? <Text className="mt-1 font-pregular text-sm text-gray-100">{selectedLocation.country}</Text> : null}
                    </View>

                    {selectedLocation.phone ? (
                      <View>
                        <Text className="font-psemibold text-xs text-secondary">Phone</Text>
                        <Text className="mt-1 font-pregular text-sm text-gray-100">{selectedLocation.phone}</Text>
                      </View>
                    ) : null}

                    {selectedLocation.email ? (
                      <View>
                        <Text className="font-psemibold text-xs text-secondary">Email</Text>
                        <Text className="mt-1 font-pregular text-sm text-gray-100">{selectedLocation.email}</Text>
                      </View>
                    ) : null}

                    {selectedLocation.openingHours ? (
                      <View>
                        <Text className="font-psemibold text-xs text-secondary">Opening Hours</Text>
                        <Text className="mt-1 font-pregular text-sm leading-6 text-gray-100">{selectedLocation.openingHours}</Text>
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
                        backgroundColor: 'rgba(12, 18, 28, 0.97)',
                        borderRadius: 999,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ color: '#8ED1FC', fontSize: 11, fontFamily: 'Poppins-SemiBold' }}>
                        Scroll for more ⌄
                      </Text>
                    </View>
                  </View>
                ) : null}
                </View>

                <View className="border-t border-black-200/60 px-5 py-4">
                  <View className="flex-row gap-3">
                    <Pressable
                      onPress={() => setSelectedLocation(null)}
                      className={`${selectedLocation.id === activeLocationId ? 'flex-1 bg-secondary' : 'flex-1 border border-black-200 bg-primary'} items-center rounded-2xl px-4 py-4`}
                    >
                      <Text className={`font-psemibold text-sm ${selectedLocation.id === activeLocationId ? 'text-primary' : 'text-white'}`}>Close</Text>
                    </Pressable>

                    {selectedLocation.id !== activeLocationId ? (
                      <Pressable
                        onPress={() => void handleSelectLocation(selectedLocation)}
                        className="flex-1 items-center rounded-2xl bg-secondary px-4 py-4"
                      >
                        <Text className="font-psemibold text-sm text-primary">Select Location</Text>
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
    backgroundColor: 'rgba(12, 18, 28, 0.86)',
    borderColor: '#8ED1FC',
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
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 11,
  },
  activeCard: {
    borderColor: '#8ED1FC',
    borderWidth: 1.5,
    shadowColor: '#8ED1FC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
  },
  activeDot: {
    backgroundColor: '#8ED1FC',
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
    backgroundColor: '#8ED1FC',
    borderRadius: 999,
    height: 12,
    position: 'absolute',
    width: 12,
  },
  card: {
    borderColor: '#232533',
    borderWidth: 1,
  },
});

export default Location;
