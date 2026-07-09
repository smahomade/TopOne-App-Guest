import { ActivityIndicator, Dimensions, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchGalleryImages, GALLERY_CONTENT_TABLES } from '@/lib/adminContent';
import { images } from '../../constants';

const Collection = () => {
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);
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
  const galleryByBundle = useMemo(() => galleryImages.reduce<Record<string, typeof galleryImages>>((groups, image) => {
    const bundleKey = image.title?.trim() || 'Collection';

    if (!groups[bundleKey]) {
      groups[bundleKey] = [];
    }

    groups[bundleKey].push(image);

    return groups;
  }, {}), [galleryImages]);

  const orderedBundles = useMemo(() => {
    const seenBundles = new Set<string>();
    const bundlesInSortOrder: string[] = [];

    for (const image of galleryImages) {
      const bundleKey = image.title?.trim() || 'Collection';

      if (seenBundles.has(bundleKey)) {
        continue;
      }

      seenBundles.add(bundleKey);
      bundlesInSortOrder.push(bundleKey);
    }

    return bundlesInSortOrder;
  }, [galleryImages]);

  const activeBundle = selectedBundle && galleryByBundle[selectedBundle] ? selectedBundle : null;
  const activeBundleImages = activeBundle ? galleryByBundle[activeBundle] : [];
  const activeBundleYearLabel = useMemo(() => {
    const seenYears = new Set<string>();
    const years: string[] = [];

    for (const image of activeBundleImages) {
      const yearLabel = image.year || 'Unknown';

      if (seenYears.has(yearLabel)) {
        continue;
      }

      seenYears.add(yearLabel);
      years.push(yearLabel);
    }

    return years.join(' · ');
  }, [activeBundleImages]);
  const activeBundleSubtitle = useMemo(
    () => activeBundleImages.find((image) => Boolean(image.subtitle))?.subtitle ?? null,
    [activeBundleImages]
  );

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
      {/* Top header — always visible, not scrollable */}
      <View className="pt-2">
        <View className="flex-row items-center justify-between px-4 pb-3">
          {activeBundle ? (
            <TouchableOpacity
              onPress={() => setSelectedBundle(null)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
                size={Platform.OS === 'ios' ? 30 : 26}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          ) : (
            <View>
              <Text className="font-pregular text-sm text-gray-100">Collection</Text>
              <Text className="mt-1 font-psemibold text-2xl text-white">Collection</Text>
            </View>
          )}
          <Image
            source={images.logoTopOneWhite}
            style={{ width: 120, height: 52 }}
            resizeMode="contain"
          />
        </View>
        <View style={{ height: 1, backgroundColor: '#232533' }} />
        {!activeBundle ? (
          <Text className="px-4 pb-2 pt-3 font-pregular text-sm text-gray-100">
            Choose a collection bundle to view all images in that set.
          </Text>
        ) : null}
      </View>

      <ScrollView
        className="bg-primary"
        style={{ backgroundColor: '#161622' }}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#8ED1FC" />}
      >

        <View style={styles.container}>
          {loading ? <ActivityIndicator size="small" color="#8ED1FC" /> : null}

          {orderedBundles.length > 0 ? (
            activeBundle ? (
              <View style={styles.yearSection}>
                <Text style={styles.yearTitle}>{activeBundle}</Text>
                <Text style={styles.yearSubtitle}>
                  {[activeBundleYearLabel, activeBundleSubtitle].filter(Boolean).join(' · ') || 'No details'}
                </Text>
                <Text style={styles.yearSubtitle}>{activeBundleImages.length} images in this bundle</Text>

                <View style={styles.collage}>
                  {activeBundleImages.map((item) => (
                    <Pressable key={item.id} style={styles.card} onPress={() => setFullscreenImage(item.imageUrl)}>
                      <Image
                        source={{ uri: item.imageUrl }}
                        style={styles.image}
                        resizeMode="cover"
                      />
                      <Text style={styles.caption}>
                        {[item.year || 'Unknown', item.subtitle].filter(Boolean).join(' · ')}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : (
              orderedBundles.map((bundleTitle) => {
                const bundleImages = galleryByBundle[bundleTitle] ?? [];
                const seenYears = new Set<string>();
                const bundleYears: string[] = [];

                for (const image of bundleImages) {
                  const yearLabel = image.year || 'Unknown';

                  if (seenYears.has(yearLabel)) {
                    continue;
                  }

                  seenYears.add(yearLabel);
                  bundleYears.push(yearLabel);
                }

                const bundleSubtitle = bundleImages.find((image) => Boolean(image.subtitle))?.subtitle ?? null;
                const bundleSubText = [bundleYears.join(' · '), bundleSubtitle].filter(Boolean).join(' · ');

                return (
                  <Pressable key={bundleTitle} style={styles.yearBundleCard} onPress={() => setSelectedBundle(bundleTitle)}>
                  <Image
                    source={{ uri: bundleImages[0]?.imageUrl }}
                    style={styles.yearBundleImage}
                    resizeMode="cover"
                  />
                  <View style={styles.yearBundleOverlay} />
                  <View style={styles.yearBundleContent}>
                    <Text style={styles.yearBundleTitle}>{bundleTitle}</Text>
                    {bundleSubText ? <Text style={styles.yearBundleMeta}>{bundleSubText}</Text> : null}
                    <Text style={styles.yearBundleMeta}>{bundleImages.length} images</Text>
                    <Text style={styles.yearBundleHint}>Tap to open this bundle</Text>
                  </View>
                </Pressable>
                );
              })
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

      <Modal
        visible={fullscreenImage !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenImage(null)}
        statusBarTranslucent
      >
        <View style={styles.fullscreenOverlay}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenImage(null)}>
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          {fullscreenImage ? (
            <Image
              source={{ uri: fullscreenImage }}
              style={styles.fullscreenImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
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
  fullscreenOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    flex: 1,
    justifyContent: 'center',
  },
  fullscreenImage: {
    height: Dimensions.get('window').height,
    width: Dimensions.get('window').width,
  },
  fullscreenClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderColor: 'rgba(255,255,255,0.4)',
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    position: 'absolute',
    right: 18,
    top: 52,
    width: 44,
    zIndex: 10,
  },
  fullscreenCloseText: {
    color: '#ffffff',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 20,
  },
});

export default Collection;
