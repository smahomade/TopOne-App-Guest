import { ActivityIndicator, Image, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchGalleryImages, GALLERY_CONTENT_TABLES } from '@/lib/adminContent';
import { images } from '../../constants';

const Collection = () => {
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const {
    data: galleryResult,
    loading,
    refreshing,
    refetch,
  } = useRealtimeQuery({
    fetcher: fetchGalleryImages,
    initialData: {
      data: [],
      sourceTable: null,
    },
    tables: GALLERY_CONTENT_TABLES,
  });

  const galleryImages = galleryResult.data;
  const galleryByYear = useMemo(() => galleryImages.reduce<Record<string, typeof galleryImages>>((groups, image) => {
    const yearKey = image.year || 'Unknown';

    if (!groups[yearKey]) {
      groups[yearKey] = [];
    }

    groups[yearKey].push(image);

    return groups;
  }, {}), [galleryImages]);

  const orderedYears = useMemo(() => Object.keys(galleryByYear).sort((leftYear, rightYear) => {
    if (leftYear === 'Unknown') {
      return 1;
    }

    if (rightYear === 'Unknown') {
      return -1;
    }

    return Number(rightYear) - Number(leftYear);
  }), [galleryByYear]);

  const activeYear = selectedYear && galleryByYear[selectedYear] ? selectedYear : null;
  const activeYearImages = activeYear ? galleryByYear[activeYear] : [];

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
      <ScrollView
        className="bg-primary"
        style={{ backgroundColor: '#161622' }}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#8ED1FC" />}
      >
        <View className="px-4 pb-4 pt-2">
          <View className="mb-5 flex-row items-center justify-between">
            <View>
              <Text className="font-pregular text-sm text-gray-100">Collection</Text>
              <Text className="mt-1 font-psemibold text-2xl text-white">Collection</Text>
            </View>
            <Image 
              source={images.logoTopOneWhite} 
              style={{ width: 120, height: 52 }}
              resizeMode="contain"
            />
          </View>
          <Text className="mb-4 font-pregular text-sm text-gray-100">
            {activeYear
              ? `Viewing all images from ${activeYear}.`
              : 'Choose a year bundle to view all collection images from that year.'}
          </Text>
        </View>

        <View style={styles.container}>
          {loading ? <ActivityIndicator size="small" color="#8ED1FC" /> : null}

          {orderedYears.length > 0 ? (
            activeYear ? (
              <View style={styles.yearSection}>
                <Pressable style={styles.backButton} onPress={() => setSelectedYear(null)}>
                  <Text style={styles.backButtonText}>Back to years</Text>
                </Pressable>

                <Text style={styles.yearTitle}>{activeYear}</Text>
                <Text style={styles.yearSubtitle}>{activeYearImages.length} images in this bundle</Text>

                <View style={styles.collage}>
                  {activeYearImages.map((item) => (
                    <View key={item.id} style={styles.card}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                      {item.title ? <Text style={styles.caption}>{item.title}</Text> : null}
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              orderedYears.map((year) => (
                <Pressable key={year} style={styles.yearBundleCard} onPress={() => setSelectedYear(year)}>
                  <Image
                    source={{ uri: galleryByYear[year][0]?.imageUrl }}
                    style={styles.yearBundleImage}
                    resizeMode="cover"
                  />
                  <View style={styles.yearBundleOverlay} />
                  <View style={styles.yearBundleContent}>
                    <Text style={styles.yearBundleTitle}>{year}</Text>
                    <Text style={styles.yearBundleMeta}>{galleryByYear[year].length} images</Text>
                    <Text style={styles.yearBundleHint}>Tap to open this bundle</Text>
                  </View>
                </Pressable>
              ))
            )
          ) : (
            <Text style={styles.emptyState}>
              {galleryResult.sourceTable
                ? 'No gallery items have been published yet.'
                : 'Connect the gallery table from the admin app to show collection updates here.'}
            </Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    color: '#6b7280',
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 16,
    textAlign: 'center',
  },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#1E1E2D',
    borderColor: '#232533',
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#CDCDE0',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#1E1E2D',
    borderColor: '#232533',
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
    overflow: 'hidden',
    width: '48%',
  },
  image: {
    height: 170,
    width: '100%',
  },
  caption: {
    color: '#ffffff',
    fontFamily: 'Poppins-Medium',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  yearSection: {
    marginBottom: 20,
  },
  yearSubtitle: {
    color: '#8ED1FC',
    fontFamily: 'Poppins-Regular',
    fontSize: 13,
    marginBottom: 14,
  },
  yearTitle: {
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
    marginBottom: 12,
  },
  yearBundleCard: {
    backgroundColor: '#1E1E2D',
    borderColor: '#232533',
    borderRadius: 20,
    borderWidth: 1,
    height: 180,
    marginBottom: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  yearBundleContent: {
    bottom: 18,
    left: 18,
    position: 'absolute',
    right: 18,
  },
  yearBundleHint: {
    color: '#CDCDE0',
    fontFamily: 'Poppins-Regular',
    fontSize: 12,
    marginTop: 8,
  },
  yearBundleImage: {
    height: '100%',
    width: '100%',
  },
  yearBundleMeta: {
    color: '#8ED1FC',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 13,
    marginTop: 4,
  },
  yearBundleOverlay: {
    backgroundColor: 'rgba(7, 11, 19, 0.55)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  yearBundleTitle: {
    color: '#ffffff',
    fontFamily: 'Poppins-Bold',
    fontSize: 28,
  },
});

export default Collection;
