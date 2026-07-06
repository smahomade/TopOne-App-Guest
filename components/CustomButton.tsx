import { TouchableOpacity ,View, Text } from 'react-native'
import React from 'react'

type CustomButtonProps = {
  title: string
  handlePress: () => void
  containerStyles?: string
  textStyles?: string
  isLoading?: boolean
  backgroundColor?: string
  textColor?: string
}

const CustomButton = ({title, handlePress, containerStyles, textStyles = '', isLoading = false, backgroundColor = '#8ed1fc', textColor = '#161622' }: CustomButtonProps) => {
  return (

    <TouchableOpacity 
    onPress={handlePress}
    activeOpacity={0.7}
    className= {`rounded-xl min-h-[62px] justify-center items-center 
    ${containerStyles} ${isLoading ? 'opacity-50' : ''}`}
    disabled={isLoading}
    style={{ backgroundColor }}
      
    >

        <Text className ={`font-psemibold text-lg ${textStyles}`} style={{ color: textColor }}>
          {title}
        
        </Text>
        

    </TouchableOpacity>
  )
}

export default CustomButton