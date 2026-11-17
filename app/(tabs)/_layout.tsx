import { View, Text, Image, type ColorValue, type ImageSourcePropType } from 'react-native'
import { Tabs } from 'expo-router'
import { icons } from '../../constants';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Height of the icon-and-label area, not counting the phone's own navigation
// bar or home indicator underneath it.
const TAB_BAR_CONTENT_HEIGHT = 64;

type TabIconProps = {
    color: ColorValue;
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
  // Android now draws the app under the system navigation bar (as iOS always
  // has), and the tab bar pads itself by that much, so add it on top.
  const { bottom } = useSafeAreaInsets();

  return (
    <>
    <StatusBar style='light'/>
  
        <Tabs
            screenOptions={{
                sceneStyle: {
                    backgroundColor: '#161622',
                },
                tabBarShowLabel: false,
                // The tab bar now boxes icons to 31x28 at the top of each tab, which
                // wraps our labels ("Hom/e") and pushes icon and label up to the top edge.
                tabBarIconStyle: { width: '100%', height: '100%' },
                tabBarActiveTintColor: '#8ED1FC', //This is the 'color' variable
                tabBarInactiveTintColor: '#CDCDE0', // this is the 'color' variable
                tabBarStyle:{
                    backgroundColor: '#161622',
                    borderTopWidth: 1,
                    borderTopColor: '#232533',
                    height: TAB_BAR_CONTENT_HEIGHT + bottom,
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