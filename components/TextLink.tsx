import React from 'react';
import { Pressable, Text } from 'react-native';
import { router, type Href } from 'expo-router';

type TextLinkProps = {
  label: string;
  /** The screen to open. Leave it out and pass onPress to do something else. */
  href?: Href;
  onPress?: () => void;
  /** Text size, to match the words next to it. */
  sizeClassName?: string;
  /** Text colour; white over a photo. */
  colorClassName?: string;
};

// A link made of a word or two, like "Sign up". Text on its own is only as tall
// as its letters (about 28pt, where Apple asks for 44pt), so a tap on an iPhone
// could land just outside it and do nothing. This gives the words a full-height
// tap area that also reaches a little past them.
//
// To space it from the words before it, give the row style={{ columnGap: 8 }}.
// NativeWind's gap-2 class only spaces children that have a className, so it
// leaves no space before this one.
const TextLink = ({ label, href, onPress, sizeClassName = 'text-lg', colorClassName = 'text-ink' }: TextLinkProps) => (
  <Pressable
    accessibilityRole="link"
    hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
    onPress={() => {
      if (onPress) {
        onPress();
      } else if (href) {
        router.navigate(href);
      }
    }}
    style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}
  >
    <Text className={`${sizeClassName} ${colorClassName} font-psemibold underline`}>{label}</Text>
  </Pressable>
);

export default TextLink;
