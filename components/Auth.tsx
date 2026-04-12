import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Image, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'

import { images } from '../constants'
import FormField from './FormField'
import CustomButton from './CustomButton'

// Tells Supabase Auth to continuously refresh the session automatically if
// the app is in the foreground. When this is added, you will continue to receive
// `onAuthStateChange` events with the `TOKEN_REFRESHED` or `SIGNED_OUT` event
// if the user's session is terminated. This should only be registered once.
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  // State variables for login/signup fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');  // First Name for signup
  const [lastName, setLastName] = useState('');  // Last Name for signup
  const [phoneNumber, setPhoneNumber] = useState('');  // Phone Number for signup
  const [loading, setLoading] = useState(false);
  const [isSignup, setIsSignup] = useState(false); // Toggle between login and signup
  const [showRequiredErrors, setShowRequiredErrors] = useState(false);

  const signUpFieldErrors = {
    email: email.trim().length === 0,
    firstName: firstName.trim().length === 0,
    password: password.length === 0,
    phoneNumber: phoneNumber.trim().length === 0,
  };

  const signInFieldErrors = {
    email: email.trim().length === 0,
    password: password.length === 0,
  };

  // Login function
  async function signInWithEmail() {
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setShowRequiredErrors(true);
      Alert.alert('Missing required details', 'Email and password are required.');
      return;
    }

    setShowRequiredErrors(false);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  // Signup function
  async function signUpWithEmail() {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedPhoneNumber = phoneNumber.trim();

    if (!trimmedFirstName || !trimmedPhoneNumber || !trimmedEmail || !password) {
      setShowRequiredErrors(true);
      Alert.alert('Missing required details', 'First name, phone number, email, and password are required.');
      return;
    }

    setShowRequiredErrors(false);
    setLoading(true);
    
    const { data: { user }, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password: password,
      
    });
  
    if (error) {
      Alert.alert(error.message);
    } else if (user) {
      // Insert first and last name and phone number into the Users table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, updated_at: new Date(), first_name:trimmedFirstName, last_name:trimmedLastName, phone_number:trimmedPhoneNumber});
  
      if (profileError) {
        console.log('Profile Insert Error:', profileError);
      } else {
        console.log('Profile Insert Success');
      }
    }
  
    setLoading(false);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>Profile</Text>
              <Text style={styles.headerTitle}>{isSignup ? 'Create your account' : 'Sign in to your profile'}</Text>
              <Text style={styles.accessText}>
                Current access: <Text style={styles.accessValue}>Guest Access</Text>
              </Text>
            </View>
            <Image
              source={images.logoTopOneWhite}
              style={{ width: 140, height: 56 }}
              resizeMode="contain"
            />
          </View>

      {isSignup ? (
        <>
          <FormField
            title="First Name"
            value={firstName}
            handleChangeText={setFirstName}
            placeholder="Enter your first name"
            OtherStyles="mt-5"
            isRequired
            requiredReason="We need your name so we know who the account belongs to."
            hasError={showRequiredErrors && signUpFieldErrors.firstName}
          />
          <FormField
            title="Last Name"
            value={lastName}
            handleChangeText={setLastName}
            placeholder="Enter your last name"
            OtherStyles="mt-4"
          />
          <FormField
            title="Phone Number"
            value={phoneNumber}
            handleChangeText={setPhoneNumber}
            placeholder="Enter your phone number"
            keyboardType="phone-pad"
            OtherStyles="mt-4"
            isRequired
            requiredReason="Your phone number helps us find you in our system faster."
            hasError={showRequiredErrors && signUpFieldErrors.phoneNumber}
          />
          <FormField
            title="Email"
            value={email}
            handleChangeText={setEmail}
            placeholder="email@address.com"
            keyboardType="email-address"
            OtherStyles="mt-4"
            isRequired
            requiredReason="Your email is your username for signing in to the app."
            hasError={showRequiredErrors && signUpFieldErrors.email}
          />
          <FormField
            title="Password"
            value={password}
            handleChangeText={setPassword}
            placeholder="Password"
            OtherStyles="mt-4"
            isRequired
            requiredReason="Your password protects your account and booking information."
            hasError={showRequiredErrors && signUpFieldErrors.password}
          />
          <CustomButton
            title="Sign up"
            handlePress={signUpWithEmail}
            containerStyles="mt-6 w-full"
            isLoading={loading}
          />
        </>
      ) : (
        <>
          <FormField
            title="Email"
            value={email}
            handleChangeText={setEmail}
            placeholder="email@address.com"
            keyboardType="email-address"
            OtherStyles="mt-5"
            isRequired
            requiredReason="Your email is your username for signing in to the app."
            hasError={showRequiredErrors && signInFieldErrors.email}
          />
          <FormField
            title="Password"
            value={password}
            handleChangeText={setPassword}
            placeholder="Password"
            OtherStyles="mt-4"
            isRequired
            requiredReason="Your password protects your account and booking information."
            hasError={showRequiredErrors && signInFieldErrors.password}
          />
          <CustomButton
            title="Sign in"
            handlePress={signInWithEmail}
            containerStyles="mt-6 w-full"
            isLoading={loading}
          />
        </>
      )}

      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}
        </Text>
        <Text style={styles.switchAction} onPress={() => {
          setShowRequiredErrors(false);
          setIsSignup(!isSignup);
        }}>
          {isSignup ? 'Sign In' : 'Sign Up'}
        </Text>
      </View>
    </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#161622',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    backgroundColor: '#161622',
    flex: 1,
    padding: 16,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerCopy: {
    flex: 1,
    paddingRight: 16,
  },
  headerEyebrow: {
    color: '#CDCDE0',
    fontSize: 13,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '600',
    marginTop: 4,
  },
  accessText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  accessValue: {
    color: '#8ED1FC',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 20,
  },
  switchLabel: {
    color: '#CDCDE0',
    fontFamily: 'Poppins-Regular',
    fontSize: 14,
  },
  switchAction: {
    color: '#8ED1FC',
    fontFamily: 'Poppins-SemiBold',
    fontSize: 14,
  },
});
