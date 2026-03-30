import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';
import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';
import { router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const Home = () => {
  const [session, setSession] = useState(null);
  const [userName, setUserName] = useState('Guest');

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      // If session exists, retrieve user name
      if (session && session.user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', session.user.id)
          .single();

        if (data) {
          setUserName(data.first_name);
        }
      }
    };

    getSession();
  }, []);

  const data = [
    { id: 1, thumbnail: images.banner1, title: "Book Appointment?", description: "Fast book your appointment by Clicking Here" },
    { id: 2, thumbnail: images.banner2, title: "Video 2", description: "Advanced techniques and more." },
    { id: 3, thumbnail: 'https://via.placeholder.com/150', title: "Video 3", description: "Tips and tricks that will make your work easier." }
  ];

  return (
    <SafeAreaView>
      <FlatList
        data={data}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View className="mb-4 relative">
            <Image
              source={typeof item.thumbnail === 'string' ? { uri: item.thumbnail } : item.thumbnail}
              style={{ width: '100%', height: 180, borderRadius: 15 }}
              resizeMode="cover"
            />
            <View style={{ position: 'absolute', right: 20, top: 20, maxWidth: '40%' }}>
              <Text style={{ fontSize: 22.5, color: '#fff', fontWeight: 'bold' }}>{item.title}</Text>
              <Text style={{ fontSize: 16, color: '#fff', flexWrap: 'wrap' }}>{item.description}</Text>
            </View>
          </View>
        )}
        ListHeaderComponent={() => (
          <View className="my-6 px-4 space-y-2">
            <View className="justify-between items-start flex-row mb-6">
              <View>
                <Text className="font-pmedium text-sm">Welcome</Text>
                <Text className="text-2xl font-psemibold">{userName}</Text>
              </View>
              <View className="mt-1.5">
                <Image 
                  source={images.logoTopOneSmall}
                  style={{ width: 120, height: 60 }}
                  resizeMode="contain"
                />
              </View>
            </View>
            <View className="w-full flex-1 pb-2">
              {/* Location Button */}
              <TouchableOpacity onPress={() => router.push('/(extras)/location')}>
                <Text style={{ color: '#8ED1FC', fontSize: 16 }}>
                  Richmond Salon (Default)
                </Text>
              </TouchableOpacity>
              
              {/* Home Text */}
              <Text className="text-2xl font-pregular mt-2">Home</Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
};

export default Home;
