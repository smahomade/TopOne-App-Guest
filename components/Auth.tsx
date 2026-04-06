import React, { useState } from 'react'
import { Alert, StyleSheet, View, AppState, Text, Image, ScrollView } from 'react-native'
import { supabase } from '../lib/supabase'
import { Button, Input } from '@rneui/themed'
import { SafeAreaView } from 'react-native-safe-area-context'

import { images } from '../constants'

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

  const inputStyles = {
    autoCapitalize: 'none' as const,
    containerStyle: styles.inputWrapper,
    inputContainerStyle: styles.inputContainer,
    inputStyle: styles.inputText,
    labelStyle: styles.label,
    placeholderTextColor: '#7b7b8b',
  };

  // Login function
  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  // Signup function
  async function signUpWithEmail() {
    setLoading(true);
    
    const { data: { user }, error } = await supabase.auth.signUp({
      email: email,
      password: password,
      
    });
  
    if (error) {
      Alert.alert(error.message);
    } else if (user) {
      // Insert first and last name and phone number into the Users table
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, updated_at: new Date(), first_name:firstName, last_name:lastName, phone_number:phoneNumber});
  
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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.container}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.headerEyebrow}>Profile</Text>
              <Text style={styles.headerTitle}>{isSignup ? 'Create your account' : 'Sign in to your profile'}</Text>
            </View>
            <Image
              source={images.logoTopOneWhite}
              style={{ width: 140, height: 56 }}
              resizeMode="contain"
            />
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.eyebrow}>Guest Access</Text>
            <Text style={styles.title}>{isSignup ? 'Create your account' : 'Sign in to your profile'}</Text>
            <Text style={styles.subtitle}>
              Keep the guest experience in the same dark dashboard style while managing your account details.
            </Text>
          </View>

      {isSignup ? (
        <>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="First Name"
              leftIcon={{ type: 'font-awesome', name: 'user' }}
              onChangeText={(text) => setFirstName(text)}
              value={firstName}
              placeholder="Enter your first name"
              autoCapitalize="words"
              containerStyle={styles.inputWrapper}
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              labelStyle={styles.label}
              placeholderTextColor="#7b7b8b"
            />
          </View>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="Last Name"
              leftIcon={{ type: 'font-awesome', name: 'user' }}
              onChangeText={(text) => setLastName(text)}
              value={lastName}
              placeholder="Enter your last name"
              autoCapitalize="words"
              containerStyle={styles.inputWrapper}
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              labelStyle={styles.label}
              placeholderTextColor="#7b7b8b"
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Phone Number"
              leftIcon={{ type: 'font-awesome', name: 'phone' }}
              onChangeText={(text) => setPhoneNumber(text)}
              value={phoneNumber}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              containerStyle={styles.inputWrapper}
              inputContainerStyle={styles.inputContainer}
              inputStyle={styles.inputText}
              labelStyle={styles.label}
              placeholderTextColor="#7b7b8b"
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Email"
              leftIcon={{ type: 'font-awesome', name: 'envelope' }}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="email@address.com"
              {...inputStyles}
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Password"
              leftIcon={{ type: 'font-awesome', name: 'lock' }}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry={true}
              placeholder="Password"
              {...inputStyles}
            />
          </View>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Button title="Sign up" disabled={loading} onPress={signUpWithEmail} buttonStyle={styles.primaryButton} titleStyle={styles.primaryButtonText} />
          </View>
        </>
      ) : (
        <>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Input
              label="Email"
              leftIcon={{ type: 'font-awesome', name: 'envelope' }}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="email@address.com"
              {...inputStyles}
            />
          </View>
          <View style={styles.verticallySpaced}>
            <Input
              label="Password"
              leftIcon={{ type: 'font-awesome', name: 'lock' }}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry={true}
              placeholder="Password"
              {...inputStyles}
            />
          </View>
          <View style={[styles.verticallySpaced, styles.mt20]}>
            <Button title="Sign in" disabled={loading} onPress={signInWithEmail} buttonStyle={styles.primaryButton} titleStyle={styles.primaryButtonText} />
          </View>
        </>
      )}

      <View style={[styles.verticallySpaced, styles.mt20]}>
        <Button
          title={isSignup ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          onPress={() => setIsSignup(!isSignup)}
          buttonStyle={styles.secondaryButton}
          titleStyle={styles.secondaryButtonText}
        />
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
    marginBottom: 16,
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
  heroCard: {
    backgroundColor: '#1E1E2D',
    borderColor: '#232533',
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  eyebrow: {
    color: '#8ED1FC',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    color: '#ffffff',
    fontSize: 30,
    fontWeight: '600',
    marginTop: 12,
  },
  subtitle: {
    color: '#CDCDE0',
    fontSize: 14,
    lineHeight: 22,
    marginTop: 12,
  },
  inputWrapper: {
    paddingHorizontal: 0,
  },
  inputContainer: {
    backgroundColor: '#1E1E2D',
    borderBottomWidth: 0,
    borderColor: '#232533',
    borderRadius: 18,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  inputText: {
    color: '#ffffff',
    fontSize: 15,
  },
  label: {
    color: '#CDCDE0',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
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
    fontSize: 14,
    fontWeight: '600',
  },
});
