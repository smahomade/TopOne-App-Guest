import { View, Text, Image, ScrollView, TouchableOpacity, Button, Modal } from 'react-native';
import React, { useState, useEffect } from 'react';
import { images } from '../../constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';  // Adjust the path as necessary

type ServiceItem = {
  service: string;
  service_category: string;
  role: string;
  price: number;
};

type GroupedService = {
  service: string;
  service_category: string;
  roles: { role: string, price: number }[];
};

type ServiceCategory = {
  [category: string]: GroupedService[];
};

const Services = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('Cuts');
  const [servicesData, setServicesData] = useState<ServiceCategory>({});
  const [selectedService, setSelectedService] = useState<GroupedService | null>(null);
  const [showRolesModal, setShowRolesModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        setLoading(true);
        
        // Fetch data from Supabase services table
        const { data, error } = await supabase
          .from('services')
          .select('main_category, service_category, service, role, price');

        if (error) {
          console.error(error);
          return;
        }

        // Organize data by main_category, and group by service + service_category
        const organizedData = (data as ServiceItem[]).reduce<ServiceCategory>((acc, service) => {
          const { main_category, service_category, service: serviceName, role, price } = service;
          
          if (!acc[main_category]) {
            acc[main_category] = [];
          }

          // Check if service + service_category already exists
          let existingGroup = acc[main_category].find(
            group => group.service === serviceName && group.service_category === service_category
          );

          if (existingGroup) {
            // If it exists, just add the role to the existing group
            existingGroup.roles.push({ role, price });
          } else {
            // If it doesn't exist, create a new group
            acc[main_category].push({
              service: serviceName,
              service_category: service_category,
              roles: [{ role, price }],
              
            });
          }

          return acc;
        }, {});

        setServicesData(organizedData);
      } catch (error) {
        console.error('Error fetching services:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleBook = (group: GroupedService) => {
    setSelectedService(group);
    setShowRolesModal(true); // Show modal to display roles
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center">
        <Text>Loading services...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView>
      <ScrollView>
        {/* Logo Section */}
        <View className="items-center mb-6">
          <Image 
            source={images.logoTopOneSmall} 
            className="w-40 h-16"
            resizeMode="contain"
          />
          <Text className="text-lg mt-2">TopOne Salon - Richmond</Text>
        </View>

        {/* Buttons Row */}
        <View className="flex-row justify-around mb-6">
          {Object.keys(servicesData).map((category) => (
            <TouchableOpacity key={category} onPress={() => setSelectedCategory(category)}>
              <Text className={`text-lg ${selectedCategory === category ? 'text-blue-500' : 'text-black'}`}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Grouped Services Section */}
        {servicesData[selectedCategory]?.map((group, index) => (
          <View key={index} className="flex-row justify-between items-center px-4 my-2 mb-8">
            <View>
              <Text className="text-base font-bold">{group.service_category}</Text>
              <Text className="text-base">{group.service}</Text>
            </View>
            <TouchableOpacity>
              <Button title="Book" onPress={() => handleBook(group)} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Roles Modal */}
        <Modal
          visible={showRolesModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowRolesModal(false)}
        >
          <View className="flex-1 justify-center items-center bg-gray-700 bg-opacity-50">
            <View className="bg-white p-6 rounded-lg w-4/5">
              <Text className="text-lg font-bold mb-4">Select a Role for {selectedService?.service}</Text>
              <Text className="text-sm text-gray-600 mb-4">Category: {selectedService?.service_category}</Text>
              
              {selectedService?.roles.map((roleItem, index) => (
                <View key={index} className="flex-row justify-between items-center mb-4">
                  <Text className="text-base">{roleItem.role}</Text>
                  <Text className="text-gray-500">{`£${roleItem.price}`}</Text>
                  <TouchableOpacity>
                    <Button title="Choose" onPress={() => alert(`You chose ${roleItem.role}`)} />
                  </TouchableOpacity>
                </View>
              ))}

              <Button title="Close" onPress={() => setShowRolesModal(false)} />
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default Services;