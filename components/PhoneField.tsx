import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, SafeAreaView } from 'react-native'
import React, { useState } from 'react'

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'US', name: 'United States',  dial: '+1'  },
  { code: 'CA', name: 'Canada',         dial: '+1'  },
  { code: 'AU', name: 'Australia',      dial: '+61' },
  { code: 'AE', name: 'UAE',            dial: '+971'},
  { code: 'NG', name: 'Nigeria',        dial: '+234'},
  { code: 'GH', name: 'Ghana',          dial: '+233'},
  { code: 'ZA', name: 'South Africa',   dial: '+27' },
  { code: 'IN', name: 'India',          dial: '+91' },
  { code: 'PK', name: 'Pakistan',       dial: '+92' },
  { code: 'FR', name: 'France',         dial: '+33' },
  { code: 'DE', name: 'Germany',        dial: '+49' },
  { code: 'IT', name: 'Italy',          dial: '+39' },
  { code: 'ES', name: 'Spain',          dial: '+34' },
  { code: 'PT', name: 'Portugal',       dial: '+351'},
  { code: 'NL', name: 'Netherlands',    dial: '+31' },
  { code: 'BE', name: 'Belgium',        dial: '+32' },
  { code: 'PL', name: 'Poland',         dial: '+48' },
  { code: 'RO', name: 'Romania',        dial: '+40' },
  { code: 'TR', name: 'Turkey',         dial: '+90' },
  { code: 'BR', name: 'Brazil',         dial: '+55' },
  { code: 'MX', name: 'Mexico',         dial: '+52' },
  { code: 'JP', name: 'Japan',          dial: '+81' },
  { code: 'KR', name: 'South Korea',    dial: '+82' },
  { code: 'CN', name: 'China',          dial: '+86' },
  { code: 'SG', name: 'Singapore',      dial: '+65' },
  { code: 'NZ', name: 'New Zealand',    dial: '+64' },
  { code: 'IE', name: 'Ireland',        dial: '+353'},
  { code: 'SE', name: 'Sweden',         dial: '+46' },
  { code: 'NO', name: 'Norway',         dial: '+47' },
]

type Props = {
  value: string
  onChangePhone: (full: string) => void
  OtherStyles?: string
  hasError?: boolean
}

const PhoneField = ({ value, onChangePhone, OtherStyles = '', hasError = false }: Props) => {
  const [selected, setSelected] = useState(COUNTRIES[0])
  const [pickerVisible, setPickerVisible] = useState(false)
  const [localNumber, setLocalNumber] = useState('')

  const handleNumberChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '')
    setLocalNumber(digits)
    onChangePhone(`${selected.dial}${digits}`)
  }

  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelected(country)
    setPickerVisible(false)
    onChangePhone(`${country.dial}${localNumber}`)
  }

  const getFlagEmoji = (code: string) => {
    return code
      .toUpperCase()
      .split('')
      .map(c => String.fromCodePoint(127397 + c.charCodeAt(0)))
      .join('')
  }

  return (
    <View style={{ marginTop: OtherStyles ? 20 : 0 }}>
      <View className="flex-row items-center">
        <Text className="text-base font-pmedium text-gray-100">Phone Number</Text>
        <Text className="ml-1 text-base font-psemibold text-[#FF8A8A]">*</Text>
      </View>

      <View
        style={{ marginTop: 8 }}
        className={`border-2 w-full h-14 rounded-2xl items-center flex-row overflow-hidden ${hasError ? 'border-[#C44159] bg-[#2B1217]' : 'border-black-200 bg-black-100'}`}
      >
        {/* Country picker button */}
        <TouchableOpacity
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            borderRightWidth: 1,
            borderRightColor: '#3a3a4a',
            height: '100%',
            gap: 4,
          }}
        >
          <Text style={{ fontSize: 20 }}>{getFlagEmoji(selected.code)}</Text>
          <Text style={{ color: '#CBD5E1', fontSize: 13, fontFamily: 'Poppins-SemiBold' }}>
            {selected.dial}
          </Text>
          <Text style={{ color: '#7b7b8b', fontSize: 11 }}>▾</Text>
        </TouchableOpacity>

        {/* Number input */}
        <TextInput
          style={{ flex: 1, paddingHorizontal: 12, color: '#fff', fontFamily: 'Poppins-SemiBold', fontSize: 15 }}
          value={localNumber}
          onChangeText={handleNumberChange}
          placeholder="Enter your number"
          placeholderTextColor="#7b7b8b"
          keyboardType="phone-pad"
        />
      </View>

      {/* Country picker modal */}
      <Modal visible={pickerVisible} animationType="slide" transparent onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: '#1E1E2D',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              paddingTop: 12,
              paddingBottom: 32,
              maxHeight: '70%',
            }}
          >
            {/* Handle bar */}
            <View style={{ width: 40, height: 4, borderRadius: 99, backgroundColor: '#3a3a4a', alignSelf: 'center', marginBottom: 16 }} />

            <Text style={{ color: '#CBD5E1', fontSize: 16, fontFamily: 'Poppins-SemiBold', paddingHorizontal: 20, marginBottom: 12 }}>
              Select country
            </Text>

            <FlatList
              data={COUNTRIES}
              keyExtractor={(item) => item.code}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCountrySelect(item)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 20,
                    paddingVertical: 14,
                    gap: 12,
                    backgroundColor: item.code === selected.code ? '#2a2a3d' : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 24 }}>{getFlagEmoji(item.code)}</Text>
                  <Text style={{ flex: 1, color: '#CBD5E1', fontSize: 14, fontFamily: 'Poppins-Regular' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: '#7b7b8b', fontSize: 13, fontFamily: 'Poppins-SemiBold' }}>
                    {item.dial}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

export default PhoneField