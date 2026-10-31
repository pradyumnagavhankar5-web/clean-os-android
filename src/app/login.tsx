import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import LoginScreen from '../screens/LoginScreen';
import { colors } from '../ui';
export default function Login() { return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><LoginScreen /></SafeAreaView>; }
