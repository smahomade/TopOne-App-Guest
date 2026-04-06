import { ActivityIndicator, FlatList, Image, ImageSourcePropType, Modal, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';

import { SafeAreaView } from 'react-native-safe-area-context';
import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchLocations, LOCATION_CONTENT_TABLES, type LocationCard } from '@/lib/adminContent';
import { images } from '../../constants';

const Location = () => {
  const [selectedLocation, setSelectedLocation] = useState<LocationCard | null>(null);
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
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedLocation(item)}
            className="mx-4 mb-4 overflow-hidden rounded-2xl border border-black-200 bg-black-100"
          >
            <Image
              source={getLocationSource(item)}
              style={{ width: '100%', height: 180 }}
              resizeMode="cover"
            />
            <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8, 11, 20, 0.52)' }} />
            <View style={{ position: 'absolute', left: 20, right: 20, bottom: 20 }}>
              <Text className="font-psemibold text-[24px] text-white">{item.name}</Text>
              <Text className="mt-2 font-pregular text-sm leading-6 text-gray-100">{item.addressLine1}</Text>
              <Text className="font-pregular text-sm text-gray-100">{item.postcode ?? ''}</Text>
              <Text className="mt-2 font-psemibold text-xs text-secondary">Tap for more details</Text>
            </View>
          </TouchableOpacity>
        )}
        ListHeaderComponent={() => (
          <View className="px-4 pb-4 pt-4">
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="font-pregular text-sm text-gray-100">Locations</Text>
                <Text className="mt-1 font-psemibold text-2xl text-white">Choose a salon</Text>
              </View>
              <Image 
                source={images.logoTopOneWhite}
                style={{ width: 120, height: 52 }}
                resizeMode="contain"
              />
            </View>
            <Text className="mb-4 font-pregular text-sm text-gray-100">Pick the branch you want to visit.</Text>
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
        <View style={{ flex: 1, backgroundColor: 'rgba(7, 11, 19, 0.82)', justifyContent: 'center', padding: 20 }}>
          <View className="overflow-hidden rounded-3xl border border-black-200 bg-black-100">
            {selectedLocation ? (
              <>
                <Image
                  source={getLocationSource(selectedLocation)}
                  style={{ width: '100%', height: 220 }}
                  resizeMode="cover"
                />
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
                  <Text className="font-pregular text-sm text-secondary">Location Details</Text>
                  <Text className="mt-2 font-pbold text-2xl text-white">{selectedLocation.name}</Text>

                  <View className="mt-5 gap-3">
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

                  <Pressable
                    onPress={() => setSelectedLocation(null)}
                    className="mt-6 items-center rounded-2xl bg-secondary px-4 py-4"
                  >
                    <Text className="font-psemibold text-sm text-primary">Close</Text>
                  </Pressable>
                </ScrollView>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default Location;
