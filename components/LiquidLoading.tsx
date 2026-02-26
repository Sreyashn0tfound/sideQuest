import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { 
  Canvas, 
  Circle, 
  Group, 
  BlurMask,
  mix
} from '@shopify/react-native-skia';
import { 
  useSharedValue, 
  withRepeat, 
  withTiming, 
  Easing, 
  useDerivedValue 
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');
const CENTER_X = width / 2;
const CENTER_Y = height / 2;

export default function LiquidLoading() {
  // Animation Values
  const pulse = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    // 1. Breathing Pulse (0 to 1)
    pulse.value = withRepeat(
      withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
      -1, 
      true // Auto-reverse (breath in, breath out)
    );

    // 2. Infinite Rotation (0 to 2*PI)
    rotation.value = withRepeat(
      withTiming(2 * Math.PI, { duration: 3000, easing: Easing.linear }),
      -1
    );
  }, []);

  // Calculate dynamic sizes based on the pulse
  const coreRadius = useDerivedValue(() => mix(pulse.value, 40, 50));
  const glowRadius = useDerivedValue(() => mix(pulse.value, 50, 70));
  const outerOpacity = useDerivedValue(() => mix(pulse.value, 0.3, 0.8));

  // Satellite Positions (Orbiting particles)
  const sat1X = useDerivedValue(() => CENTER_X + Math.cos(rotation.value) * 60);
  const sat1Y = useDerivedValue(() => CENTER_Y + Math.sin(rotation.value) * 60);
  
  const sat2X = useDerivedValue(() => CENTER_X + Math.cos(rotation.value + Math.PI) * 60);
  const sat2Y = useDerivedValue(() => CENTER_Y + Math.sin(rotation.value + Math.PI) * 60);

  return (
    <View style={styles.container}>
      <Canvas style={{ flex: 1 }}>
        {/* 🟢 LAYER 1: THE GLOW (Background) */}
        <Group opacity={0.5}>
          <Circle cx={CENTER_X} cy={CENTER_Y} r={glowRadius} color="#00E676" opacity={outerOpacity} />
          <BlurMask blur={30} style="normal" />
        </Group>

        {/* 🟢 LAYER 2: THE SATELLITES (Orbiting Energy) */}
        <Group>
          <Circle cx={sat1X} cy={sat1Y} r={12} color="#00E676" />
          <Circle cx={sat2X} cy={sat2Y} r={12} color="#00E676" />
          {/* Intense neon blur for satellites */}
          <BlurMask blur={10} style="solid" /> 
        </Group>

        {/* 🟢 LAYER 3: THE CORE (Solid White Hot Center) */}
        <Group>
           {/* Outer Green Ring */}
           <Circle cx={CENTER_X} cy={CENTER_Y} r={coreRadius} color="#00E676" style="stroke" strokeWidth={4} />
           
           {/* Inner White Core */}
           <Circle cx={CENTER_X} cy={CENTER_Y} r={35} color="white" />
           <BlurMask blur={5} style="normal" />
        </Group>
      </Canvas>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#09090b', // Matches App Theme
  },
});