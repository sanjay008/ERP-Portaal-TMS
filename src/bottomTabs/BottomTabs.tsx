import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import React from "react";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Images } from "../assets/images";
import Chat from "../screens/Chat/Chat";
import LoadedScreens from "../screens/Loaded/LoadedScreens";
import Parcel from "../screens/Parcel/Parcel";
import Profile from "../screens/Profile/Profile";
import { Colors } from "../utils/colors";
import CustomHeader from "../components/CustomHeader";

export default function BottomTabs() {
  const Tab = createBottomTabNavigator();
  return (
    <SafeAreaView style={{ flex: 1, }}>
      <Tab.Navigator
        initialRouteName="Loaded"
        screenOptions={{
          tabBarStyle:{
            height:70,
            paddingTop:'2%'
          },
          header:({props}:any)=> <CustomHeader {...props}/>,
          tabBarActiveTintColor:Colors.primary,
          tabBarInactiveTintColor:Colors.inActive,
          tabBarLabelStyle:{
            fontSize:12,
            fontFamily:'Medium',
            marginTop:5
          }
        }}
      >
        <Tab.Screen name="Loaded" component={LoadedScreens} 
        options={{
          tabBarIcon:({size,color,focused})=> (
            <Image 
            source={Images.Loading}
            style={{
              width: 25,
              height:25
            }}
            tintColor={color}
            />
          ),
          tabBarLabel:'Loading'
        }}
        />
        <Tab.Screen name="Parcel" component={Parcel} 
        options={{
          tabBarIcon:({size,color,focused})=> (
            <Image 
            source={Images.Parcel}
            style={{
              width: 25,
              height:25
            }}
            tintColor={color}
            />
          )
        }}
        />
        <Tab.Screen name="Chat" component={Chat} 
        options={{
          tabBarIcon:({size,color,focused})=> (
            <Image 
            source={Images.Chat}
            style={{
              width: 25,
              height:25
            }}
            tintColor={color}
            />
          )
        }}
        />
        <Tab.Screen name="Profile" component={Profile} 
        options={{
          tabBarIcon:({size,color,focused})=> (
            <Image 
            source={Images.Profile}
            style={{
              width: 25,
              height:25
            }}
            tintColor={color}
            />
          )
        }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}
