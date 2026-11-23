import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { StyleSheet, View, Alert, ScrollView, Text, Image, TouchableOpacity } from 'react-native';
import type { StyleProp, TextStyle, ViewStyle } from 'react-native';
import { Session } from '@supabase/supabase-js';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AvoidKeyboard from './AvoidKeyboard';

import FormField from '../components/FormField';
import PhoneField, { isFullPhoneNumber } from '../components/PhoneField';
import InfoModal from '../components/InfoModal';
import ConfirmModal from '../components/ConfirmModal';
import { images } from '../constants';

// Replaces the @rneui/themed Button, which doesn't support the safe-area version Expo SDK 58 needs.
// Keeps the same layout and the same grey look while disabled.
function Button({
  title,
  onPress,
  disabled,
  buttonStyle,
  titleStyle,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  buttonStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      style={[styles.buttonBase, buttonStyle, disabled && styles.buttonDisabled]}
    >
      <Text style={[styles.buttonTitleBase, titleStyle, disabled && styles.buttonTitleDisabled]}>{title}</Text>
    </TouchableOpacity>
  );
}

export default function Account({ session }: { session: Session }) {
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  // The number as saved, so an untouched older number (e.g. "07700 900123")
  // can still be saved alongside a name change without being rejected.
  const [savedPhoneNumber, setSavedPhoneNumber] = useState('');
  const [showPhoneError, setShowPhoneError] = useState(false);
  const [showUpdatedModal, setShowUpdatedModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'none' | 'details' | 'final'>('none');
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
        setSavedPhoneNumber(data.phone_number ?? '');
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

      setSavedPhoneNumber(phone_number);
      setShowUpdatedModal(true);
    } catch (error) {
      if (error instanceof Error) {
        Alert.alert(error.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function deleteAccount() {
    try {
      setDeleting(true);

      const { error } = await supabase.rpc('delete_own_account');

      if (error) {
        throw error;
      }

      // The user row is gone, so this only clears the local session.
      await supabase.auth.signOut();
      setDeleteStep('none');
      router.replace('/');
    } catch (error) {
      setDeleteStep('none');
      if (error instanceof Error) {
        Alert.alert('Delete failed', error.message);
      }
    } finally {
      setDeleting(false);
    }
  }

  return (
  <SafeAreaView edges={['top']} className="flex-1 bg-primary" style={{ backgroundColor: '#161622' }}>
    <AvoidKeyboard>
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
      {/* The same field as sign-up, so the saved number shows with its flag
          and country code, and a new one is saved in the same +44… form */}
      <PhoneField
        value={phoneNumber}
        onChangePhone={setPhoneNumber}
        OtherStyles="mt-5"
        hasError={showPhoneError}
      />
      {showPhoneError && (
        <Text className="mt-2 font-pregular text-sm text-[#FF8A8A]">
          Enter your full phone number.
        </Text>
      )}

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={loading ? 'Loading ...' : 'Update'}
          onPress={() => {
            // A cleared field still reports its country code ("+44"), so a
            // changed number must be a whole one before it's saved
            if (phoneNumber !== savedPhoneNumber && !isFullPhoneNumber(phoneNumber)) {
              setShowPhoneError(true);
              return;
            }

            setShowPhoneError(false);
            updateProfile({
              first_name: firstName,
              last_name: lastName,
              phone_number: phoneNumber,
            });
          }}
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

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={deleting ? 'Deleting ...' : 'Delete Account'}
          onPress={() => setDeleteStep('details')}
          disabled={deleting}
          buttonStyle={styles.destructiveButton}
          titleStyle={styles.destructiveButtonText}
        />
        <Text className="mt-3 text-center font-pregular text-xs leading-5 text-gray-100">
          Deleting your account removes your details and enquiry history for good.
        </Text>
      </View>
    </View>
    </ScrollView>
    </AvoidKeyboard>

    <ConfirmModal
      visible={deleteStep === 'details'}
      title="Delete your account?"
      message="This cannot be undone. We will permanently remove:"
      bullets={[
        'Your name, email and phone number',
        'Your enquiry and message history',
        'Access to this account on every device',
      ]}
      confirmText="Delete"
      cancelText="Keep my account"
      onConfirm={() => setDeleteStep('final')}
      onCancel={() => setDeleteStep('none')}
    />

    <ConfirmModal
      visible={deleteStep === 'final'}
      title="Are you sure?"
      message="Your account will be deleted straight away and cannot be recovered."
      confirmText="Yes, delete my account"
      cancelText="Cancel"
      isLoading={deleting}
      onConfirm={() => void deleteAccount()}
      onCancel={() => setDeleteStep('none')}
    />

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
  buttonBase: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 8,
  },
  buttonDisabled: {
    backgroundColor: '#E3E6E8',
  },
  buttonTitleBase: {
    paddingVertical: 1,
    textAlign: 'center',
  },
  buttonTitleDisabled: {
    color: '#86939E',
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
  destructiveButton: {
    backgroundColor: 'transparent',
    borderColor: '#7F1D1D',
    borderRadius: 16,
    borderWidth: 1,
    minHeight: 56,
  },
  destructiveButtonText: {
    color: '#F87171',
    fontSize: 16,
    fontWeight: '600',
  },
});
