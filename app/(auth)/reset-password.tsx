import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvoidKeyboard from '../../components/AvoidKeyboard';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import { images } from '../../constants';
import { supabase } from '../../lib/supabase';
import { extractTokens } from '../../lib/authLinks';
import SalonLogo from '../../components/SalonLogo';

const rules = [
  (v: string) => v.length >= 8,
  (v: string) => /[A-Z]/.test(v),
  (v: string) => /[0-9]/.test(v),
  (v: string) => /[^A-Za-z0-9]/.test(v),
];

const getScore = (value: string): number => {
  return rules.filter(r => r(value)).length;
};

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const applyRecoverySession = async (url: string | null) => {
      if (!url) {
        return;
      }

      const { accessToken, refreshToken, type } = extractTokens(url);

      if (!accessToken || !refreshToken || type !== 'recovery') {
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        Alert.alert('Reset link error', error.message);
        return;
      }

      if (mounted) {
        setRecoveryReady(true);
      }
    };

    void Linking.getInitialURL().then(applyRecoverySession);

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void applyRecoverySession(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const passwordMissing = password.length === 0;
  const confirmMissing = confirmPassword.length === 0;

  const submit = async () => {
    if (!password || !confirmPassword) {
      setShowRequiredErrors(true);
      Alert.alert('Missing required details', 'Please enter and confirm your new password.');
      return;
    }

    if (password !== confirmPassword) {
      setShowRequiredErrors(true);
      Alert.alert('Passwords do not match', 'Please make sure both password fields match.');
      return;
    }

    if (getScore(password) < 3) {
      Alert.alert('Weak password', 'Please choose a stronger password. Try adding an uppercase letter, a number, or a special character.');
      return;
    }

    if (!recoveryReady) {
      Alert.alert('Recovery link required', 'Open this screen from the password reset email link before setting a new password.');
      return;
    }

    setShowRequiredErrors(false);
    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      Alert.alert('Password update failed', error.message);
    } else {
      Alert.alert('Password updated', 'Your password has been reset. Please sign in with your new password.');
      router.replace('/(auth)/sign-in');
    }

    setIsSubmitting(false);
  };

  return (
    <SafeAreaView className="bg-primary h-full">
      <AvoidKeyboard>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        // Without this, a tap while the keyboard is open only closes the
        // keyboard, so buttons seem to need two taps
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="px-5 pb-4 pt-4">
          <View className="items-center">
            <SalonLogo
              resizeMode="contain"
              style={{ width: 150, height: 85 }}
            />
          </View>

          <View className="mt-2 items-center">
            {/* One line on every iPhone: shrinks a little on narrow ones */}
            <Text
              className="text-3xl text-white font-psemibold text-center"
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              Create a new password
            </Text>
            <Text className="mt-2 text-center font-pregular text-sm text-gray-100">
              Enter your new password below after opening the recovery link from your email.
            </Text>
          </View>

          <FormField
            title="New Password"
            secret
            value={password}
            handleChangeText={setPassword}
            OtherStyles="mt-6"
            isRequired
            requiredReason="Your new password secures your account before you sign in again."
            placeholder="Enter your new password"
            hasError={showRequiredErrors && passwordMissing}
          />
          <PasswordStrengthMeter value={password} />

          <FormField
            title="Confirm Password"
            secret
            value={confirmPassword}
            handleChangeText={setConfirmPassword}
            OtherStyles="mt-5"
            isRequired
            requiredReason="We ask you to confirm your new password to avoid typos."
            placeholder="Confirm your new password"
            hasError={showRequiredErrors && confirmMissing}
          />

          <CustomButton
            title="Update Password"
            handlePress={submit}
            containerStyles="mt-7 w-full"
            isLoading={isSubmitting}
          />

          <Text className="mt-6 text-center font-pregular text-xs leading-5 text-gray-100">
            If this screen says the recovery link is required, open it directly from the password reset email again.
          </Text>
        </View>
      </ScrollView>
      </AvoidKeyboard>
    </SafeAreaView>
  );
};

export default ResetPassword;