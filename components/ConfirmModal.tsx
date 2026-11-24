import React, { useEffect, useState } from 'react';
import { Modal, ScrollView, View, Text, TextInput, TouchableOpacity } from 'react-native';
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
      <View style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', flex: 1 }}>
      {/* Scrolls when the keyboard leaves too little room on a small phone. */}
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="w-full rounded-2xl bg-card p-6">
          <Text className="text-center text-xl text-ink font-psemibold">
            {title}
          </Text>
          <Text className="mt-3 text-center text-base text-muted font-pregular">
            {message}
          </Text>

          {bullets.length > 0 && (
            <View
              className="mt-5 rounded-xl px-4 py-3"
              style={{ backgroundColor: 'rgba(179, 38, 30, 0.06)' }}
            >
              {bullets.map(item => (
                <View key={item} className="flex-row items-start py-1">
                  <Text className="mr-2 font-pregular text-sm" style={{ color: '#B3261E' }}>
                    •
                  </Text>
                  <Text className="flex-1 font-pregular text-sm leading-5 text-muted">
                    {item}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {confirmWord ? (
            <View className="mt-5">
              <Text className="font-pregular text-sm text-muted">
                Type <Text className="font-psemibold text-ink">{confirmWord}</Text> to confirm
              </Text>
              <TextInput
                value={typedWord}
                onChangeText={setTypedWord}
                placeholder={confirmWord}
                placeholderTextColor="#8A8178"
                autoCorrect={false}
                autoComplete="off"
                editable={!isLoading}
                className="mt-2 h-14 rounded-2xl border-2 border-line bg-cream px-4 font-psemibold text-base text-ink"
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
            style={{ borderColor: '#E8B4AE' }}
          >
            <Text className="font-psemibold text-lg" style={{ color: '#B3261E' }}>
              {isLoading ? 'Deleting ...' : confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </View>
      </AvoidKeyboard>
    </Modal>
  );
};

export default ConfirmModal;
