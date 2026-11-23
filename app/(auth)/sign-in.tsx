import { View, Text, ScrollView, Image, AppState } from 'react-native'
import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import AvoidKeyboard from '../../components/AvoidKeyboard'
import { images } from '../../constants'
import FormField from '../../components/FormField'
import CustomButton from '../../components/CustomButton'
import InfoModal from '../../components/InfoModal'
import GoogleSignInButton from '../../components/GoogleSignInButton'
import TextLink from '../../components/TextLink'
import { router } from 'expo-router'
import { supabase } from '../../lib/supabase'
import { hasPendingBooking } from '../../lib/pendingBooking'
import SalonLogo from '../../components/SalonLogo';


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
      // A booking request saved before sign-in is sent from the Messages tab.
      router.replace((await hasPendingBooking()) ? '/book' : '/home');
    }

    setisSubmitting(false);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <AvoidKeyboard>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        // Without this, a tap while the keyboard is open only closes the
        // keyboard, so buttons and links seem to need two taps
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 justify-center items-center px-4">
          <SalonLogo 
            resizeMode='contain' 
            style={{ width: 150, height: 85 }}
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

          <GoogleSignInButton returnTo="home" dividerPosition="above" containerStyles="mt-5" />

          <View className="pt-3 flex-row flex-wrap items-center justify-center" style={{ columnGap: 8 }}>
            <Text className="text-lg text-gray-100 font-pregular">
              Don't have an account?
            </Text>
            <TextLink label="Sign up" href="/sign-up" />
          </View>

          <View className="pt-16 flex-row flex-wrap items-center justify-center" style={{ columnGap: 8 }}>
            <Text className="text-lg text-gray-100 font-pregular">
              Forgot Password?
            </Text>
            <TextLink label="Click Here" href="/forgot-password" />
          </View>
        </View>
      </ScrollView>
      </AvoidKeyboard>

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