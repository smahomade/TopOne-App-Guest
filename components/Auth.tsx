import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Image, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import { images } from '../constants'
import FormField from './FormField'
import CustomButton from './CustomButton'
import PhoneField from './PhoneField'
import PasswordStrengthMeter from './PasswordStrengthMeter'

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

const rules = [
  (v: string) => v.length >= 8,
  (v: string) => /[A-Z]/.test(v),
  (v: string) => /[0-9]/.test(v),
  (v: string) => /[^A-Za-z0-9]/.test(v),
]

const getScore = (value: string): number => {
  return rules.filter(r => r(value)).length
}

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [showRequiredErrors, setShowRequiredErrors] = useState(false)

  const signUpFieldErrors = {
    email: email.trim().length === 0,
    firstName: firstName.trim().length === 0,
    password: password.length === 0,
    phoneNumber: phoneNumber.trim().length === 0,
  }

  const signInFieldErrors = {
    email: email.trim().length === 0,
    password: password.length === 0,
  }

  async function signInWithEmail() {
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail || !password) {
      setShowRequiredErrors(true)
      Alert.alert('Missing required details', 'Email and password are required.')
      return
    }

    setShowRequiredErrors(false)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (!trimmedFirstName || !phoneNumber || !trimmedEmail || !password) {
      setShowRequiredErrors(true)
      Alert.alert('Missing required details', 'First name, phone number, email, and password are required.')
      return
    }

    if (getScore(password) < 3) {
      Alert.alert('Weak password', 'Please choose a stronger password. Try adding an uppercase letter, a number, or a special character.')
      return
    }

    setShowRequiredErrors(false)
    setLoading(true)

    const { data: { user, session }, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          phone_number: phoneNumber,
        },
      },
    })

    if (error) {
      Alert.alert('Sign up failed', error.message)
    } else if (user && session) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          first_name: trimmedFirstName,
          last_name: trimmedLastName,
          phone_number: phoneNumber,
          username: trimmedEmail,
          updated_at: new Date(),
        })

      if (profileError) {
        Alert.alert('Profile setup failed', profileError.message)
      }
    } else if (user && !session) {
      Alert.alert(
        'Confirm your email',
        'A confirmation link has been sent to your email. Please verify it to complete sign up.'
      )
    }

    setLoading(false)
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
              <Text style={styles.headerTitle}>
                {isSignup ? 'Create your account' : 'Sign in to your profile'}
              </Text>
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
              {/* First Name + Last Name side by side */}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <View style={{ flex: 1 }}>
                  <FormField
                    title="First Name"
                    value={firstName}
                    handleChangeText={setFirstName}
                    placeholder="First name"
                    isRequired
                    requiredReason="We need your name so we know who the account belongs to."
                    hasError={showRequiredErrors && signUpFieldErrors.firstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    title="Last Name"
                    value={lastName}
                    handleChangeText={setLastName}
                    placeholder="Last name"
                  />
                </View>
              </View>

              <PhoneField
                value={phoneNumber}
                onChangePhone={setPhoneNumber}
                OtherStyles="mt-4"
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
                placeholder="Create a password"
                OtherStyles="mt-4"
                isRequired
                requiredReason={`A strong password should have:\n• At least 8 characters\n• An uppercase letter (A–Z)\n• A number (0–9)\n• A special character (!@#$...)`}
                hasError={showRequiredErrors && signUpFieldErrors.password}
              />
              <PasswordStrengthMeter value={password} />

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
            <Text
              style={styles.switchAction}
              onPress={() => {
                setShowRequiredErrors(false)
                setIsSignup(!isSignup)
              }}
            >
              {isSignup ? 'Sign In' : 'Sign Up'}
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
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
})