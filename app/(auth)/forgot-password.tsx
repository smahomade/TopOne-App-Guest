import React, { useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { images } from '../../constants';
import { supabase } from '../../lib/supabase';

const PASSWORD_RESET_REDIRECT_URL = 'aora://reset-password';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  const isEmailMissing = email.trim().length === 0;

  const submit = async () => {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail) {
      setShowRequiredErrors(true);
      Alert.alert('Missing email', 'Please enter the email address for your account.');
      return;
    }

    setShowRequiredErrors(false);
    setIsSubmitting(true);

    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: PASSWORD_RESET_REDIRECT_URL,
    });

    if (error) {
      Alert.alert('Reset failed', error.message);
    } else {
      Alert.alert(
        'Check your email',
        'If this email is registered, a password reset link has been sent.'
      );
    }

    setIsSubmitting(false);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="px-5 pb-4 pt-4">
          <View className="items-center">
            <Image
              source={images.logoTopOneWhite}
              resizeMode="contain"
              className="w-[150px] h-[85px]"
            />
          </View>

          <View className="mt-2 items-center px-3">
            <Text className="text-3xl text-white font-psemibold">
              Reset your password
            </Text>
            <Text className="mt-2 text-center font-pregular text-sm text-gray-100">
              Enter your account email and we will send you a password reset link.
            </Text>
          </View>

          <FormField
            title="Email"
            value={email}
            handleChangeText={setEmail}
            OtherStyles="mt-6"
            keyboardType="email-address"
            isRequired
            requiredReason="We need your email to send the password reset link to the right account."
            placeholder="Enter your email"
            hasError={showRequiredErrors && isEmailMissing}
          />

          <CustomButton
            title="Send Reset Email"
            handlePress={submit}
            containerStyles="mt-7 w-full"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-base text-gray-100 font-pregular">
              Remembered your password?
            </Text>
            <Link href="/sign-in" className="text-base font-psemibold text-secondary underline">
              Back to sign in
            </Link>
          </View>

          <Text className="mt-6 text-center font-pregular text-xs leading-5 text-gray-100">
            This app can send reset emails from Supabase, but it cannot securely pre-check whether an email exists in auth from the public client. The reset email will only help if the address is already registered.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ForgotPassword;