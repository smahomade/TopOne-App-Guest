import { View, Text, Image, TouchableOpacity, TextInput, Modal, Dimensions } from 'react-native'
import React, { useState, useRef } from 'react'
import { icons } from '../constants'

type FormFieldProps = {
  title: string
  value: string
  placeholder?: string
  handleChangeText: (value: string) => void
  OtherStyles?: string
  titleColor?: string
  isRequired?: boolean
  requiredReason?: string
  inputClassName?: string
  hasError?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  // Hide what's typed, with a show/hide toggle. Defaults to on for fields
  // titled "Password"; set it for other password fields.
  secret?: boolean
}

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  OtherStyles = '',
  titleColor = 'text-muted',
  isRequired = false,
  requiredReason,
  inputClassName = 'border-line bg-card',
  hasError = false,
  secret,
  ...props
}: FormFieldProps) => {
  const isSecret = secret ?? title === 'Password'
  const [showPassword, setShowPassword] = useState(false)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [bubbleHeight, setBubbleHeight] = useState(0)
  const questionRef = useRef<React.ComponentRef<typeof TouchableOpacity>>(null)
  const screenWidth = Dimensions.get('window').width

  const handleQuestionPress = () => {
    questionRef.current?.measureInWindow((x, y, width, height) => {
      setTooltipPos({ x: x + width, y: y })
      setTooltipVisible(true)
    })
  }

  const tooltipWidth = 220
  const tooltipLeft = Math.max(16, Math.min(
    tooltipPos.x - tooltipWidth,
    screenWidth - tooltipWidth - 16
  ))

  return (
    <View className={`space-y-2 ${OtherStyles}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className={`text-base font-pmedium ${titleColor}`}>{title}</Text>
          {isRequired && (
            <Text className="ml-1 text-base font-psemibold text-[#B3261E]">*</Text>
          )}
        </View>

        {requiredReason && (
          <TouchableOpacity
            ref={questionRef}
            activeOpacity={0.8}
            onPress={handleQuestionPress}
            className="h-6 w-6 items-center justify-center rounded-full border border-line bg-card"
          >
            <Text className="font-psemibold text-xs text-ink">?</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className={`border-2 w-full h-14 px-4 rounded-2xl items-center flex-row ${hasError ? 'border-[#B3261E] bg-[#FBEAE8]' : inputClassName}`}>
        <TextInput
          className="flex-1 text-ink font-psemibold text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#8A8178"
          onChangeText={handleChangeText}
          secureTextEntry={isSecret && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {isSecret && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image
              source={!showPassword ? icons.eye : icons.eyeHide}
              className="w-6 h-6"
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      </View>

      {tooltipVisible && (
        <Modal transparent animationType="fade" onRequestClose={() => setTooltipVisible(false)}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setTooltipVisible(false)}
          >
            <View
              style={{
                position: 'absolute',
                top: tooltipPos.y - (bubbleHeight || 80) - 12,
                left: tooltipLeft,
                width: tooltipWidth,
              }}
              onLayout={(e) => setBubbleHeight(e.nativeEvent.layout.height)}
            >
              <View
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: 12,
                  padding: 12,
                  borderWidth: 0.5,
                  borderColor: '#D5CDC2',
                }}
              >
                <Text style={{ color: '#3F3A35', fontSize: 12, lineHeight: 20, fontFamily: 'DMSans-Regular' }}>
                  {requiredReason}
                </Text>
              </View>

              {/* speech bubble tail pointing down-right toward the ? button */}
              <View
                style={{
                  position: 'absolute',
                  bottom: -8,
                  right: 8,
                  width: 0,
                  height: 0,
                  borderLeftWidth: 8,
                  borderRightWidth: 8,
                  borderTopWidth: 8,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#D5CDC2',
                }}
              />
              <View
                style={{
                  position: 'absolute',
                  bottom: -7,
                  right: 9,
                  width: 0,
                  height: 0,
                  borderLeftWidth: 7,
                  borderRightWidth: 7,
                  borderTopWidth: 7,
                  borderLeftColor: 'transparent',
                  borderRightColor: 'transparent',
                  borderTopColor: '#FFFFFF',
                }}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  )
}

export default FormField