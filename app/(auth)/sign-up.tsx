import { Alert, View, Text, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';
import PasswordStrengthMeter from '../../components/PasswordStrengthMeter';
import PhoneField from '../../components/PhoneField';
import InfoModal from '../../components/InfoModal';

const rules = [
  (v: string) => v.length >= 8,
  (v: string) => /[A-Z]/.test(v),
  (v: string) => /[0-9]/.test(v),
  (v: string) => /[^A-Za-z0-9]/.test(v),
];

const getScore = (value: string): number => {
  const passed = rules.filter(r => r(value)).length;
  if (!value || passed <= 1) return 0;
  if (passed === 2) return 1;
  if (passed === 3) return 2;
  return 3;
};

const SignUp = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    password: '',
  });

  const [isSubmitting, setisSubmitting] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);
  const [showConfirmEmailModal, setShowConfirmEmailModal] = useState(false);
  const [showExistingAccountModal, setShowExistingAccountModal] = useState(false);

  const requiredFieldErrors = {
    email: form.email.trim().length === 0,
    firstName: form.firstName.trim().length === 0,
    password: form.password.length === 0,
    phone: form.phone.trim().length === 0,
  };

  const submit = async () => {
    const trimmedFirstName = form.firstName.trim();
    const trimmedPhone = form.phone.trim();
    const trimmedEmail = form.email.trim().toLowerCase();

    if (!trimmedFirstName || !trimmedPhone || !trimmedEmail || !form.password) {
      setShowRequiredErrors(true);
      return;
    }

    if (getScore(form.password) < 2) {
      Alert.alert('Weak password', 'Please choose a stronger password. Try adding an uppercase letter, a number, or a special character.');
      return;
    }

    setShowRequiredErrors(false);
    setisSubmitting(true);

const { data: { user, session }, error } = await supabase.auth.signUp({
  email: trimmedEmail,
  password: form.password,
  options: {
    emailRedirectTo: 'aora://confirm',
    data: {
      first_name: trimmedFirstName,
      last_name: form.lastName.trim(),
      phone_number: trimmedPhone,
    },
  },
})

    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else if (user && session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: trimmedFirstName,
          last_name: form.lastName.trim(),
          phone_number: trimmedPhone,
          username: trimmedEmail,
          updated_at: new Date(),
        });

      if (profileError) {
        Alert.alert('Profile setup failed', profileError.message);
      } else {
        Alert.alert('Signup successful', 'Welcome to Top One!');
        router.push('/profile');
      }
    } else if (user && !session) {
      if (user.identities && user.identities.length === 0) {
        setShowExistingAccountModal(true);
      } else {
        setShowConfirmEmailModal(true);
      }
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
              Create your account
            </Text>
            <Text className="mt-2 text-center font-pregular text-sm text-gray-100">
              Fill in your details to book appointments.
            </Text>
          </View>

          {/* First Name + Last Name side by side */}
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
            <View style={{ flex: 1 }}>
              <FormField
                title="First Name"
                value={form.firstName}
                handleChangeText={(value: string) => setForm({ ...form, firstName: value })}
                isRequired
                requiredReason="We need your name so we know who the account belongs to."
                placeholder="First name"
                hasError={showRequiredErrors && requiredFieldErrors.firstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                title="Last Name"
                value={form.lastName}
                handleChangeText={(value: string) => setForm({ ...form, lastName: value })}
                placeholder="Last name"
              />
            </View>
          </View>

<PhoneField
  value={form.phone}
  onChangePhone={(full) => setForm({ ...form, phone: full })}
  OtherStyles="mt-5"
  hasError={showRequiredErrors && requiredFieldErrors.phone}
/>

          <FormField
            title="Email"
            value={form.email}
            handleChangeText={(value: string) => setForm({ ...form, email: value })}
            OtherStyles="mt-5"
            keyboardType="email-address"
            isRequired
            requiredReason="Your email is your username for signing in to the app."
            placeholder="Enter your email"
            hasError={showRequiredErrors && requiredFieldErrors.email}
          />

          <FormField
            title="Password"
            value={form.password}
            handleChangeText={(value: string) => setForm({ ...form, password: value })}
            OtherStyles="mt-5"
            isRequired
            requiredReason={`A strong password should have:\n• At least 8 characters\n• An uppercase letter (A–Z)\n• A number (0–9)\n• A special character (!@#$...)`}
            placeholder="Create a password"
            hasError={showRequiredErrors && requiredFieldErrors.password}
          />
          <PasswordStrengthMeter value={form.password} />

          <CustomButton
            title="Sign Up"
            handlePress={submit}
            containerStyles="mt-7 w-full"
            isLoading={isSubmitting}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-base text-gray-100 font-pregular">
              Have an account already?
            </Text>
            <Link href="/sign-in" className="text-base font-psemibold text-secondary underline">
              Sign in
            </Link>
          </View>
        </View>
      </ScrollView>

      <InfoModal
        visible={showConfirmEmailModal}
        title="Confirm your email"
        message="A confirmation link has been sent to your email. Please verify it to complete sign up."
        onClose={() => setShowConfirmEmailModal(false)}
      />

      <InfoModal
        visible={showExistingAccountModal}
        title="Account already exists"
        message="An account with this email already exists. Try signing in instead."
        buttonText="Go to Sign In"
        onClose={() => {
          setShowExistingAccountModal(false);
          router.push('/sign-in');
        }}
      />
    </SafeAreaView>
  );
};

export default SignUp;