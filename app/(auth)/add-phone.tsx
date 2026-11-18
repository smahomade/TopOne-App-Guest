import { BackHandler, Image, ScrollView, Text, View } from 'react-native'
import React, { useCallback, useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { images } from '../../constants'
import PhoneField from '../../components/PhoneField'
import CustomButton from '../../components/CustomButton'
import InfoModal from '../../components/InfoModal'
import { supabase } from '../../lib/supabase'
import { releasePendingBooking } from '../../lib/pendingBooking'
import { continueAfterSignIn, savePhoneNumber } from '../../lib/googleSignIn'

// Shown after a Google sign-in when the profile has no phone number. Google
// doesn't share it, and the salon needs it to confirm bookings. Once it's
// saved, the profile has one and this screen doesn't come up again.

// PhoneField reports the country code plus the digits typed, e.g. +447700900123.
const FULL_NUMBER = /^\+\d{8,15}$/

const AddPhone = () => {
  // 'profile' when Google sign-in started on the Profile tab.
  const { next } = useLocalSearchParams<{ next?: string }>()
  const [phone, setPhone] = useState('')
  const [showRequiredError, setShowRequiredError] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Leaving is by "Continue" or "Use a different account". The back button
  // would leave a signed-in customer with no number, and the Messages tab
  // would then send a waiting booking request without one.
  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener('hardwareBackPress', () => true)
      return () => subscription.remove()
    }, [])
  )

  const save = async () => {
    if (!FULL_NUMBER.test(phone)) {
      setShowRequiredError(true)
      return
    }

    setShowRequiredError(false)
    setIsSaving(true)

    try {
      await savePhoneNumber(phone)

      if (next === 'profile') {
        // Back to the Profile tab underneath, which now shows the account.
        const sendingBooking = await continueAfterSignIn(null)

        if (!sendingBooking && router.canGoBack()) {
          router.back()
        } else if (!sendingBooking) {
          router.replace('/profile')
        }
      } else {
        await continueAfterSignIn('/home')
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const switchAccount = async () => {
    // A saved booking request stays saved for whoever signs in next.
    releasePendingBooking()
    await supabase.auth.signOut()

    if (next === 'profile' && router.canGoBack()) {
      router.back()
    } else {
      router.replace('/sign-in')
    }
  }

  return (
    <SafeAreaView className="bg-primary h-full">
      <ScrollView
        bounces={false}
        alwaysBounceVertical={false}
        overScrollMode="never"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1 }}
      >
        <View className="flex-1 justify-center items-center px-4">
          <Image
            source={images.logoTopOneWhite}
            resizeMode="contain"
            className="w-[150px] h-[85px]"
          />
        </View>

        <View className="flex-1 justify-center px-4 pb-14">
          <Text className="text-2xl text-white font-psemibold text-center mt-4">
            Add your phone number
          </Text>
          <Text className="mt-2 text-center font-pregular text-sm text-gray-100">
            The salon uses it to confirm your bookings. Google doesn't share it with us.
          </Text>

          <PhoneField
            value={phone}
            onChangePhone={setPhone}
            OtherStyles="mt-7"
            hasError={showRequiredError}
          />
          {showRequiredError && (
            <Text className="mt-2 font-pregular text-sm text-[#FF8A8A]">
              Enter your full phone number.
            </Text>
          )}

          <CustomButton
            title="Continue"
            handlePress={save}
            containerStyles="mt-7 w-full"
            isLoading={isSaving}
          />

          <View className="justify-center pt-5 flex-row gap-2">
            <Text className="text-base text-gray-100 font-pregular">
              Not you?
            </Text>
            <Text
              className="text-base font-psemibold text-secondary underline"
              onPress={switchAccount}
            >
              Use a different account
            </Text>
          </View>
        </View>
      </ScrollView>

      <InfoModal
        visible={saveError !== null}
        title="Couldn't save your number"
        message={saveError ?? ''}
        onClose={() => setSaveError(null)}
      />
    </SafeAreaView>
  )
}

export default AddPhone
