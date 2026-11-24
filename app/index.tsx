import { router, useFocusEffect } from "expo-router";
import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants";
import CustomButton from "@/components/CustomButton";
import TextLink from "@/components/TextLink";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRequirePhoneNumber } from "@/hooks/useRequirePhoneNumber";
import { Session } from '@supabase/supabase-js'
import React from "react";
import SalonLogo from '../components/SalonLogo';


export default function Index() {
  // session is used to store data from supabase, setSession is use to update the data, getSession gets data.
  // <Session | null> this means session can be null or can be session(have data), (null) mean it starts with null
  const [session, setSession] = useState<Session | null>(null);
  // Loading is used to check whether session has obtained its data or not
  // Initalised as true because session is null meaning no data is there so it should keep loading till session is not null.
  const [loading, setLoading] = useState(true);

  // useFocusEffect is like the awake function in C#, when your on the index page this function auto calls itself.
  // everytime your on the index page it calls itself
  // It also runs on first load, so there's no separate effect. (One that
  // depended on [session] used to set the session again and loop forever.)
  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      const getSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (active) {
          setSession(session);
          setLoading(false);
        }
      };
      getSession();
      return () => {
        active = false;
      };
    }, [])
  );

  // A signed-in customer with no phone number (say, one who closed the app
  // half-way through a Google sign-in) is asked for it when the app opens.
  useRequirePhoneNumber('push');

  // Everyone goes straight to the service menu. Signing in is only asked for
  // when the request is sent, and the request is kept while they do it.
  const handleBooking = () => {
    router.push('/services');
  };

  return (
    
    <SafeAreaView className="bg-cream h-full ">

      {/* Full-screen background photo (React Native has deprecated ImageBackground) */}
      <View style={{ flex: 1 }}>
      <Image
        source={images.backgroundImage}
        // Explicit size stops <Image> using the photo's own pixel size
        style={[StyleSheet.absoluteFill, { width: '100%', height: '100%' }]}
        resizeMode="cover"
      />
      {/* Overlay or fade effect */}
      <View style={{ backgroundColor: 'rgba(26, 24, 23, 0.4)', flex: 1 }}>
      <ScrollView contentContainerStyle ={{ height: '100%'}}>

        {/* Top Logo Image - Positioned at the top */}
        <View className="w-full items-center justify-start pt-10">
          <SalonLogo
            onPhoto
            style={{ width: 200, height: 85 }}
            resizeMode="contain"
          />
        </View>

        {/* Adjusting items inside, e.g. centering the images */}
        <View className="w-full items-center justify-center min-h-[85vh] px-4 mt-14">

          
          <View className="relative mt-5 w-full">
            {/* One line on every iPhone: shrinks a little on narrow ones
                instead of leaving "TopOne" on a line of its own */}
            <Text
              className="font-display text-[32px] text-white text-center"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Book with Ease at TopOne
            </Text>
            <Text className="font-display text-[32px] text-cream text-center">
              Fast & Simple
            </Text>
          </View>

          
          {/* Under Components, we are using CustomerButton tsx file with components */}
          {/* the orange button with "continue with email"*/}
          <CustomButton 
            title ="Book Appointment"
            handlePress={handleBooking}
            containerStyles="w-full mt-7"
            backgroundColor="#F4F1EC"
            textColor="#1A1817"
          />
      </View>



          {/* Sign-in link at the bottom, only for signed-out visitors */}
      {!loading && !session ? (
      <View style={{
            position: 'absolute', 
            bottom: 30, 
            left: 0, 
            right: 0, 
            alignItems: 'center'
          }}>

            <View className="flex-row items-center" style={{ columnGap: 8 }}>
              <Text className="text-lg text-cream font-pregular">
                Already a customer?
              </Text>
              <TextLink label="Sign in" href="/sign-in" colorClassName="text-white" />
            </View>
          </View>
      ) : null}
      </ScrollView>
      
      {/* Adds light to the status bar (top bar with battery, wifi and time) <StatusBar backgroundColor="#F4F1EC" style="light"/> */}
      </View>
      </View>
      {/* The bar above the photo is cream, so its icons are dark */}
      <StatusBar style='dark'/>
    </SafeAreaView>
  );
}
