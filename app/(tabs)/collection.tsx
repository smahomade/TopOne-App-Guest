import { ActivityIndicator, FlatList, Image, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';

import { useRealtimeQuery } from '@/hooks/useRealtimeQuery';
import { fetchGalleryImages, GALLERY_CONTENT_TABLES, type GalleryImage } from '@/lib/adminContent';
import { images } from '../../constants';
import SalonLogo from '../../components/SalonLogo';

// The image's own text from the staff app, or the year and subtitle as before.
function getImageCaption(image: GalleryImage) {
  return image.caption?.trim() || [image.year, image.subtitle].filter(Boolean).join(' · ');
}

const Collection = () => {
  const { width: windowWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  // Which image the full-screen viewer opened on, and which one is showing now.
  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null);
  const [viewerIndex, setViewerIndex] = useState(0);
  // The space between the viewer's top and bottom bars, measured on screen.
  const [viewerAreaHeight, setViewerAreaHeight] = useState(0);

  // Leaving the tab closes the open bundle, so coming back shows every bundle.
  useFocusEffect(
    useCallback(() => {
      return () => {
        setSelectedBundle(null);
        setViewerStartIndex(null);
      };
    }, [])
  );

  const openViewer = (index: number) => {
    setViewerIndex(index);
    setViewerStartIndex(index);
  };

  const closeViewer = () => setViewerStartIndex(null);

  const handleViewerScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setViewerIndex(Math.round(event.nativeEvent.contentOffset.x / windowWidth));
  };
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
  // Switched on per bundle in the staff app ("Add subtext for each image").
  const activeBundleShowsCaptions = activeBundleImages.some((image) => image.showCaptions);
  const viewerImage = activeBundleImages[viewerIndex] ?? null;
  const viewerCaption = activeBundleShowsCaptions && viewerImage ? getImageCaption(viewerImage) : '';

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-cream" style={{ backgroundColor: '#F4F1EC' }}>
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
                color="#1A1817"
              />
            </TouchableOpacity>
          ) : (
            <View>
              <Text className="font-pregular text-sm text-muted">Collection</Text>
              <Text className="mt-1 font-display text-[28px] text-ink">Collection</Text>
            </View>
          )}
          <SalonLogo
            style={{ width: 120, height: 52 }}
            resizeMode="contain"
          />
        </View>
        <View style={{ height: 1, backgroundColor: '#E4DDD3' }} />
        {!activeBundle ? (
          <Text className="px-4 pb-2 pt-3 font-pregular text-sm text-muted">
            Choose a collection bundle to view all images in that set.
          </Text>
        ) : null}
      </View>

      <ScrollView
        className="bg-cream"
        style={{ backgroundColor: '#F4F1EC' }}
        contentContainerStyle={{ paddingBottom: 32, paddingTop: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refetch} tintColor="#1A1817" />}
      >

        <View style={styles.container}>
          {loading ? <ActivityIndicator size="small" color="#1A1817" /> : null}

          {orderedBundles.length > 0 ? (
            activeBundle ? (
              <View style={styles.yearSection}>
                <Text style={styles.yearTitle}>{activeBundle}</Text>
                {/* One line under the name. The year is left out when the
                    bundle is already named after it ("2021"). */}
                <Text style={styles.yearSubtitle}>
                  {[
                    activeBundleYearLabel !== activeBundle ? activeBundleYearLabel : null,
                    activeBundleSubtitle,
                    `${activeBundleImages.length} ${activeBundleImages.length === 1 ? 'image' : 'images'}`,
                  ].filter(Boolean).join(' · ')}
                </Text>

                <View style={styles.collage}>
                  {activeBundleImages.map((item, index) => {
                    const caption = activeBundleShowsCaptions ? getImageCaption(item) : '';

                    return (
                      <Pressable key={item.id} style={styles.card} onPress={() => openViewer(index)}>
                        <Image
                          source={{ uri: item.imageUrl }}
                          style={styles.image}
                          resizeMode="cover"
                        />
                        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
                      </Pressable>
                    );
                  })}
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
                // The year isn't repeated under a bundle named after it ("2021").
                const yearText = bundleYears.join(' · ');
                const bundleSubText = [yearText !== bundleTitle ? yearText : null, bundleSubtitle].filter(Boolean).join(' · ');

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
                    {bundleSubText ? <Text style={styles.yearBundleMeta} numberOfLines={1}>{bundleSubText}</Text> : null}
                    <Text style={styles.yearBundleMeta}>
                      {bundleImages.length} {bundleImages.length === 1 ? 'image' : 'images'}
                      <Text style={styles.yearBundleHint}>  ·  Tap to open</Text>
                    </Text>
                  </View>
                </Pressable>
                );
              })
            )
          ) : (
            <Text style={styles.emptyState}>
              {galleryResult.sourceTable
                ? 'No gallery items have been published yet.'
                : "The gallery couldn't be loaded right now. Please try again later."}
            </Text>
          )}
        </View>
      </ScrollView>

      {/* Opens on the tapped image; swipe left or right for the rest of the bundle. */}
      <Modal
        visible={viewerStartIndex !== null && activeBundleImages.length > 0}
        transparent
        animationType="fade"
        onRequestClose={closeViewer}
        statusBarTranslucent
      >
        {/* The counter and ✕ sit in a bar above the photo and the text in a
            bar below it, so nothing covers the picture (the salon's photos
            have the TopOne mark in a corner). */}
        <View style={styles.fullscreenOverlay}>
          <View style={[styles.viewerTopBar, { paddingTop: insets.top + 8 }]}>
            <Text style={styles.fullscreenCounterText}>
              {activeBundleImages.length > 1
                ? `${Math.min(viewerIndex + 1, activeBundleImages.length)} / ${activeBundleImages.length}`
                : ''}
            </Text>
            <TouchableOpacity
              style={styles.fullscreenClose}
              onPress={closeViewer}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Text style={styles.fullscreenCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flex: 1 }} onLayout={(event) => setViewerAreaHeight(event.nativeEvent.layout.height)}>
            {viewerStartIndex !== null && viewerAreaHeight > 0 ? (
              <FlatList
                data={activeBundleImages}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={Math.min(viewerStartIndex, activeBundleImages.length - 1)}
                getItemLayout={(_, index) => ({ length: windowWidth, offset: windowWidth * index, index })}
                onMomentumScrollEnd={handleViewerScrollEnd}
                renderItem={({ item }) => (
                  <Image
                    source={{ uri: item.imageUrl }}
                    style={{ width: windowWidth, height: viewerAreaHeight }}
                    resizeMode="contain"
                  />
                )}
              />
            ) : null}
          </View>

          <View style={[styles.viewerBottomBar, { paddingBottom: insets.bottom + 16 }]}>
            {viewerCaption ? <Text style={styles.fullscreenCaptionText}>{viewerCaption}</Text> : null}
          </View>
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
    color: '#6B635A',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD3',
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backButtonText: {
    color: '#6B635A',
    fontFamily: 'DMSans-SemiBold',
    fontSize: 12,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD3',
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
    color: '#1A1817',
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  yearSection: {
    marginBottom: 20,
  },
  yearSubtitle: {
    color: '#1A1817',
    fontFamily: 'DMSans-Regular',
    fontSize: 13,
    marginBottom: 16,
  },
  yearTitle: {
    color: '#1A1817',
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 24,
    marginBottom: 2,
  },
  yearBundleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E4DDD3',
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
    color: '#E8E2DA',
    fontFamily: 'DMSans-Regular',
    fontSize: 12,
    marginTop: 8,
  },
  yearBundleImage: {
    height: '100%',
    width: '100%',
  },
  yearBundleMeta: {
    color: '#FFFFFF',
    fontFamily: 'DMSans-SemiBold',
    fontSize: 13,
    marginTop: 4,
  },
  yearBundleOverlay: {
    backgroundColor: 'rgba(26, 24, 23, 0.55)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  yearBundleTitle: {
    color: '#ffffff',
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 30,
  },
  fullscreenOverlay: {
    backgroundColor: '#000000',
    flex: 1,
  },
  viewerTopBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 18,
  },
  viewerBottomBar: {
    minHeight: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  fullscreenCounterText: {
    color: '#D6CEC4',
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
  },
  fullscreenCaptionText: {
    color: '#ffffff',
    fontFamily: 'DMSans-Medium',
    fontSize: 14,
    textAlign: 'center',
  },
  fullscreenClose: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  fullscreenCloseText: {
    color: '#ffffff',
    fontFamily: 'DMSans-SemiBold',
    fontSize: 20,
  },
});

export default Collection;
