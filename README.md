# Top One Guest App

## About

Top One Guest App is the customer-facing mobile app for the Top One salon system.

This app works alongside the Top One Admin App. The admin app is responsible for managing salon content and operational data, while this guest app consumes that data from Supabase and presents it to customers in a read-focused experience.

In practice, that means:

- content created or updated in the admin app can appear in this app
- customers can browse banners, collections, services, and locations
- customers can build service selections and send booking requests
- booking requests open message conversations that admins can continue manually

The admin app handles full CRUD behaviour. This guest app is primarily designed to read shared data and support customer communication.

## What This App Is For

The purpose of this app is to help customers explore the salon and contact the store owner or admin team for manual booking.

Customers can:

- browse salon updates from the home page
- view service categories and choose services
- create a booking request from selected services
- open message conversations with the admin team
- browse collection images grouped by year
- view salon location information
- manage their account details

## How To Run

1. Clone or download the repository.
2. Install dependencies.

```bash
npm install
```

3. Add the required Supabase environment variables.
4. Start the Expo development server.

```bash
npx expo start
```

5. Run the app in one of the supported environments:

- Android Emulator
- iOS Simulator through Xcode
- Expo Go if needed for testing

## Environment Setup

This project requires Supabase connection details in your environment configuration.

Add the following values:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Without these values, the app cannot authenticate users or load shared content.

## Supabase Requirements

The app depends on Supabase tables being available.

Minimum tables required:

- `banners`
- `collections` or the gallery table used by the admin app
- `locations`
- `messages`
- `profiles`
- `services`

Some features also expect certain fields to exist. Examples include:

- `messages.conversation_id` for grouping booking conversations
- `banners.long_description` for detailed banner popups
- location detail fields such as `address_line_1`, `address_line_2`, `postcode`, `country`, `phone`, `email`, and `opening_hours`

## Booking Flow

The booking flow is intentionally manual from the admin side.

1. A customer opens the Services tab.
2. They choose one or more services.
3. They submit the selection as a booking request.
4. The app creates a new conversation in the Messages section.
5. The admin or store owner can continue the booking manually inside that conversation.

This approach keeps service selection simple for customers while still allowing the salon to confirm appointments directly.

## Notes For Developers

- This is an Expo Router project using file-based routing.
- Shared content is fetched from Supabase and updated in the guest app based on admin-side changes.
- The app is designed around a dark UI and a read-focused customer experience.
- If database schema changes are introduced in the admin app, the guest app may also need updates to its Supabase mapping logic.

## Summary

Top One Guest App exists to give customers a polished mobile experience while keeping the business workflow controlled through the admin app and Supabase.

It is best understood as the client-facing side of a two-app system:

- Admin App: manages content and operations
- Guest App: displays that content and helps customers start bookings and conversations
