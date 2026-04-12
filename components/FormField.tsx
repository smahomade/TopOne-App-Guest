import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'

import { icons, images } from '../constants'

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
}

const FormField = ({
  title,
  value,
  placeholder,
  handleChangeText,
  OtherStyles = '',
  titleColor = 'text-gray-100',
  isRequired = false,
  requiredReason,
  inputClassName = 'border-black-200 bg-black-100',
  hasError = false,
  ...props
}: FormFieldProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showRequiredReason, setShowRequiredReason] = useState(false)

  return (
    <View className={`space-y-2 ${OtherStyles}`}>
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <Text className={`text-base font-pmedium ${titleColor}`}>{title}</Text>
          {isRequired ? <Text className="ml-1 text-base font-psemibold text-[#FF8A8A]">*</Text> : null}
        </View>

        {requiredReason ? (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowRequiredReason(!showRequiredReason)}
            className="h-6 w-6 items-center justify-center rounded-full border border-black-200 bg-black-100"
          >
            <Text className="font-psemibold text-xs text-secondary">?</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {requiredReason && showRequiredReason ? (
        <View className="rounded-2xl border border-black-200 bg-black-100 px-4 py-3">
          <Text className="font-pregular text-xs leading-5 text-gray-100">{requiredReason}</Text>
        </View>
      ) : null}

      <View className={`border-2 w-full h-14 px-4 rounded-2xl items-center flex-row ${hasError ? 'border-[#C44159] bg-[#2B1217]' : inputClassName}`}>
        <TextInput
          className="flex-1 text-white font-psemibold text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7b7b8b"
          onChangeText={handleChangeText}
          secureTextEntry={title === 'Password' && !showPassword}
          autoCapitalize="none"
          {...props}
        />
        {title === 'Password' && (
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Image source ={!showPassword ? icons.eye : icons.eyeHide}
            className='w-6 h-6'
            resizeMode='contain'/>
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}


export default FormField