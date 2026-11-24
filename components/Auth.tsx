import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Image, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { SafeAreaView } from 'react-native-safe-area-context'
import AvoidKeyboard from './AvoidKeyboard'
import { images } from '../constants'
import FormField from './FormField'
import CustomButton from './CustomButton'
import PhoneField, { isFullPhoneNumber } from './PhoneField'
import PasswordStrengthMeter from './PasswordStrengthMeter'
import InfoModal from './InfoModal'
import GoogleSignInButton from './GoogleSignInButton'
import TextLink from './TextLink'
import SalonLogo from './SalonLogo';

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
  const [showConfirmEmailModal, setShowConfirmEmailModal] = useState(false)
  const [showExistingAccountModal, setShowExistingAccountModal] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const signUpFieldErrors = {
    email: email.trim().length === 0,
    firstName: firstName.trim().length === 0,
    password: password.length === 0,
    // A field typed in and then cleared still reports its country code
    // ("+44"), so it must be a whole number, not just something
    phoneNumber: !isFullPhoneNumber(phoneNumber.trim()),
  }

  const signInFieldErrors = {
    email: email.trim().length === 0,
    password: password.length === 0,
  }

  async function signInWithEmail() {
    const trimmedEmail = email.trim().toLowerCase()

    if (!trimmedEmail || !password) {
      setShowRequiredErrors(true)
      return
    }

    setShowRequiredErrors(false)
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: trimmedEmail,
      password,
    })

    if (error) setLoginError(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    const trimmedEmail = email.trim().toLowerCase()
    const trimmedFirstName = firstName.trim()
    const trimmedLastName = lastName.trim()

    if (!trimmedFirstName || signUpFieldErrors.phoneNumber || !trimmedEmail || !password) {
      setShowRequiredErrors(true)
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
    emailRedirectTo: 'topone://confirm',
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
      if (user.identities && user.identities.length === 0) {
        setShowExistingAccountModal(true)
      } else {
        setShowConfirmEmailModal(true)
      }
    }

    setLoading(false)
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <AvoidKeyboard>
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        // Without this, a tap while the keyboard is open only closes the
        // keyboard, so buttons and links seem to need two taps
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>Profile</Text>
              {/* Kept short so it stays on one line beside the logo, even on small iPhones */}
              <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
                {isSignup ? 'Create account' : 'Sign in'}
              </Text>
              <Text style={styles.accessText}>
                Current access: <Text style={styles.accessValue}>Guest Access</Text>
              </Text>
            </View>
            <SalonLogo
              style={{ width: 140, height: 56 }}
              resizeMode="contain"
            />
          </View>

          {isSignup ? (
            <>
              <GoogleSignInButton
                returnTo="profile"
                dividerPosition="below"
                dividerText="or sign up with email"
                containerStyles="mt-5"
              />

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
              {showRequiredErrors && signUpFieldErrors.phoneNumber && (
                <Text className="mt-2 font-pregular text-sm text-[#B3261E]">
                  Enter your full phone number.
                </Text>
              )}

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

              <GoogleSignInButton returnTo="profile" dividerPosition="above" containerStyles="mt-5" />
            </>
          )}

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              {isSignup ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TextLink
              label={isSignup ? 'Sign In' : 'Sign Up'}
              sizeClassName="text-sm"
              onPress={() => {
                setShowRequiredErrors(false)
                setIsSignup(!isSignup)
              }}
            />
          </View>
        </View>
      </ScrollView>
      </AvoidKeyboard>

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
          setShowExistingAccountModal(false)
          setShowRequiredErrors(false)
          setIsSignup(false)
        }}
      />

      <InfoModal
        visible={loginError !== null}
        title="Login failed"
        message={loginError ?? ''}
        onClose={() => setLoginError(null)}
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#F4F1EC',
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  container: {
    backgroundColor: '#F4F1EC',
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
    color: '#6B635A',
    fontSize: 13,
  },
  headerTitle: {
    color: '#1A1817',
    fontFamily: 'PlayfairDisplay-SemiBold',
    fontSize: 27,
    marginTop: 4,
  },
  accessText: {
    color: '#1A1817',
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
  },
  accessValue: {
    color: '#1A1817',
  },
  switchRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
  },
  switchLabel: {
    color: '#6B635A',
    fontFamily: 'DMSans-Regular',
    fontSize: 14,
  },
})