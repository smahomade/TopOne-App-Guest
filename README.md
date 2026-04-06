# TopOne App Guest

Guest-facing mobile app for TopOne Salon, built with Expo Router and Supabase.

This app lets clients:
- browse salon updates from the admin app
- view services and build booking requests
- open booking conversations with admins
- browse collection images by year
- view salon location details
- manage their guest profile

## Features

- Supabase auth for guest sign in and sign up
- Realtime content syncing from admin-managed data
- Home banners with popup details
- Services flow with multi-service booking requests
- Messages inbox with booking-based conversations
- Collection grouped into yearly bundles
- Location cards with full popup details
- Dark mode UI across all main pages

## Tech Stack

- Expo
- React Native
- Expo Router
- TypeScript
- Supabase
- NativeWind / Tailwind-style classes

## Project Structure

```bash
app/
  (auth)/
  (extras)/
  (tabs)/
components/
constants/
hooks/
lib/
assets/
