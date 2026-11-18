// Everything else lives in app.json; this file only adds the Google sign-in
// config plugin, which needs the iOS OAuth client ID.
//
// The plugin registers the reversed iOS client ID as a URL scheme, which the
// Google sign-in screen on iOS returns to. The ID comes from the environment
// (.env locally, EAS environment variables for cloud builds), like the
// Supabase keys. Without it the plugin is left out, and the app hides the
// Google button on iOS (see lib/googleSignIn.ts). Android needs no plugin
// options: Google matches the app by package name and signing certificate.

const GOOGLE_SIGNIN_PLUGIN = '@react-native-google-signin/google-signin';
const IOS_CLIENT_ID_SUFFIX = '.apps.googleusercontent.com';

module.exports = ({ config }) => {
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const plugins = (config.plugins ?? []).filter(
    (plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) !== GOOGLE_SIGNIN_PLUGIN,
  );

  if (iosClientId) {
    if (!iosClientId.endsWith(IOS_CLIENT_ID_SUFFIX)) {
      throw new Error(
        `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID should end with "${IOS_CLIENT_ID_SUFFIX}" (it's the iOS client ID from Google Cloud, not the web one).`,
      );
    }

    plugins.push([
      GOOGLE_SIGNIN_PLUGIN,
      { iosUrlScheme: `com.googleusercontent.apps.${iosClientId.slice(0, -IOS_CLIENT_ID_SUFFIX.length)}` },
    ]);
  }

  return { ...config, plugins };
};
