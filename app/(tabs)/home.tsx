import { ActivityIndicator, Animated, Easing, FlatList, Image, ImageSourcePropType, Modal, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchLocations, LOCATION_CONTENT_TABLES } from '@/lib/adminContent';
import { icons, images } from '../../constants';
import { supabase } from '../../lib/supabase';

type Banner = {
  created_at?: string | null;
  description: string;
  id: string;
  image_url: string | null;
  long_description: string;
  location_id?: string | null;
  sort_order: number;
  text_align: 'left' | 'right';
  title: string;
};

const SAVED_LOCATION_KEY = 'topone.currentLocationId';
const NEW_PROMOTION_WINDOW_DAYS = 7;
const NEW_PROMOTION_WINDOW_MS = NEW_PROMOTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;

type BannerCardProps = {
  banner: Banner;
  imageSource: ImageSourcePropType;
  index: number;
  isNewPromotion: boolean;
  onPress: () => void;
};

const BannerCard = ({ banner, imageSource, index, isNewPromotion, onPress }: BannerCardProps) => {
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(18)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;
  const badgeOpacity = useRef(new Animated.Value(0.72)).current;

  useEffect(() => {
    const entranceAnimation = Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 420,
        delay: index * 110,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(entranceTranslateY, {
        toValue: 0,
        duration: 420,
        delay: index * 110,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    entranceAnimation.start();

    let badgeAnimation: Animated.CompositeAnimation | undefined;

    if (isNewPromotion) {
      badgeAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(badgeScale, {
              toValue: 1.08,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(badgeOpacity, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(badgeScale, {
              toValue: 1,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
            Animated.timing(badgeOpacity, {
              toValue: 0.72,
              duration: 900,
              easing: Easing.inOut(Easing.quad),
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      badgeAnimation.start();
    }

    return () => {
      entranceAnimation.stop();
      badgeAnimation?.stop();
    };
  }, [badgeOpacity, badgeScale, entranceOpacity, entranceTranslateY, index, isNewPromotion]);

  return (
    <Animated.View
      style={{
        opacity: entranceOpacity,
        transform: [{ translateY: entranceTranslateY }],
      }}
    >
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        className="mx-4 mb-4 overflow-hidden rounded-2xl"
        style={{ height: 180 }}
      >
        <Image source={imageSource} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            borderRadius: 16,
          }}
        />

        {isNewPromotion ? (
          <Animated.View
            className="absolute left-4 top-4 rounded-full border border-secondary bg-primary/90 px-3 py-1.5"
            style={{
              opacity: badgeOpacity,
              transform: [{ scale: badgeScale }],
            }}
          >
            <Text className="font-psemibold text-[11px] uppercase tracking-widest text-secondary">New promotion</Text>
          </Animated.View>
        ) : null}

        <View
          className="absolute bottom-4 left-4 right-4"
          style={{ alignItems: banner.text_align === 'right' ? 'flex-end' : 'flex-start' }}
        >
          <Text
            className="font-psemibold text-xl text-white"
            style={{ textAlign: banner.text_align }}
          >
            {banner.title}
          </Text>
          <Text
            className="mt-0.5 font-pregular text-sm text-gray-100"
            style={{ textAlign: banner.text_align }}
          >
            {banner.description}
          </Text>
          <Text className="mt-2 font-psemibold text-xs text-secondary">Tap for more details</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const Home = () => {
  const [userName, setUserName] = useState('Guest');
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);
  const [savedLocationId, setSavedLocationId] = useState<string | null>(null);
  const [hasResolvedSavedLocation, setHasResolvedSavedLocation] = useState(false);
  const [resolvedBannerLocationId, setResolvedBannerLocationId] = useState<string | null>(null);

  const fallbackBanners: Banner[] = [
    {
      created_at: null,
      description: 'Fast book your appointment by clicking here',
      id: 'fallback-banner-1',
      image_url: null,
      long_description: 'Use the services page to choose what you want, then create a booking request and wait for the admin team to confirm it with you.',
      location_id: null,
      sort_order: 1,
      text_align: 'left',
      title: 'Book Appointment?',
    },
    {
      created_at: null,
      description: 'Browse the latest work and salon updates.',
      id: 'fallback-banner-2',
      image_url: null,
      long_description: 'Open the collection page to explore work from different years and stay up to date with new salon content.',
      location_id: null,
      sort_order: 2,
      text_align: 'right',
      title: 'Latest Collection',
    },
  ];

  const { data: locationResult } = useRealtimeQuery({
    fetcher: fetchLocations,
    initialData: {
      data: [],
      sourceTable: null,
    },
    enabled: hasResolvedSavedLocation,
    tables: LOCATION_CONTENT_TABLES,
  });

  const currentLocation = useMemo(() => {
    if (locationResult.sourceTable === null) {
      return null;
    }

    const locations = locationResult.data;

    if (savedLocationId) {
      const matchedLocation = locations.find((location) => location.id === savedLocationId);

      if (matchedLocation) {
        return matchedLocation;
      }
    }

    return locations.find((location) => location.isDefault) ?? locations[0] ?? null;
  }, [locationResult.data, locationResult.sourceTable, savedLocationId]);
  const activeLocationId = currentLocation?.id ?? null;
  const hasResolvedLocationContext = hasResolvedSavedLocation && locationResult.sourceTable !== null;

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

  const fetchBranchBanners = useCallback(async () => {
    let query = supabase
      .from('banners')
      .select('id, title, description, long_description, image_url, sort_order, text_align, location_id, created_at')
      .order('sort_order', { ascending: true });

    if (activeLocationId) {
      query = query.eq('location_id', activeLocationId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const mappedBanners = ((data as Banner[] | null) ?? []).map((banner, index) => ({
      ...banner,
      created_at: banner.created_at ?? null,
      description: banner.description ?? '',
      image_url: banner.image_url ?? null,
      location_id: banner.location_id ?? null,
      long_description: banner.long_description ?? banner.description ?? '',
      sort_order: banner.sort_order ?? index + 1,
      text_align: banner.text_align ?? 'left',
      title: banner.title ?? 'Banner',
    }));

    setResolvedBannerLocationId(activeLocationId);

    return mappedBanners;
  }, [activeLocationId]);

  const {
    data: banners,
    loading: bannersLoading,
    refreshing: bannersRefreshing,
    refetch: refetchBanners,
  } = useRealtimeQuery({
    fetcher: fetchBranchBanners,
    enabled: hasResolvedLocationContext,
    initialData: fallbackBanners,
    reloadKey: activeLocationId ?? 'no-location',
    refreshOnFocus: false,
    tables: ['banners'],
  });
  const newestPromotionId = useMemo(() => {
    const newestBanner = banners.reduce<Banner | null>((currentNewest, banner) => {
      if (!banner.created_at) {
        return currentNewest;
      }

      const bannerTime = new Date(banner.created_at).getTime();

      if (!Number.isFinite(bannerTime)) {
        return currentNewest;
      }

      if (!currentNewest?.created_at) {
        return banner;
      }

      const currentNewestTime = new Date(currentNewest.created_at).getTime();

      if (!Number.isFinite(currentNewestTime) || bannerTime > currentNewestTime) {
        return banner;
      }

      return currentNewest;
    }, null);

    if (!newestBanner?.created_at) {
      return null;
    }

    const newestBannerTime = new Date(newestBanner.created_at).getTime();

    if (!Number.isFinite(newestBannerTime)) {
      return null;
    }

    return Date.now() - newestBannerTime <= NEW_PROMOTION_WINDOW_MS ? newestBanner.id : null;
  }, [banners]);
  const isBannerLoading = !hasResolvedLocationContext || bannersLoading || resolvedBannerLocationId !== activeLocationId;
  const visibleBanners = isBannerLoading ? [] : banners;

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      // Prevent stale banner rendering while we resolve the latest saved salon.
      setHasResolvedSavedLocation(false);
      setResolvedBannerLocationId(null);

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
    const fetchUserName = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single();

      if (data?.first_name) {
        setUserName(data.first_name);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        void fetchUserName(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        void fetchUserName(session.user.id);
      } else {
        setUserName('Guest');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const getBannerSource = (item: Banner, index: number): ImageSourcePropType => {
    if (item.image_url) {
      return { uri: item.image_url };
    }

    return index % 2 === 0 ? images.banner1 : images.banner2;
  };

  return (
    <SafeAreaView className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
      <FlatList
        data={visibleBanners}
        keyExtractor={(item) => item.id}
        className="bg-primary"
        style={{ backgroundColor: '#161622' }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={bannersRefreshing} onRefresh={refetchBanners} tintColor="#8ED1FC" />}
        renderItem={({ item, index }) => (
          <BannerCard
            banner={item}
            imageSource={getBannerSource(item, index)}
            index={index}
            isNewPromotion={item.id === newestPromotionId}
            onPress={() => setSelectedBanner(item)}
          />
        )}
        ListHeaderComponent={() => (
          <View className="px-4 pb-4 pt-6">
            <View className="mb-5 flex-row items-center justify-between">
              <View>
                <Text className="font-pregular text-sm text-gray-100">Welcome back,</Text>
                <Text className="font-psemibold text-2xl text-white">{userName}</Text>
              </View>
              <Image
                source={images.logoTopOneWhite}
                style={{ width: 160, height: 64 }}
                resizeMode="contain"
              />
            </View>

            <TouchableOpacity
              onPress={() => router.push('/(extras)/location')}
              className="mb-5 flex-row items-center self-start rounded-full bg-black-100 px-4 py-2"
            >
              <Image
                source={icons.rightArrow}
                style={{ width: 12, height: 12, marginRight: 8 }}
                tintColor="#8ED1FC"
                resizeMode="contain"
              />
              <Text className="font-pregular text-sm text-secondary">{currentLocation?.name ?? 'Choose a salon'}</Text>
            </TouchableOpacity>

            <Text className="mb-3 font-psemibold text-xl text-white">What's on</Text>

            <Text className="mb-2 font-pregular text-sm text-gray-100">
              Browse the latest updates from the salon.
            </Text>

          </View>
        )}
        ListEmptyComponent={() => (
          <View className="px-4 py-6">
            {isBannerLoading ? (
              <>
                <View className="mb-4 h-[180px] rounded-2xl border border-black-200 bg-black-100" />
                <View className="h-[180px] rounded-2xl border border-black-200 bg-black-100" />
              </>
            ) : (
              <Text className="text-center font-pregular text-sm text-gray-100">
                {currentLocation ? `No home updates published for ${currentLocation.name} yet.` : 'No home updates published yet.'}
              </Text>
            )}
          </View>
        )}
      />

      <Modal
        animationType="fade"
        transparent
        visible={selectedBanner !== null}
        onRequestClose={() => setSelectedBanner(null)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(7, 11, 19, 0.82)', justifyContent: 'center', padding: 20 }}>
          <View className="overflow-hidden rounded-3xl border border-black-200 bg-black-100">
            {selectedBanner ? (
              <>
                <Image
                  source={getBannerSource(selectedBanner, banners.findIndex((banner) => banner.id === selectedBanner.id))}
                  style={{ width: '100%', height: 220 }}
                  resizeMode="cover"
                />
                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 24 }}>
                  <Text className="font-pregular text-sm text-secondary">Banner Details</Text>
                  <Text className="mt-2 font-pbold text-2xl text-white">{selectedBanner.title}</Text>
                  <Text className="mt-3 font-psemibold text-sm text-gray-100">{selectedBanner.description}</Text>
                  <Text className="mt-4 font-pregular text-sm leading-6 text-gray-100">{selectedBanner.long_description}</Text>

                  <Pressable
                    onPress={() => setSelectedBanner(null)}
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

export default Home;
