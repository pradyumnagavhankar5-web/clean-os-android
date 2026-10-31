import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import WelcomeScreen from '../screens/WelcomeScreen';
import { colors } from '../ui';
export default function Welcome() { return <SafeAreaView style={{flex:1,backgroundColor:colors.background}}><WelcomeScreen /></SafeAreaView>; }
