import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StyleSheet, View, Alert, ScrollView, Text, Image } from 'react-native';
import { Button } from '@rneui/themed';
import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import FormField from '../components/FormField';
import InfoModal from '../components/InfoModal';
import { images } from '../constants';

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showUpdatedModal, setShowUpdatedModal] = useState(false);
  const emailAddress = session.user.email ?? '';

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`first_name, last_name, phone_number`)
        .eq('id', session?.user.id)
        .single();
      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setFirstName(data.first_name ?? '');
        setLastName(data.last_name ?? '');
        setPhoneNumber(data.phone_number ?? '');
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile({
    first_name,
    last_name,
    phone_number,
  }: {
    first_name: string;
    last_name: string;
    phone_number: string;
  }) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session?.user.id,
        first_name,
        last_name,
        phone_number,
        username: session?.user.email ?? '',
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }

      setShowUpdatedModal(true);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
  <SafeAreaView edges={['top']} className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View style={styles.container}>
    <View style={styles.headerRow}>
      <View className="flex-1 pr-4">
        <Text className="text-sm text-gray-100 font-pregular">
          Profile
        </Text>
        <Text className="mt-1 text-2xl text-white font-psemibold">
          Your Account
        </Text>
        <Text className="mt-2 font-pregular text-sm text-gray-100">
          Update your account details below.
        </Text>
      </View>
      <Image
        source={images.logoTopOneWhite}
        style={{ width: 140, height: 56 }}
        resizeMode="contain"
      />
    </View>
      <FormField
        title="First Name"
        value={firstName}
        handleChangeText={setFirstName}
        placeholder="Enter your first name"
        OtherStyles="mt-5"
        titleColor="text-gray-100"
      />
       <FormField
        title="Last Name"
        value={lastName}
        handleChangeText={setLastName}
        placeholder="Enter your last name"
        OtherStyles="mt-5"
        titleColor="text-gray-100"
      />
      <View className="mt-5">
        <Text className="text-base font-pmedium text-gray-100">Email</Text>
        <View className="mt-2 w-full rounded-2xl border-2 border-black-200 bg-black-100 px-4 py-4">
          <Text className="font-psemibold text-base text-white">{emailAddress || 'No email available'}</Text>
        </View>
      </View>
      <FormField
        title="Phone Number"
        value={phoneNumber}
        handleChangeText={setPhoneNumber}
        placeholder="Enter your phone number"
        OtherStyles="mt-5"
        keyboardType="phone-pad"
        titleColor="text-gray-100"
      />

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={loading ? 'Loading ...' : 'Update'}
          onPress={() =>
            updateProfile({
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
            })
          }
          disabled={loading}
          buttonStyle={styles.primaryButton}
          titleStyle={styles.primaryButtonText}
        />
      </View>

      <View style={styles.verticallySpaced}>
      <Button
        title="Sign Out"
        onPress={async () => {
        await supabase.auth.signOut();
        router.replace('/');
        }}
        buttonStyle={styles.secondaryButton}
        titleStyle={styles.secondaryButtonText}
      />
      </View>
    </View>
    </ScrollView>

    <InfoModal
      visible={showUpdatedModal}
      title="Profile updated"
      message="Your account details have been saved."
      onClose={() => setShowUpdatedModal(false)}
    />
   </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  primaryButton: {
    backgroundColor: '#8ED1FC',
    borderRadius: 16,
    minHeight: 56,
  },
  primaryButtonText: {
    color: '#161622',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: '#1E1E2D',
    borderColor: '#232533',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 56,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
