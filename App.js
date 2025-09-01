import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

import AuthProvider, { useAuth } from './Firebase-Functions/AuthProvider';

import FrontPage from './Components/FrontPage';
import SignIn from './Components/SignIn';
import SignUp from './Components/SignUp';
import Feedback from './Components/Feedback';
import FAQScreen from './Components/FaqsPage';
import Accounts from './Components/Accounts';
import SpeechToText from './Components/SpeechToText';
import VideoRecorder from './Components/VideoRecorder';
import Dashboard from './Components/Dashboard';
import History from './Components/History';
import TextGenerated from './Components/TextGenerated';

const Stack = createStackNavigator();

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="FrontPage" component={FrontPage} />
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />
      {/* add forgot password if you have a screen */}
    </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={Dashboard} />
      <Stack.Screen name="Feedback" component={Feedback} />
      <Stack.Screen name="Faqs" component={FAQScreen} />
      <Stack.Screen name="Accounts" component={Accounts} />
      <Stack.Screen name="SpeechToText" component={SpeechToText} />
      <Stack.Screen name="VideoRecorder" component={VideoRecorder} />
      <Stack.Screen name="History" component={History} />
      <Stack.Screen name="TextGenerated" component={TextGenerated} />
    </Stack.Navigator>
  );
}

function RootNavigator() {
  const { user, initializing } = useAuth();

  if (initializing) {
    // simple splash while we check token/auth state
    return null; // or return a <Splash /> component
  }

  // 👇 if token/user exists → AppStack, else → AuthStack
  return user ? <AppStack /> : <AuthStack />;
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
