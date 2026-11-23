import React from 'react'
import { KeyboardAvoidingView, Platform } from 'react-native'

// Goes around a form screen's ScrollView so the keyboard never covers the
// field being typed in. The app draws edge to edge, so Android no longer moves
// the screen up for the keyboard by itself. This shrinks the screen to the
// space above the keyboard instead, and the ScrollView can then be scrolled to
// the fields and buttons further down.
const AvoidKeyboard = ({ children }: { children: React.ReactNode }) => (
  <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    {children}
  </KeyboardAvoidingView>
)

export default AvoidKeyboard
