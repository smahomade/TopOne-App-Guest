import { View, Text, Image, TouchableOpacity, TextInput } from 'react-native'
import React, { useState } from 'react'

import { icons, images } from '../constants'

const FormField = ({title, value, placeholder, handleChangeText, OtherStyles, titleColor = 'text-gray-100', ...props}) => {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <View className={`space-y-2 ${OtherStyles}`}>
      <Text className={`text-base font-pmedium ${titleColor}`}>{title}</Text>
      <View className="border-2 border-black-200 w-full h-14 px-4 bg-black-100 rounded-2xl focus:border-secondary items-center flex-row">
        <TextInput
          className="flex-1 text-white font-psemibold text-base"
          value={value}
          placeholder={placeholder}
          placeholderTextColor="#7b7b8b"
          onChangeText={handleChangeText}
          secureTextEntry={title === 'Password' && !showPassword}
          autoCapitalize="none"
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