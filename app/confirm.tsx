import { useEffect } from 'react'
import { View, Text, ActivityIndicator } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { supabase } from '../lib/supabase'

export default function Confirm() {
  const params = useLocalSearchParams()

  useEffect(() => {
    const handleConfirmation = async () => {
      const accessToken = params.access_token as string
      const refreshToken = params.refresh_token as string

      if (accessToken && refreshToken) {
        const { data: { session }, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (session) {
          router.replace('/profile')
        } else {
          router.replace('/sign-in')
        }
      } else {
        router.replace('/sign-in')
      }
    }

    handleConfirmation()
  }, [])

  return (
    <View style={{ flex: 1, backgroundColor: '#161622', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#8ED1FC" />
      <Text style={{ color: '#CBD5E1', marginTop: 16, fontFamily: 'Poppins-Regular' }}>
        Confirming your email...
      </Text>
    </View>
  )
}