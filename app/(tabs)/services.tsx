import { ActivityIndicator, Image, Modal, RefreshControl, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import {
  fetchLocations,
  fetchServices,
  LOCATION_CONTENT_TABLES,
  SERVICES_CONTENT_TABLES,
  type GroupedService,
} from '@/lib/adminContent';
import { images } from '../../constants';
import { SafeAreaView } from 'react-native-safe-area-context';

const SAVED_LOCATION_KEY = 'topone.currentLocationId';

function generateUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const randomValue = Math.floor(Math.random() * 16);
    const nextValue = character === 'x' ? randomValue : (randomValue & 0x3) | 0x8;

    return nextValue.toString(16);
  });
}

const MAX_BOOKING_DATES = 3;

function getMonthStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, months: number) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function formatDateValue(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDateLabel(value: string) {
  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString([], {
    day: 'numeric',
    month: 'short',
    weekday: 'short',
  });
}

function buildCalendarDays(month: Date) {
  const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDayOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const leadingEmptyDays = (firstDayOfMonth.getDay() + 6) % 7;
  const days = [] as Array<{ dateValue: string; dayNumber: number; isCurrentMonth: boolean } | null>;

  for (let index = 0; index < leadingEmptyDays; index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDayOfMonth.getDate(); day += 1) {
    const currentDate = new Date(month.getFullYear(), month.getMonth(), day);

    days.push({
      dateValue: formatDateValue(currentDate),
      dayNumber: day,
      isCurrentMonth: true,
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function formatServiceDuration(duration: number | null) {
  if (duration === null || !Number.isFinite(duration) || duration <= 0) {
    return null;
  }

  const roundedDuration = Math.round(duration);
  const hours = Math.floor(roundedDuration / 60);
  const minutes = roundedDuration % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours} hr ${minutes} min`;
  }

  if (hours > 0) {
    return hours === 1 ? '1 hr' : `${hours} hrs`;
  }

  return `${minutes} min`;
}

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedService, setSelectedService] = useState<GroupedService | null>(null);
  const [showRolesModal, setShowRolesModal] = useState<boolean>(false);
  const [showDateModal, setShowDateModal] = useState<boolean>(false);
  const [selectedBookingDates, setSelectedBookingDates] = useState<string[]>([]);
  const [preferredTime, setPreferredTime] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState<Date>(getMonthStart(new Date()));
  const [savedLocationId, setSavedLocationId] = useState<string | null>(null);
  const [hasResolvedSavedLocation, setHasResolvedSavedLocation] = useState<boolean>(false);
  const [bookingSelections, setBookingSelections] = useState<
    Array<{
      id: string;
      price: number;
      role: string;
      service: string;
      serviceCategory: string;
    }>
  >([]);
  const { data: locationResult } = useRealtimeQuery({
    fetcher: fetchLocations,
    initialData: {
      data: [],
      sourceTable: null,
    },
    tables: LOCATION_CONTENT_TABLES,
  });

  const locations = locationResult.data;
  const activeLocation = useMemo(() => {
    if (savedLocationId) {
      const matchedLocation = locations.find((location) => location.id === savedLocationId);

      if (matchedLocation) {
        return matchedLocation;
      }
    }

    return locations.find((location) => location.isDefault) ?? locations[0] ?? null;
  }, [locations, savedLocationId]);
  const activeLocationId = activeLocation?.id ?? null;

  useEffect(() => {
    if (!hasResolvedSavedLocation) {
      return;
    }

    if (locationResult.sourceTable === null) {
      return;
    }

    if (activeLocationId && activeLocationId !== savedLocationId) {
      setSavedLocationId(activeLocationId);
      void AsyncStorage.setItem(SAVED_LOCATION_KEY, activeLocationId);
      return;
    }

    if (!activeLocationId && savedLocationId) {
      setSavedLocationId(null);
      void AsyncStorage.removeItem(SAVED_LOCATION_KEY);
    }
  }, [activeLocationId, hasResolvedSavedLocation, locationResult.sourceTable, savedLocationId]);

  const fetchBranchServices = useCallback(() => fetchServices(activeLocationId), [activeLocationId]);
  const {
    data: servicesResult,
    loading,
    refreshing,
    refetch,
  } = useRealtimeQuery({
    fetcher: fetchBranchServices,
    initialData: {
      data: {},
      sourceTable: null,
    },
    enabled: locations.length > 0 && hasResolvedSavedLocation,
    reloadKey: activeLocationId ?? 'no-location',
    tables: SERVICES_CONTENT_TABLES,
  });

  const servicesData = servicesResult.data;
  const categoryNames = useMemo(() => Object.keys(servicesData), [servicesData]);
  const selectedServices = selectedCategory ? servicesData[selectedCategory] ?? [] : [];
  const calendarDays = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth]);
  const todayValue = formatDateValue(new Date());
  const isServicesLoading = !hasResolvedSavedLocation || (locationResult.sourceTable === null && locations.length === 0) || loading;
  const closedWeekdays = useMemo(
    () => new Set((activeLocation?.openingTimes ?? []).filter((entry) => entry.isClosed).map((entry) => entry.dayOfWeek)),
    [activeLocation]
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const loadSavedLocation = async () => {
        try {
          const nextLocationId = await AsyncStorage.getItem(SAVED_LOCATION_KEY);

          if (isActive) {
            setSavedLocationId(nextLocationId);
          }
        } catch {
          if (isActive) {
            setSavedLocationId(null);
          }
        } finally {
          if (isActive) {
            setHasResolvedSavedLocation(true);
          }
        }
      };

      void loadSavedLocation();

      return () => {
        isActive = false;
      };
    }, [])
  );

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

    setSelectedBookingDates([]);
    setPreferredTime(null);
    setVisibleMonth(getMonthStart(new Date()));
    setShowDateModal(true);
  };

  const handleToggleBookingDate = (dateValue: string) => {
    setSelectedBookingDates((currentDates) => {
      if (currentDates.includes(dateValue)) {
        return currentDates.filter((value) => value !== dateValue);
      }

      if (currentDates.length >= MAX_BOOKING_DATES) {
        return currentDates;
      }

      return [...currentDates, dateValue].sort();
    });
  };

  const handleConfirmBookingDates = () => {
    if (selectedBookingDates.length === 0) {
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
        bookingDates: JSON.stringify(
          selectedBookingDates.map((date) => preferredTime ? `${date} ${preferredTime}` : date)
        ),
      },
    });
    setShowDateModal(false);
    setBookingSelections([]);
    setSelectedBookingDates([]);
    setPreferredTime(null);
  };

  if (isServicesLoading) {
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

          {activeLocation ? (
            <Text className="mb-4 font-pregular text-sm text-gray-100">
              Showing services for{' '}
              <Text className="font-psemibold text-secondary">{activeLocation.name}</Text>
            </Text>
          ) : null}

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
                  <Text className="font-pbold text-base text-white">{group.service}</Text>
                  {formatServiceDuration(group.duration) ? (
                    <Text className="mt-1 font-pregular text-sm text-gray-100">{formatServiceDuration(group.duration)}</Text>
                  ) : null}
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
            <Text className="font-pregular text-sm text-gray-100">
              {activeLocation
                ? `No services are available for ${activeLocation.name} right now.`
                : 'No services have been published from the admin app yet.'}
            </Text>
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
              <Text className="mt-1 font-pregular text-sm text-secondary">{selectedService?.serviceCategory}</Text>
              {selectedService && formatServiceDuration(selectedService.duration) ? (
                <Text className="mb-5 mt-1 font-pregular text-sm text-gray-100">
                  Duration: {formatServiceDuration(selectedService.duration)}
                </Text>
              ) : (
                <View className="mb-5" />
              )}
              
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

        <Modal
          visible={showDateModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowDateModal(false)}
        >
          <View className="flex-1 items-center justify-center bg-black/70 px-5">
            <View className="w-full rounded-2xl border border-black-200 bg-black-100" style={{ maxHeight: '90%' }}>
              <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text className="font-psemibold text-base text-white">Choose preferred dates</Text>
                  <Text className="font-pregular text-xs text-gray-100">
                    Up to {MAX_BOOKING_DATES} dates{activeLocation ? ` · ${activeLocation.name}` : ''}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setShowDateModal(false)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={{ width: 36, height: 36, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Text style={{ color: '#ffffff', fontSize: 18, lineHeight: 22, fontWeight: 'bold' }}>×</Text>
                </TouchableOpacity>
              </View>

              <View className="mt-3 flex-row items-center justify-between">
                <TouchableOpacity
                  activeOpacity={0.82}
                  className="rounded-lg border border-white/10 px-3 py-1.5"
                  onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, -1))}
                >
                  <Text className="font-psemibold text-xs text-gray-100">‹</Text>
                </TouchableOpacity>

                <Text className="font-psemibold text-sm text-white">
                  {visibleMonth.toLocaleDateString([], { month: 'long', year: 'numeric' })}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.82}
                  className="rounded-lg border border-white/10 px-3 py-1.5"
                  onPress={() => setVisibleMonth((currentMonth) => addMonths(currentMonth, 1))}
                >
                  <Text className="font-psemibold text-xs text-gray-100">›</Text>
                </TouchableOpacity>
              </View>

              <View className="mt-2 flex-row justify-between">
                {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
                  <Text key={day} className="text-center font-psemibold text-[10px] text-gray-100" style={{ width: '14.28%' }}>
                    {day}
                  </Text>
                ))}
              </View>

              <View className="mt-1 flex-row flex-wrap gap-y-1">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <View key={`empty-${index}`} style={{ width: '14.28%', height: 34 }} />;
                  }

                  const isSelected = selectedBookingDates.includes(day.dateValue);
                  const isPastDate = day.dateValue < todayValue;
                  const dayOfWeek = (new Date(`${day.dateValue}T00:00:00`).getDay() + 6) % 7;
                  const isClosedForLocation = closedWeekdays.has(dayOfWeek);
                  const isUnavailable = isPastDate || isClosedForLocation;

                  return (
                    <View key={day.dateValue} style={{ width: '14.28%', alignItems: 'center' }}>
                      <TouchableOpacity
                        activeOpacity={0.82}
                        disabled={isUnavailable}
                        style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', borderRadius: 999, backgroundColor: isSelected ? '#8ED1FC' : 'transparent', opacity: isUnavailable ? 0.3 : 1 }}
                        onPress={() => {
                          if (!isUnavailable && !selectedBookingDates.includes(day.dateValue) && selectedBookingDates.length >= MAX_BOOKING_DATES) {
                            return;
                          }
                          handleToggleBookingDate(day.dateValue);
                        }}
                      >
                        <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 12, color: isSelected ? '#161622' : '#ffffff' }}>
                          {day.dayNumber}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              {selectedBookingDates.length > 0 ? (
                <View className="mt-3 flex-row items-center gap-3">
                  <View style={{ flex: 1 }}>
                    <Text className="font-psemibold text-xs text-gray-100 mb-1">Selected</Text>
                    {selectedBookingDates.map((dateValue) => (
                      <Text key={dateValue} className="font-pregular text-xs text-white">{formatDateLabel(dateValue)}</Text>
                    ))}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text className="font-psemibold text-xs text-gray-100 mb-1">Time (optional)</Text>
                    <TextInput
                      value={preferredTime ?? ''}
                      onChangeText={(value) => setPreferredTime(value || null)}
                      placeholder="e.g. 2:30 PM"
                      placeholderTextColor="#7b7b8b"
                      style={{ color: '#ffffff', fontFamily: 'Poppins-Regular', fontSize: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 }}
                    />
                  </View>
                </View>
              ) : (
                <Text className="mt-3 font-pregular text-xs text-gray-100">Tap a date to select it.</Text>
              )}

              <TouchableOpacity
                activeOpacity={0.82}
                style={{ marginTop: 14, alignItems: 'center', borderRadius: 12, paddingVertical: 12, backgroundColor: selectedBookingDates.length === 0 ? '#232533' : '#8ED1FC' }}
                onPress={handleConfirmBookingDates}
                disabled={selectedBookingDates.length === 0}
              >
                <Text style={{ fontFamily: 'Poppins-SemiBold', fontSize: 14, color: selectedBookingDates.length === 0 ? '#7b7b8b' : '#161622' }}>
                  Continue booking
                </Text>
              </TouchableOpacity>

              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Services;