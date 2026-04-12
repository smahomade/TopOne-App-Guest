import { Alert, View, Text, ScrollView, Image } from 'react-native';
import React, { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { images } from '../../constants';
import FormField from '../../components/FormField';
import CustomButton from '../../components/CustomButton';
import { Link, router } from 'expo-router';
import { supabase } from '../../lib/supabase';

const SignUp = () => {
  const [form, setForm] = useState({
    firstName: '',
    lastName:'',
    phone: '',
    email: '',
    password: '',
  });

  const [isSubmitting, setisSubmitting] = useState(false);
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

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
      Alert.alert('Missing required details', 'First name, phone number, email, and password are required.');
      return;
    }

    setShowRequiredErrors(false);
    setisSubmitting(true);
    const { data: { user }, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: form.password,
    });

    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else if (user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: trimmedFirstName,
          last_name: form.lastName.trim(),
          phone_number: trimmedPhone,
          updated_at: new Date(),
        });

      if (profileError) {
        Alert.alert('Profile setup failed', profileError.message);
      } else {
        Alert.alert('Signup successful', 'Welcome to Top One!');
        router.push('/profile');
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

          <FormField
            title="First Name"
            value={form.firstName}
            handleChangeText={(value: string) => setForm({ ...form, firstName: value })}
            OtherStyles="mt-6"
            isRequired
            requiredReason="We need your name so we know who the account belongs to."
            placeholder="Enter your first name"
            hasError={showRequiredErrors && requiredFieldErrors.firstName}
          />

          <FormField
            title="Last Name"
            value={form.lastName}
            handleChangeText={(value: string) => setForm({ ...form, lastName: value })}
            OtherStyles="mt-5"
            placeholder="Optional"
          />

          <FormField
            title="Phone Number"
            value={form.phone}
            handleChangeText={(value: string) => setForm({ ...form, phone: value })}
            OtherStyles="mt-5"
            keyboardType="phone-pad"
            isRequired
            requiredReason="Your phone number helps us find you in our system faster."
            placeholder="Enter your phone number"
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
            requiredReason="Your password protects your account and booking information."
            placeholder="Create a password"
            hasError={showRequiredErrors && requiredFieldErrors.password}
          />

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
    </SafeAreaView>
  );
};

export default SignUp;
