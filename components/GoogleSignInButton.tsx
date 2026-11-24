import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { router } from 'expo-router';
import InfoModal from './InfoModal';
import { continueAfterSignIn, isGoogleSignInAvailable, signInWithGoogle } from '../lib/googleSignIn';

type GoogleSignInButtonProps = {
  /**
   * Where the customer goes when no booking request is waiting: 'home' from
   * the sign-in and sign-up screens, 'profile' to stay on the Profile tab.
   */
  returnTo: 'home' | 'profile';
  /** The "or" line: 'above' when the button sits under an email form, 'below' when it sits over one. */
  dividerPosition: 'above' | 'below';
  dividerText?: string;
  containerStyles?: string;
};

// Google's standard "G" mark, which its branding rules ask sign-in buttons to use.
const GoogleLogo = ({ size = 22 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </Svg>
);

const OrDivider = ({ text }: { text: string }) => (
  <View className="w-full flex-row items-center">
    <View style={{ flex: 1, height: 1, backgroundColor: '#D5CDC2' }} />
    <Text className="mx-3 text-sm text-muted font-pregular">{text}</Text>
    <View style={{ flex: 1, height: 1, backgroundColor: '#D5CDC2' }} />
  </View>
);

const GoogleSignInButton = ({ returnTo, dividerPosition, dividerText = 'or', containerStyles = '' }: GoogleSignInButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Not in Expo Go (no native module), on the web, or before the client IDs are set.
  if (!isGoogleSignInAvailable()) {
    return null;
  }

  const handlePress = async () => {
    setIsLoading(true);

    try {
      const result = await signInWithGoogle();

      if (result.status === 'cancelled') {
        return;
      }

      if (result.needsPhone) {
        if (returnTo === 'profile') {
          router.push({ pathname: '/add-phone', params: { next: 'profile' } });
        } else {
          router.replace('/add-phone');
        }
      } else {
        await continueAfterSignIn(returnTo === 'profile' ? null : '/home');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className={`w-full ${containerStyles}`}>
      {dividerPosition === 'above' && <OrDivider text={dividerText} />}

      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        disabled={isLoading}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
        accessibilityState={{ disabled: isLoading, busy: isLoading }}
        className={`rounded-xl min-h-[62px] w-full flex-row justify-center items-center ${dividerPosition === 'above' ? 'mt-5' : ''} ${isLoading ? 'opacity-50' : ''}`}
        // Google's light button colours.
        style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#747775' }}
      >
        <GoogleLogo />
        <Text className="ml-3 font-psemibold text-lg" style={{ color: '#1F1F1F' }}>
          Continue with Google
        </Text>
      </TouchableOpacity>

      {dividerPosition === 'below' && (
        <View className="mt-5">
          <OrDivider text={dividerText} />
        </View>
      )}

      <InfoModal
        visible={errorMessage !== null}
        title="Google sign-in failed"
        message={errorMessage ?? ''}
        onClose={() => setErrorMessage(null)}
      />
    </View>
  );
};

export default GoogleSignInButton;
