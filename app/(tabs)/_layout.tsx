import { View, Text, Image, type ImageSourcePropType } from 'react-native'
import { Tabs } from 'expo-router'
import { icons } from '../../constants';
import { StatusBar } from 'expo-status-bar';

type TabIconProps = {
    color: string;
    focused: boolean;
    icon: ImageSourcePropType;
    name: string;
}

const TabIcon = ({ icon, color, name, focused }: TabIconProps) => {
    return(
        <View className="items-center justify-center gap-2">
            <Image
                source={icon} 
                resizeMode='contain'
                tintColor={color}
                className="w-6 h-6"
             />

             <Text className={`${focused ? 'font-psemibold': 'font-pregular'} text-xs`}
                    style={{color:color}}
                    >
                {name}
             </Text>
        </View>  
    )
}

const TabsLayout = () => {
  return (
    <>
    <StatusBar backgroundColor='#161622' style='light'/>
  
        <Tabs
            sceneContainerStyle={{
                backgroundColor: '#161622',
            }}
            screenOptions={{
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#8ED1FC', //This is the 'color' variable
                tabBarInactiveTintColor: '#CDCDE0', // this is the 'color' variable
                tabBarStyle:{
                    backgroundColor: '#161622',
                    borderTopWidth: 1,
                    borderTopColor: '#232533',
                    height: 84,
                }

            }}
        >
            <Tabs.Screen
            name='home'
            options={{
                title: 'Home',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.home}
                        color={color}
                        name="Home"
                        focused={focused}
                     />
                )
            }}
            />

        <Tabs.Screen
            name='services'
            options={{
                title: 'Services',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.scissors}
                        color={color}
                        name="Services"
                        focused={focused}
                     />
                )
            }}
            />

        <Tabs.Screen
            name='collection'
            options={{
                title: 'Collection',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.comb}
                        color={color}
                        name="Collection"
                        focused={focused}
                     />
                )
            }}
            />

        <Tabs.Screen
            name='book'
            options={{
                title: 'Messages',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.bookmark}
                        color={color}
                        name="Messages"
                        focused={focused}
                     />
                )
            }}
            />

        <Tabs.Screen
            name='profile'
            options={{
                title: 'Profile',
                headerShown: false,
                tabBarIcon: ({ color,focused }) => (
                    <TabIcon 
                        icon={icons.profile}
                        color={color}
                        name="Profile"
                        focused={focused}
                     />
                )
            }}
            />
        
        </Tabs>
     
        
    </>
  )
}

export default TabsLayout