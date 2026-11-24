import React from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'

// Shrinks what it wraps to the space above the keyboard, so the keyboard never
// covers the field being typed in. The app draws edge to edge, so Android no
// longer moves the screen up for the keyboard by itself.
//
// Form pages use FormScrollView, which wraps itself in this on Android only
// (on iPhone its ScrollView handles the keyboard). Pop-ups with a centred card,
// like ConfirmModal, use this directly on both.
const AvoidKeyboard = ({ children }: { children: React.ReactNode }) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {children}
  </KeyboardAvoidingView>
)

export default AvoidKeyboard
