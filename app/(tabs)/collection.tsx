import { View, Text, Image, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import React from 'react';
import { images } from '../../constants';

const Collection = () => {
  // Array of image URLs (You can replace these with your own images)
  const collageOfImages = [
    'https://cdn.britannica.com/45/5645-050-B9EC0205/head-treasure-flower-disk-flowers-inflorescence-ray.jpg',
    'https://cdn.britannica.com/45/5645-050-B9EC0205/head-treasure-flower-disk-flowers-inflorescence-ray.jpg',
    'https://cdn.britannica.com/45/5645-050-B9EC0205/head-treasure-flower-disk-flowers-inflorescence-ray.jpg',
    'https://cdn.britannica.com/45/5645-050-B9EC0205/head-treasure-flower-disk-flowers-inflorescence-ray.jpg',
    'https://cdn.britannica.com/45/5645-050-B9EC0205/head-treasure-flower-disk-flowers-inflorescence-ray.jpg',
    'https://cdn.britannica.com/45/5645-050-B9EC0205/head-treasure-flower-disk-flowers-inflorescence-ray.jpg',
  ];

  return (
    <SafeAreaView>
      <ScrollView>

          {/* Logo Section */}
        <View className="items-center mb-6">
          <Image 
            source={images.logoTopOne} 
            className="w-40 h-16"
            resizeMode="contain"
          />
          <Text className="text-lg mt-2">TopOne Salon - Richmond</Text>
        </View>




        <View style={styles.container}>
          <Text style={styles.title}>Image Collage</Text>
          <View style={styles.collage}>
            {collageOfImages.map((imageUri, index) => (
              <Image
                key={index}
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  collage: {
    flexDirection: 'row',
    flexWrap: 'wrap',  // This allows images to wrap to the next line
    justifyContent: 'space-between',
  },
  image: {
    width: '30%',  // Adjust the width to fit three images per row
    height: 100,
    marginBottom: 10,
    borderRadius: 10,
  },
});

export default Collection;
