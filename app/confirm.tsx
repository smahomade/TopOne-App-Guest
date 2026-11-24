import { useEffect, useState } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import * as Linking from 'expo-linking'
import { router } from 'expo-router'
import { supabase } from '../lib/supabase'
import { extractTokens } from '../lib/authLinks'
import CustomButton from '../components/CustomButton'

const DEAD_LINK_MESSAGE =
  'This confirmation link is no longer valid. It may have expired, already been used, or the account it belonged to was deleted. Please sign up again to create a new account.'

const GENERIC_MESSAGE =
  'We could not confirm your email from this link. Please try the link in your email again, or sign up to create a new account.'

export default function Confirm() {
  const [failureMessage, setFailureMessage] = useState<string | null>(null)

  useEffect(() => {
    let handled = false

    const fail = (message: string) => {
      handled = true
      setFailureMessage(message)
    }

    const handleConfirmation = async (url: string | null) => {
      if (handled || !url) {
        return
      }

      const { accessToken, refreshToken, error, errorCode } = extractTokens(url)

      if (error || errorCode) {
        // access_denied / otp_expired both mean the link itself is spent.
        fail(
          error === 'access_denied' || errorCode === 'otp_expired'
            ? DEAD_LINK_MESSAGE
            : GENERIC_MESSAGE
        )
        return
      }

      if (!accessToken || !refreshToken) {
        return
      }

      handled = true

      const { data: { session } } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })

      if (session) {
        router.replace('/profile')
      } else {
        setFailureMessage(GENERIC_MESSAGE)
      }
    }

    // The link may have cold-started the app, or arrived while it was open.
    void Linking.getInitialURL().then(handleConfirmation)

    const subscription = Linking.addEventListener('url', ({ url }) => {
      void handleConfirmation(url)
    })

    // Nothing usable arrived - explain rather than spin forever.
    const timeout = setTimeout(() => {
      if (!handled) {
        fail(GENERIC_MESSAGE)
      }
    }, 5000)

    return () => {
      clearTimeout(timeout)
      subscription.remove()
    }
  }, [])

  if (failureMessage) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F4F1EC', justifyContent: 'center', paddingHorizontal: 24 }}>
        <Text className="text-center text-[28px] text-ink font-display">
          Link no longer valid
        </Text>
        <Text className="mt-4 text-center font-pregular text-base leading-6 text-muted">
          {failureMessage}
        </Text>
        <CustomButton
          title="Sign Up"
          handlePress={() => router.replace('/sign-up')}
          containerStyles="mt-8 w-full"
        />
        <CustomButton
          title="Back to Sign In"
          handlePress={() => router.replace('/sign-in')}
          containerStyles="mt-3 w-full border border-ink"
          backgroundColor="#FFFFFF"
          textColor="#1A1817"
        />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F1EC', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#1A1817" />
      <Text style={{ color: '#3F3A35', marginTop: 16, fontFamily: 'DMSans-Regular' }}>
        Confirming your email...
      </Text>
    </View>
  )
}
