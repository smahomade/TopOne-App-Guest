import { View, Text, ScrollView, Image, AppState } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from '../../constants'
import FormField from '../../components/FormField'
import CustomButton from '../../components/CustomButton'
import InfoModal from '../../components/InfoModal'
import { Link, router } from 'expo-router'
import { supabase } from '../../lib/supabase'


const SignIn = () => {
  const [form, setForm] = useState({
    email:'',
    password:'',

  })

  const [isSubmitting, setisSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  const requiredFieldErrors = {
    email: form.email.trim().length === 0,
    password: form.password.length === 0,
  };


  useEffect(() => {
    // Handle session auto-refresh
    AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        supabase.auth.startAutoRefresh();
      } else {
        supabase.auth.stopAutoRefresh();
      }
    });
  }, []);


  const submit = async () => {
    const trimmedEmail = form.email.trim();

    if (!trimmedEmail || !form.password) {
      setShowRequiredErrors(true);
      return;
    }

    setShowRequiredErrors(false);
    setisSubmitting(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: form.password,
    });

    if (error) {
      setLoginError(error.message);
    }
    else{
      router.replace('/home');
    }

    setisSubmitting(false);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 justify-center items-center px-4">
          <Image 
            source={images.logoTopOneWhite}
            resizeMode='contain' 
            className="w-[150px] h-[85px]"
          />
        </View>

        <View className="flex-1 justify-center items-center px-4 pb-14">
          <Text className="text-2xl text-white font-psemibold mt-4">
            Log in to Top One
          </Text>

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(value: string) => setForm({...form, email:value})}
            OtherStyles='mt-7'
            keyboardType="email-address"
            placeholder="Enter your email"
            isRequired
            requiredReason="Enter the email address you signed up with."
            hasError={showRequiredErrors && requiredFieldErrors.email}
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(value: string) => setForm({...form, password:value})}
            OtherStyles='mt-7'
            placeholder="Enter your password"
            isRequired
            requiredReason="Enter your account password."
            hasError={showRequiredErrors && requiredFieldErrors.password}
          />

          <CustomButton 
            title='Sign In'
            handlePress={submit}
            containerStyles="mt-7 w-full"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Dont have an Account?
            </Text>
            <Link href={"/sign-up"} className="text-lg font-psemibold text-secondary underline">Sign up</Link>
          </View>

          <View className=" justify-center pt-20 flex-row gap-2">
            <Text className="text-lg text-gray-100 font-pregular">
              Forgot Password?
            </Text>
            <Text
              className="text-lg font-psemibold text-secondary underline"
              onPress={() => router.push('/(auth)/forgot-password' as never)}
            >
              Click Here
            </Text>
          </View>
        </View>
      </ScrollView>

      <InfoModal
        visible={loginError !== null}
        title="Login failed"
        message={loginError ?? ''}
        onClose={() => setLoginError(null)}
      />
    </SafeAreaView>
  )
}

export default SignIn