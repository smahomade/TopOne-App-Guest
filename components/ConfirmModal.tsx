import React, { useEffect, useState } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity } from 'react-native';
import CustomButton from './CustomButton';
import AvoidKeyboard from './AvoidKeyboard';

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  message: string;
  bullets?: string[];
  confirmText?: string;
  cancelText?: string;
  // When set, the confirm button stays off until this word is typed (any
  // capitals), so a destructive step can't be done with a stray tap.
  confirmWord?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

const ConfirmModal = ({
  visible,
  title,
  message,
  bullets = [],
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmWord,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) => {
  const [typedWord, setTypedWord] = useState('');

  // Starts empty every time it opens.
  useEffect(() => {
    if (!visible) {
      setTypedWord('');
    }
  }, [visible]);

  const isWordTyped = !confirmWord || typedWord.trim().toLowerCase() === confirmWord.toLowerCase();
  const isConfirmDisabled = isLoading || !isWordTyped;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <AvoidKeyboard>
      <View
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        className="flex-1 items-center justify-center px-6"
      >
        <View className="w-full rounded-2xl bg-black-100 p-6">
          <Text className="text-center text-xl text-white font-psemibold">
            {title}
          </Text>
          <Text className="mt-3 text-center text-base text-gray-100 font-pregular">
            {message}
          </Text>

          {bullets.length > 0 && (
            <View
              className="mt-5 rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(248, 113, 113, 0.08)' }}
            >
              {bullets.map(item => (
                <View key={item} className="flex-row items-start py-1">
                  <Text className="mr-2 font-pregular text-sm" style={{ color: '#F87171' }}>
                    •
                  </Text>
                  <Text className="flex-1 font-pregular text-sm leading-5 text-gray-100">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {confirmWord ? (
            <View className="mt-5">
              <Text className="font-pregular text-sm text-gray-100">
                Type <Text className="font-psemibold text-white">{confirmWord}</Text> to confirm
              </Text>
              <TextInput
                value={typedWord}
                onChangeText={setTypedWord}
                placeholder={confirmWord}
                placeholderTextColor="#7b7b8b"
                autoCorrect={false}
                autoComplete="off"
                editable={!isLoading}
                className="mt-2 h-14 rounded-2xl border-2 border-black-200 bg-primary px-4 font-psemibold text-base text-white"
              />
            </View>
          ) : null}

          {/* Cancel is the prominent option so the destructive one is never the reflex tap. */}
          <CustomButton
            title={cancelText}
            handlePress={onCancel}
            containerStyles="mt-6 w-full"
            isLoading={isLoading}
          />

          <TouchableOpacity
            onPress={onConfirm}
            activeOpacity={0.7}
            disabled={isConfirmDisabled}
            className={`mt-3 min-h-[62px] w-full items-center justify-center rounded-xl border ${
              isConfirmDisabled ? 'opacity-50' : ''
            }`}
            style={{ borderColor: '#7F1D1D' }}
          >
            <Text className="font-psemibold text-lg" style={{ color: '#F87171' }}>
              {isLoading ? 'Deleting ...' : confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </AvoidKeyboard>
    </Modal>
  );
};

export default ConfirmModal;
