import LiquidLoading from './components/LiquidLoading';
import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, StatusBar, TouchableOpacity, Modal, Linking, Platform, Keyboard, Dimensions } from 'react-native';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { supabase } from './lib/supabase'; 
import { Utensils, BookOpen, Printer, GraduationCap, User, LayoutDashboard, Zap, AlertTriangle } from 'lucide-react-native';

// 🟢 NEW ANIMATION IMPORTS
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withTiming, withSequence, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

// 🟢 ONESIGNAL IMPORTS
import { LogLevel, OneSignal } from 'react-native-onesignal';

// --- SCREENS ---
import MenuScreen from './screens/MenuScreen'; 
import PrintScreen from './screens/PrintScreen';
import ProfileScreen from './screens/ProfileScreen'; 
import AuthScreen from './screens/AuthScreen'; 
import ErrandScreen from './screens/ErrandScreen';
import HomeScreen from './screens/HomeScreen';
import TutorScreen from './screens/TutorScreen';

// --- CONFIG ---
const ADMIN_EMAILS = ['9066282034@campus.app', '9686050312@campus.app'];
const APP_VERSION = "1.0.1"; 

// 🟢 MAP ICONS TO SCREEN NAMES
const ICONS: Record<string, any> = {
  'Buzz': Zap,
  'Dashboard': LayoutDashboard,
  'Food Run': Utensils,
  'Menus': BookOpen,
  'Print Shop': Printer,
  'Tutors': GraduationCap,
  'Profile': User
};

// 🟢 LIQUID PHYSICS NAVIGATION BAR
function LiquidTabBar({ state, descriptors, navigation }: any) {
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  
  // Calculate width for the sliding bubble
  const SCREEN_WIDTH = Dimensions.get('window').width;
  const TAB_BAR_WIDTH = SCREEN_WIDTH - 40; // 20 padding on each side
  const TAB_WIDTH = TAB_BAR_WIDTH / state.routes.length;

  // Reanimated Shared Values for Liquid Physics
  const translateX = useSharedValue(0);
  const scaleX = useSharedValue(1);

  // Hide the floating bar when typing so it doesn't get in the way
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    // 🌊 THE LIQUID PHYSICS ENGINE
    // 1. Slide to the new index with a bouncy spring
    translateX.value = withSpring(state.index * TAB_WIDTH, { 
        damping: 14, 
        stiffness: 120 
    });
    
    // 2. Stretch the bubble horizontally while it moves, then snap back
    scaleX.value = withSequence(
        withTiming(1.6, { duration: 150, easing: Easing.inOut(Easing.ease) }),
        withSpring(1, { damping: 12, stiffness: 200 })
    );
  }, [state.index]);

  const animatedBubbleStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { scaleX: scaleX.value }
      ] as any // <-- ADD "as any" RIGHT HERE
    };
  });

  if (isKeyboardVisible) return null;

  return (
    <View style={styles.liquidTabBarContainer}>
      {/* 🟢 THE GLOWING LIQUID BUBBLE */}
      <Animated.View style={[styles.liquidBubble, { width: TAB_WIDTH }, animatedBubbleStyle]} />

      {state.routes.map((route: any, index: number) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;
        const Icon = ICONS[route.name] || Zap;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Satisfying physical click
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={route.key}
            onPress={onPress}
            style={styles.tabItem}
            activeOpacity={1}
          >
            <Icon 
                size={isFocused ? 26 : 22} 
                color={isFocused ? '#00E676' : '#71717a'} 
                strokeWidth={isFocused ? 2.5 : 2}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const Tab = createBottomTabNavigator();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [isProfileComplete, setIsProfileComplete] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

  const [needsUpdate, setNeedsUpdate] = useState(false);
  const [updateUrl, setUpdateUrl] = useState('');

  const theme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: '#09090b',
      card: '#18181b',
      text: '#FFFFFF',
      primary: '#00E676', 
      border: '#27272a',
    },
  };

  useEffect(() => {
    checkVersion();
    OneSignal.Debug.setLogLevel(LogLevel.Verbose);
    OneSignal.initialize("0e65c351-3716-44e5-8c20-d588d38a54de"); 
    OneSignal.Notifications.requestPermission(true);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
          checkAdmin(session);
          checkProfile(session.user.id);
          OneSignal.login(session.user.id); 
      } else {
          setLoading(false);
          setCheckingProfile(false); 
          OneSignal.logout(); 
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
          setLoading(true); 
          setCheckingProfile(true); 
          checkAdmin(session);
          checkProfile(session.user.id);
          OneSignal.login(session.user.id); 
      } else {
          setLoading(false);
          setCheckingProfile(false); 
          OneSignal.logout(); 
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user?.id) return;
    const channel = supabase.channel('profile_gatekeeper')
      .on('postgres_changes', 
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${session.user.id}` }, 
        (payload) => {
           const newData = payload.new;
           // Added is_email_verified to gatekeeper check
           if (newData.full_name && newData.phone && newData.id_card_url && newData.is_email_verified) {
               setIsProfileComplete(true);
           } else {
               setIsProfileComplete(false);
           }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function checkVersion() {
    try {
      const { data, error } = await supabase.from('app_config').select('*').single();
      if (data && data.latest_version !== APP_VERSION) {
        setUpdateUrl(data.update_url);
        setNeedsUpdate(true);
      }
    } catch (e) {
      console.log("Update check failed", e);
    }
  }

  function checkAdmin(session: any) {
    if (session?.user?.email && ADMIN_EMAILS.includes(session.user.email)) {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }

  async function checkProfile(userId: string) {
      try {
          const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
          // Added is_email_verified to profile completeness check
          if (data && data.full_name && data.phone && data.id_card_url && data.is_email_verified) setIsProfileComplete(true);
          else setIsProfileComplete(false);
      } catch (e) {
          console.log("Unexpected Error:", e);
      } finally {
          setLoading(false);
          setCheckingProfile(false);
      }
  }

  if (loading || checkingProfile) return (
    <LiquidLoading />
  );

  return (
    <NavigationContainer theme={theme}>
      <StatusBar barStyle="light-content" backgroundColor="#09090b" />

      <Modal visible={needsUpdate} transparent={false} animationType="fade" onRequestClose={() => {}}>
        <View style={styles.updateContainer}>
          <AlertTriangle size={64} color="#00E676" />
          <Text style={styles.updateTitle}>Update Required</Text>
          <Text style={styles.updateSub}>Your version of SideQuest is outdated.{'\n'}Please download the latest APK.</Text>
          <TouchableOpacity style={styles.updateBtn} onPress={() => Linking.openURL(updateUrl)}>
            <Text style={styles.updateBtnText}>Download New APK 🚀</Text>
          </TouchableOpacity>
        </View>
      </Modal>
      
      {!session ? (
        <AuthScreen />
      ) : (
        <Tab.Navigator 
          id="MainTabs"
          initialRouteName="Buzz"
          tabBar={(props) => <LiquidTabBar {...props} />}
          screenOptions={{ headerShown: false }}
        >
          {isAdmin ? (
            <>
              <Tab.Screen name="Buzz" children={() => <HomeScreen userEmail={session.user.email} />} />
              <Tab.Screen name="Dashboard" children={() => <MenuScreen userId={session.user.id} userEmail={session.user.email} isProfileComplete={true} />} />
              <Tab.Screen name="Profile" children={() => <ProfileScreen session={session} />} />
            </>
          ) : (
            <>
              <Tab.Screen name="Buzz" children={() => <HomeScreen userEmail={session.user.email} />} />
              <Tab.Screen name="Food Run" children={() => <ErrandScreen userId={session.user.id} isProfileComplete={isProfileComplete} />} />
              <Tab.Screen name="Menus" children={() => <MenuScreen userId={session.user.id} userEmail={session.user.email} isProfileComplete={isProfileComplete} />} />
              <Tab.Screen name="Print Shop" children={() => <PrintScreen userId={session.user.id} userEmail={session.user.email} isProfileComplete={isProfileComplete} />} />
              <Tab.Screen name="Tutors" children={() => <TutorScreen userId={session.user.id} isProfileComplete={isProfileComplete} />} />
              <Tab.Screen name="Profile" children={() => <ProfileScreen session={session} />} />
            </>
          )}
        </Tab.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#09090b' },
  
  // 🟢 NEW LIQUID TAB BAR STYLES
  liquidTabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 30 : 20,
    left: 20,
    right: 20,
    height: 70,
    backgroundColor: 'rgba(24, 24, 27, 0.85)', // Dark frosted glass look
    borderRadius: 35,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(63, 63, 70, 0.5)', 
    shadowColor: '#00E676', // Base shadow glow
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden', // Keeps the bubble perfectly inside the pill edges
  },
  liquidBubble: {
    position: 'absolute',
    height: '100%',
    backgroundColor: 'rgba(0, 230, 118, 0.15)', // Neon green liquid tint
    borderRadius: 35,
    left: 0, 
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    flex: 1,
    zIndex: 2, // Keeps icons above the sliding bubble
  },

  // UPDATE OVERLAY STYLES
  updateContainer: { flex: 1, backgroundColor: '#09090b', justifyContent: 'center', alignItems: 'center', padding: 30 },
  updateTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 20 },
  updateSub: { color: '#a1a1aa', textAlign: 'center', marginTop: 10, lineHeight: 22, fontSize: 16 },
  updateBtn: { backgroundColor: '#00E676', paddingVertical: 18, paddingHorizontal: 30, borderRadius: 16, marginTop: 40, width: '100%', alignItems: 'center' },
  updateBtnText: { color: 'black', fontWeight: 'bold', fontSize: 18 },
});