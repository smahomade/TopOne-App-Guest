import { Link, router } from "expo-router";
import { Image,ScrollView,Text, View, ImageBackground } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";
import { images } from "../constants"; 
import CustomButton from "@/components/CustomButton";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Session } from '@supabase/supabase-js'
import { useFocusEffect } from '@react-navigation/native';
import React from "react";


export default function Index() {
  // session is used to store data from supabase, setSession is use to update the data, getSession gets data.
  // <Session | null> this means session can be null or can be session(have data), (null) mean it starts with null
  const [session, setSession] = useState<Session | null>(null);
  // Loading is used to check whether session has obtained its data or not
  // Initalised as true because session is null meaning no data is there so it should keep loading till session is not null.
  const [loading, setLoading] = useState(true);

  // useFocusEffect is like the awake function in C#, when your on the index page this function auto calls itself.
  // everytime your on the index page it calls itself
    useFocusEffect(
      //React.useCallback(()=>{} this is used to memorise the cache information and used to avoid unnessarcy re-renders)
      React.useCallback(() => {
        //getSession grabs the 
        const getSession = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          setSession(session);
        };
        getSession();
      }, [])
    );

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      //console.log("Session data:", session); // Log session data
      setSession(session);
      setLoading(false); // Stop loading once session is checked
    };
    getSession();

 
  }, [session]);

  const handleBooking = () => {
    if (loading) return; // Prevent any navigation while loading
    if (session) {
      router.push('/home');  // Redirect to home if logged in
    } else {
      router.push('/sign-in');  // Redirect to sign-in if not logged in
    }
  };

  return (
    
    <SafeAreaView className="bg-primary h-full ">

      <ImageBackground 
        source={images.backgroundImage}  // Replace with your background image
        style={{ flex: 1 }} // Ensures the image covers the full screen
        >
      {/* Overlay or fade effect */}
      <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', flex: 1 }}>
      <ScrollView contentContainerStyle ={{ height: '100%'}}>

        {/* Top Logo Image - Positioned at the top */}
        <View className="w-full items-center justify-start pt-10">
          <Image 
            source={images.logoTopOneWhite}
            className="w-[200px] h-[85px]"
            resizeMode="contain"
          />
        </View>

        {/* Adjusting items inside, e.g. centering the images */}
        <View className="w-full items-center justify-center min-h-[85vh] px-4 mt-14">

          
          <View className="relative mt-5">
            <Text className="text-3xl text-white font-bold text-center">
              Book with Ease at TopOne
            </Text>
            <Text className="text-3xl text-secondary-100 font-bold text-center">
              Fast & Simple
            </Text>
          </View>

          
          {/* Under Components, we are using CustomerButton tsx file with components */}
          {/* the orange button with "continue with email"*/}
          <CustomButton 
            title ="Book Appointment"
            handlePress={handleBooking}
            containerStyles="w-full mt-7"
          />
      </View>



          {/* Admin Text - Positioned at the bottom */}
      <View style={{
            position: 'absolute', 
            bottom: 30, 
            left: 0, 
            right: 0, 
            alignItems: 'center'  // Center the admin text horizontally
          }}>

            <View className="flex-row gap-2">
              <Text className="text-lg text-gray-100 font-pregular">
                Access as a Guest?
              </Text>
              <Link href="/home" className="text-lg font-psemibold text-secondary underline">
                Click Here
              </Link>
            </View>
          </View>
      </ScrollView>
      
      {/* Adds light to the status bar (top bar with battery, wifi and time) <StatusBar backgroundColor="#161622" style="light"/> */}
      </View>
      </ImageBackground>
      <StatusBar style='light'/>
    </SafeAreaView>
  );
}
