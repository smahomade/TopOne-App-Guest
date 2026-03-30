import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StyleSheet, View, Alert, ScrollView, SafeAreaView,Text } from 'react-native';
import { Button } from '@rneui/themed';
import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import FormField from '../components/FormField'; 

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  useEffect(() => {
    if (session) getProfile();
  }, [session]);

  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const { data, error, status } = await supabase
        .from('profiles')
        .select(`username, first_name, last_name, phone_number`)
        .eq('id', session?.user.id)
        .single();
      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setUsername(data.username);
        setFirstName(data.first_name);
        setLastName(data.last_name);
        setPhoneNumber(data.phone_number);
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
    username,
    first_name,
    last_name,
    phone_number,
  }: {
    username: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  }) {
    try {
      setLoading(true);
      if (!session?.user) throw new Error('No user on the session!');

      const updates = {
        id: session?.user.id,
        username,
        first_name,
        last_name,
        phone_number,
        updated_at: new Date(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);

      if (error) {
        throw error;
      }
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
  <SafeAreaView className="">
    <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
    <View style={styles.container}>
    <View className="flex-1 justify-center items-center px-4 pb-8">
      <Text className="text-2xl text-black font-psemibold">
            Profile
      </Text>
      </View>
      <FormField
        title="First Name"
        value={firstName}
        handleChangeText={setFirstName}
        placeholder="Enter your first name"
        OtherStyles="mt-5"
        titleColor="text-black"
      />
       <FormField
        title="Last Name"
        value={lastName}
        handleChangeText={setLastName}
        placeholder="Enter your last name"
        OtherStyles="mt-5"
        titleColor="text-black"
      />
      <FormField 
        title="Username"
        value={username}
        handleChangeText={setUsername}
        placeholder="Enter your username"
        OtherStyles="mt-5 text-black"
         titleColor="text-black"
      />
      <FormField
        title="Phone Number"
        value={phoneNumber}
        handleChangeText={setPhoneNumber}
        placeholder="Enter your phone number"
        OtherStyles="mt-5"
        keyboardType="phone-pad"
        titleColor="text-black"
      />

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={loading ? 'Loading ...' : 'Update'}
          onPress={() =>
            updateProfile({
              username,
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
            })
          }
          disabled={loading}
        />
      </View>

      <View style={styles.verticallySpaced}>
      <Button
        title="Sign Out"
        onPress={async () => {
        await supabase.auth.signOut();
        router.replace('/');
        }}
      />
      </View>
    </View>
    </ScrollView>
   </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 40,
    padding: 12,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
});
