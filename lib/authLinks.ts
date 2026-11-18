// Supabase returns auth tokens in the URL fragment (implicit flow), which
// expo-router's useLocalSearchParams does not read. Parse the fragment first
// and fall back to the query string.
export function extractTokens(url: string) {
  const fragment = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1].split('#')[0] : '';
  const params = new URLSearchParams(fragment || query);

  return {
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
    type: params.get('type'),
    // Supabase returns these instead of tokens when a link is dead - expired,
    // already used, or the account behind it no longer exists.
    error: params.get('error'),
    errorCode: params.get('error_code'),
    errorDescription: params.get('error_description'),
  };
}
