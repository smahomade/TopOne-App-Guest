import { Stack } from 'expo-router';
import React from 'react';
import { StatusBar } from 'expo-status-bar';

const ExtrasLayout = () => {
  return (
    <>
      <Stack>
        <Stack.Screen
          name="location"
          options={{ headerShown: false }}
        />
      </Stack>
      <StatusBar backgroundColor="#161622" style="light" />
    </>
  );
};

export default ExtrasLayout;
