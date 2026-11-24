import React from 'react'
import { Platform, ScrollView, ScrollViewProps } from 'react-native'
import AvoidKeyboard from './AvoidKeyboard'

// The scrolling page behind a form (sign in, sign up, account and so on), kept
// clear of the keyboard.
//
// iPhone: the ScrollView makes room for the keyboard itself and scrolls the
// box being typed in to just above it (automaticallyAdjustKeyboardInsets).
// Shrinking the page with AvoidKeyboard instead left that box under the
// keyboard on smaller iPhones: iOS scrolls to the box before the page has
// shrunk, so the box ends up behind the keyboard once it does.
//
// Android: there is no such option, so AvoidKeyboard shrinks the page to the
// space above the keyboard as before.
const FormScrollView = ({ children, ...props }: ScrollViewProps) => {
  const page = (
    <ScrollView
      // Without this, a tap while the keyboard is open only closes the
      // keyboard, so buttons and links seem to need two taps
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      {...props}
    >
      {children}
    </ScrollView>
  )

  return Platform.OS === 'ios' ? page : <AvoidKeyboard>{page}</AvoidKeyboard>
}

export default FormScrollView
