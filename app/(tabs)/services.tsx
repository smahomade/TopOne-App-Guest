import { ActivityIndicator, Image, Modal, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';

import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import {
  fetchServices,
  SERVICES_CONTENT_TABLES,
  type GroupedService,
} from '@/lib/adminContent';
import { images } from '../../constants';
import { SafeAreaView } from 'react-native-safe-area-context';

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const nextValue = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;

    return nextValue.toString(16);
  });
}

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedService, setSelectedService] = useState<GroupedService | null>(null);
  const [showRolesModal, setShowRolesModal] = useState<boolean>(false);
  const [bookingSelections, setBookingSelections] = useState<
    Array<{
      id: string;
      price: number;
      role: string;
      service: string;
      serviceCategory: string;
    }>
  >([]);
  const {
    data: servicesResult,
    loading,
    refreshing,
    refetch,
  } = useRealtimeQuery({
    fetcher: fetchServices,
    initialData: {
      data: {},
      sourceTable: null,
    },
    tables: SERVICES_CONTENT_TABLES,
  });

  const servicesData = servicesResult.data;
  const categoryNames = useMemo(() => Object.keys(servicesData), [servicesData]);
  const selectedServices = selectedCategory ? servicesData[selectedCategory] ?? [] : [];

  useEffect(() => {
    if (!selectedCategory && categoryNames.length > 0) {
      setSelectedCategory(categoryNames[0]);
      return;
    }

    if (selectedCategory && !categoryNames.includes(selectedCategory)) {
      setSelectedCategory(categoryNames[0] ?? '');
    }
  }, [categoryNames, selectedCategory]);

  const handleBook = (group: GroupedService) => {
    setSelectedService(group);
    setShowRolesModal(true); // Show modal to display roles
  };

  const handleAddSelection = (role: string, price: number) => {
    if (!selectedService) {
      return;
    }

    setBookingSelections((currentSelections) => [
      ...currentSelections,
      {
        id: `${selectedService.serviceCategory}-${selectedService.service}-${role}-${Date.now()}-${currentSelections.length}`,
        price,
        role,
        service: selectedService.service,
        serviceCategory: selectedService.serviceCategory,
      },
    ]);
    setShowRolesModal(false);
    setSelectedService(null);
  };

  const handleRemoveSelection = (selectionId: string) => {
    setBookingSelections((currentSelections) => currentSelections.filter((selection) => selection.id !== selectionId));
  };

  const handleBookSelections = () => {
    if (bookingSelections.length === 0) {
      return;
    }

    const conversationId = generateUuid();

    router.push({
      pathname: '/book',
      params: {
        bookingKey: conversationId,
        bookingServices: JSON.stringify(
          bookingSelections.map((selection) => ({
            price: selection.price,
            role: selection.role,
            service: selection.service,
            serviceCategory: selection.serviceCategory,
          }))
        ),
      },
    });
    setBookingSelections([]);
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-primary">
        <ActivityIndicator size="small" color="#8ED1FC" />
        <Text className="mt-3 font-pregular text-sm text-gray-100">Loading services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
      <ScrollView
        className="bg-primary"
        style={{ backgroundColor: '#161622' }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#8ED1FC" />}
      >
        <View className="px-4 pb-4 pt-4">
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="font-pregular text-sm text-gray-100">Service Menu</Text>
              <Text className="mt-1 font-psemibold text-2xl text-white">TopOne Salon</Text>
            </View>
            <Image 
              source={images.logoTopOneWhite} 
              style={{ width: 120, height: 52 }}
              resizeMode="contain"
            />
          </View>

          <Text className="mb-2 font-pregular text-sm text-gray-100">Choose a category below to browse services.</Text>

          <View className="mb-6 flex-row flex-wrap gap-3">
            {categoryNames.map((category) => {
              const isSelected = selectedCategory === category;

              return (
                <TouchableOpacity
                  key={category}
                  activeOpacity={0.82}
                  className={`rounded-full border px-4 py-3 ${isSelected ? 'border-secondary bg-secondary' : 'border-black-200 bg-black-100'}`}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text className={`font-psemibold text-sm ${isSelected ? 'text-primary' : 'text-white'}`}>
                    {category}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text className="mb-4 font-psemibold text-xl text-white">Available Services</Text>
        </View>

        <View className="px-4">
          {selectedServices.map((group, index) => (
            <View key={`${group.serviceCategory}-${group.service}-${index}`} className="mb-4 rounded-2xl border border-black-200 bg-black-100 px-5 py-5">
              <View className="flex-row items-start justify-between gap-4">
                <View className="flex-1">
                  <Text className="font-pbold text-base text-white">{group.serviceCategory}</Text>
                  <Text className="mt-1 font-pregular text-base text-gray-100">{group.service}</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.82}
                  className="rounded-xl bg-secondary px-4 py-3"
                  onPress={() => handleBook(group)}
                >
                  <Text className="font-psemibold text-sm text-primary">Add</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>

        {bookingSelections.length > 0 ? (
          <View className="mx-4 mt-2 rounded-2xl border border-black-200 bg-black-100 px-5 py-5">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="font-psemibold text-lg text-white">Booking List</Text>
                <Text className="mt-1 font-pregular text-sm text-gray-100">These services will be sent to Messages as a new booking request.</Text>
              </View>
              <Text className="font-psemibold text-secondary">{bookingSelections.length} selected</Text>
            </View>

            <View className="mt-4 gap-3">
              {bookingSelections.map((selection) => (
                <View key={selection.id} className="rounded-xl border border-white/10 bg-primary px-4 py-4">
                  <View className="flex-row items-start justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-psemibold text-sm text-white">{selection.service}</Text>
                      <Text className="mt-1 font-pregular text-xs text-gray-100">
                        {selection.serviceCategory} · {selection.role} · £{selection.price}
                      </Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.82}
                      className="rounded-lg border border-white/10 px-3 py-2"
                      onPress={() => handleRemoveSelection(selection.id)}
                    >
                      <Text className="font-psemibold text-xs text-gray-100">Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.82}
              className="mt-5 items-center rounded-xl bg-secondary px-4 py-4"
              onPress={handleBookSelections}
            >
              <Text className="font-psemibold text-sm text-primary">Book Selected Services</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {categoryNames.length === 0 ? (
          <View className="items-center px-4 py-10">
            <Text className="font-pregular text-sm text-gray-100">No services have been published from the admin app yet.</Text>
          </View>
        ) : null}

        <Modal
          visible={showRolesModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRolesModal(false)}
        >
          <View className="flex-1 items-center justify-center bg-black/70 px-5">
            <View className="w-full rounded-2xl border border-black-200 bg-black-100 p-6">
              <Text className="mb-1 font-psemibold text-xl text-white">Select a Role</Text>
              <Text className="font-pregular text-sm text-gray-100">{selectedService?.service}</Text>
              <Text className="mb-5 mt-1 font-pregular text-sm text-secondary">{selectedService?.serviceCategory}</Text>
              
              {selectedService?.roles.map((roleItem, index) => (
                <View key={index} className="mb-3 rounded-xl border border-white/10 bg-primary px-4 py-4">
                  <View className="flex-row items-center justify-between gap-3">
                    <View className="flex-1">
                      <Text className="font-psemibold text-base text-white">{roleItem.role}</Text>
                      <Text className="mt-1 font-pregular text-sm text-gray-100">£{roleItem.price}</Text>
                    </View>

                    <TouchableOpacity
                      activeOpacity={0.82}
                      className="rounded-xl bg-secondary px-4 py-3"
                      onPress={() => handleAddSelection(roleItem.role, roleItem.price)}
                    >
                      <Text className="font-psemibold text-sm text-primary">Add</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}

              <TouchableOpacity
                activeOpacity={0.82}
                className="mt-2 items-center rounded-xl border border-white/10 px-4 py-3"
                onPress={() => setShowRolesModal(false)}
              >
                <Text className="font-psemibold text-sm text-gray-100">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Services;