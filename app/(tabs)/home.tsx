import { ActivityIndicator, FlatList, Image, ImageSourcePropType, Modal, Pressable, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { icons, images } from '../../constants';
import { supabase } from '../../lib/supabase';

type Banner = {
  description: string;
  id: string;
  image_url: string | null;
  long_description: string;
  sort_order: number;
  text_align: 'left' | 'right';
  title: string;
};

const Home = () => {
  const [userName, setUserName] = useState('Guest');
  const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

  const fallbackBanners: Banner[] = [
    {
      description: 'Fast book your appointment by clicking here',
      id: 'fallback-banner-1',
      image_url: null,
      long_description: 'Use the services page to choose what you want, then create a booking request and wait for the admin team to confirm it with you.',
      sort_order: 1,
      text_align: 'left',
      title: 'Book Appointment?',
    },
    {
      description: 'Browse the latest work and salon updates.',
      id: 'fallback-banner-2',
      image_url: null,
      long_description: 'Open the collection page to explore work from different years and stay up to date with new salon content.',
      sort_order: 2,
      text_align: 'right',
      title: 'Latest Collection',
    },
  ];

  const {
    data: banners,
    loading: bannersLoading,
    refreshing: bannersRefreshing,
    refetch: refetchBanners,
  } = useRealtimeQuery({
    fetcher: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('id, title, description, long_description, image_url, sort_order, text_align')
        .order('sort_order', { ascending: true });

      if (error) {
        throw error;
      }

      return ((data as Banner[] | null) ?? []).map((banner, index) => ({
        ...banner,
        description: banner.description ?? '',
        image_url: banner.image_url ?? null,
        long_description: banner.long_description ?? banner.description ?? '',
        sort_order: banner.sort_order ?? index + 1,
        text_align: banner.text_align ?? 'left',
        title: banner.title ?? 'Banner',
      }));
    },
    initialData: fallbackBanners,
    tables: ['banners'],
  });

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
        data={banners}
        keyExtractor={(item) => item.id}
        className="bg-primary"
        style={{ backgroundColor: '#161622' }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={bannersRefreshing} onRefresh={refetchBanners} tintColor="#8ED1FC" />}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setSelectedBanner(item)}
            className="mx-4 mb-4 overflow-hidden rounded-2xl"
            style={{ height: 180 }}
          >
            <Image source={getBannerSource(item, index)} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
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

            <View
              className="absolute bottom-4 left-4 right-4"
              style={{ alignItems: item.text_align === 'right' ? 'flex-end' : 'flex-start' }}
            >
              <Text
                className="font-psemibold text-xl text-white"
                style={{ textAlign: item.text_align }}
              >
                {item.title}
              </Text>
              <Text
                className="mt-0.5 font-pregular text-sm text-gray-100"
                style={{ textAlign: item.text_align }}
              >
                {item.description}
              </Text>
              <Text className="mt-2 font-psemibold text-xs text-secondary">Tap for more details</Text>
            </View>
          </TouchableOpacity>
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
              <Text className="font-pregular text-sm text-secondary">Richmond Salon</Text>
            </TouchableOpacity>

            <Text className="mb-3 font-psemibold text-xl text-white">What's on</Text>

            <Text className="mb-2 font-pregular text-sm text-gray-100">
              Browse the latest updates from the salon.
            </Text>

            {bannersLoading ? (
              <View className="py-10 items-center">
                <ActivityIndicator size="large" color="#8ED1FC" />
              </View>
            ) : null}
          </View>
        )}
        ListEmptyComponent={() => (
          <View className="items-center px-4 py-10">
            {bannersLoading ? (
              <ActivityIndicator size="small" color="#8ED1FC" />
            ) : (
              <Text className="font-pregular text-sm text-gray-100">No home updates published yet.</Text>
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
