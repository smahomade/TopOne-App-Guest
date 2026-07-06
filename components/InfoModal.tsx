import React from 'react';
import { Modal, View, Text } from 'react-native';
import CustomButton from './CustomButton';

type InfoModalProps = {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
};

const InfoModal = ({ visible, title, message, buttonText = 'Got it', onClose }: InfoModalProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
          <CustomButton
            title={buttonText}
            handlePress={onClose}
            containerStyles="mt-6 w-full"
          />
        </View>
      </View>
    </Modal>
  );
};

export default InfoModal;
