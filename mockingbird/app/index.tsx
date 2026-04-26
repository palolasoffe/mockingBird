import { DailyChallenges } from "@/components/DailyChallenges";
import { GAME_CONFIG } from "@/constants/game-config";
import { PowerUpType, useGameEngine } from "@/hooks/use-game-engine";
import { useEffect, useState } from "react";
import { Text, TouchableWithoutFeedback, View } from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  interpolateColor,
  runOnJS,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from "react-native-reanimated";

const PipeSet = ({ x, gapY }: { x: Animated.SharedValue<number>, gapY: Animated.SharedValue<number> }) => {
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));
  const topPipeStyle = useAnimatedStyle(() => ({ height: gapY.value }));
  const bottomPipeStyle = useAnimatedStyle(() => ({ top: gapY.value + GAME_CONFIG.PIPE_GAP }));

  return (
    <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: GAME_CONFIG.PIPE_WIDTH }, containerStyle]}>
      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0 }, topPipeStyle]}>
        <View style={{ flex: 1, backgroundColor: "#73bf2e", borderLeftWidth: 4, borderRightWidth: 4, borderColor: "#54802a" }}>
           <View style={{ position: 'absolute', right: 8, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>
        <View style={{ position: 'absolute', bottom: 0, left: -6, right: -6, height: 24, backgroundColor: "#73bf2e", borderWidth: 4, borderColor: "#54802a", borderRadius: 2 }} />
      </Animated.View>
      <Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 0 }, bottomPipeStyle]}>
        <View style={{ flex: 1, backgroundColor: "#73bf2e", borderLeftWidth: 4, borderRightWidth: 4, borderColor: "#54802a" }}>
           <View style={{ position: 'absolute', right: 8, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(255,255,255,0.2)' }} />
        </View>
        <View style={{ position: 'absolute', top: 0, left: -6, right: -6, height: 24, backgroundColor: "#73bf2e", borderWidth: 4, borderColor: "#54802a", borderRadius: 2 }} />
      </Animated.View>
    </Animated.View>
  );
};

const PowerUpCollectible = ({ x, y, type }: { x: Animated.SharedValue<number>, y: Animated.SharedValue<number>, type: Animated.SharedValue<PowerUpType> }) => {
  const bobbing = useSharedValue(0);
  const [localType, setLocalType] = useState<PowerUpType>('none');

  useEffect(() => {
    bobbing.value = withRepeat(
      withTiming(8, { duration: 1000 }),
      -1,
      true
    );
  }, []);

  // Sync shared value type to local state for conditional rendering
  useDerivedValue(() => {
    if (type.value !== localType) {
      runOnJS(setLocalType)(type.value);
    }
    return type.value;
  });

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.value },
      { translateY: y.value + bobbing.value },
      { rotate: type.value === 'shield' ? '45deg' : '0deg' }
    ],
    opacity: x.value < -50 ? 0 : 1
  }));

  return (
    <Animated.View style={[{ 
      position: 'absolute', 
      width: GAME_CONFIG.POWERUP_SIZE, 
      height: GAME_CONFIG.POWERUP_SIZE, 
      zIndex: 5,
      justifyContent: 'center',
      alignItems: 'center'
    }, style]}>
       {/* Shield Visual (Blue Crystal) */}
       {localType === 'shield' && (
         <View style={{ width: '100%', height: '100%', backgroundColor: '#3498db', borderWidth: 3, borderColor: 'white', borderRadius: 4, shadowColor: '#3498db', shadowRadius: 10, shadowOpacity: 0.8 }}>
            <View style={{ position: 'absolute', top: 4, left: 4, width: 6, height: 6, backgroundColor: 'white', borderRadius: 2, opacity: 0.6 }} />
         </View>
       )}

       {/* Shrink Visual (Purple Orb) */}
       {localType === 'shrink' && (
         <View style={{ width: '100%', height: '100%', backgroundColor: '#9b59b6', borderWidth: 3, borderColor: 'white', borderRadius: 20, shadowColor: '#9b59b6', shadowRadius: 10, shadowOpacity: 0.8 }}>
            <View style={{ position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%', backgroundColor: 'white', borderRadius: 10, opacity: 0.3 }} />
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
               <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 10 }}>MINI</Text>
            </View>
         </View>
       )}
    </Animated.View>
  );
};

const ScrollingClouds = ({ x, opacityStyle }: { x: Animated.SharedValue<number>, opacityStyle: any }) => {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  const Cloud = ({ top, left, scale }: { top: number, left: number, scale: number }) => (
    <View style={{ position: 'absolute', top, left, transform: [{ scale }] }}>
      <View style={{ width: 60, height: 30, backgroundColor: 'white', borderRadius: 20, opacity: 0.8 }} />
      <View style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, position: 'absolute', top: -15, left: 10, opacity: 0.8 }} />
    </View>
  );
  return (
    <Animated.View style={[{ position: 'absolute', top: 100, width: GAME_CONFIG.SCREEN_WIDTH * 2, height: 200 }, style, opacityStyle]}>
      <Cloud top={20} left={50} scale={1} />
      <Cloud top={80} left={250} scale={0.8} />
      <Cloud top={20} left={GAME_CONFIG.SCREEN_WIDTH + 50} scale={1} />
      <Cloud top={80} left={GAME_CONFIG.SCREEN_WIDTH + 250} scale={0.8} />
    </Animated.View>
  );
};

const CelestialBodies = ({ scoreSV }: { scoreSV: Animated.SharedValue<number> }) => {
  const sunStyle = useAnimatedStyle(() => {
    const dayProgress = interpolate(scoreSV.value % 50, [0, 10, 20, 30, 40, 50], [1, 0.5, 0, 0, 0.5, 1], Extrapolation.CLAMP);
    return { opacity: dayProgress, transform: [{ scale: interpolate(dayProgress, [0, 1], [0.8, 1]) }] };
  });
  const starsStyle = useAnimatedStyle(() => {
    const nightProgress = interpolate(scoreSV.value % 50, [10, 25, 40], [0, 1, 0], Extrapolation.CLAMP);
    return { opacity: nightProgress };
  });
  return (
    <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center' }}>
      <Animated.View style={[{ width: 60, height: 60, backgroundColor: '#FFD700', borderRadius: 30, shadowColor: '#FFD700', shadowRadius: 20, shadowOpacity: 0.8, position: 'absolute', right: 40, top: 20 }, sunStyle]} />
      <Animated.View style={[{ width: '100%', height: 200 }, starsStyle]}>
        {[...Array(15)].map((_, i) => (
           <View key={i} style={{ position: 'absolute', top: Math.random() * 150, left: Math.random() * GAME_CONFIG.SCREEN_WIDTH, width: 4, height: 4, backgroundColor: 'white', borderRadius: 2, opacity: 0.6 }} />
        ))}
      </Animated.View>
    </View>
  );
};

const ScrollingGround = ({ x }: { x: Animated.SharedValue<number> }) => {
  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));
  return (
    <View style={{ position: 'absolute', bottom: 0, width: '100%', height: GAME_CONFIG.FLOOR_HEIGHT, backgroundColor: '#ded895', borderTopWidth: 4, borderColor: '#54802a' }}>
      <Animated.View style={[{ flexDirection: 'row', width: GAME_CONFIG.SCREEN_WIDTH * 2 }, style]}>
        {[0, 1].map(i => (
           <View key={i} style={{ width: GAME_CONFIG.SCREEN_WIDTH, height: '100%', flexDirection: 'row' }}>
             {Array.from({ length: 20 }).map((_, j) => (
                <View key={j} style={{ width: 2, height: 15, backgroundColor: '#54802a', marginLeft: 20, transform: [{ rotate: '45deg' }] }} />
             ))}
           </View>
        ))}
      </Animated.View>
    </View>
  );
};

export default function GameScreen() {
  const {
    score, highScore, gameOver, gameRunning, showMenu, leaderboard, activePowerUp, dailyChallenges,
    birdY, birdVelocity, birdSize, pipe1X, pipe1GapY, pipe2X, pipe2GapY, pipe3X, pipe3GapY,
    powerUpX, powerUpY, currentPowerUpType, groundX, cloudX, flap, resetGame, returnToMenu,
  } = useGameEngine();

  const wingTranslation = useSharedValue(0);
  const menuFloatingY = useSharedValue(0);
  const scoreSV = useDerivedValue(() => score);
  
  const backgroundStyle = useAnimatedStyle(() => {
    const colorIndex = Math.floor(scoreSV.value / 10) % GAME_CONFIG.BACKGROUND_COLORS.length;
    const nextColorIndex = (colorIndex + 1) % GAME_CONFIG.BACKGROUND_COLORS.length;
    const progress = interpolate(scoreSV.value % 10, [8, 10], [0, 1], Extrapolation.CLAMP);
    return { backgroundColor: interpolateColor(progress, [0, 1], [GAME_CONFIG.BACKGROUND_COLORS[colorIndex], GAME_CONFIG.BACKGROUND_COLORS[nextColorIndex]]) };
  });

  const cloudOpacityStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scoreSV.value % 50, [15, 25, 35], [1, 0.2, 1], Extrapolation.CLAMP)
  }));

  const birdStyle = useAnimatedStyle(() => {
    const rotation = interpolate(birdVelocity.value, [-10, 10], [-20, 30], Extrapolation.CLAMP);
    return { 
      width: birdSize.value,
      height: birdSize.value,
      transform: [{ translateY: birdY.value }, { rotate: `${rotation}deg` }] 
    };
  });

  const wingStyle = useAnimatedStyle(() => ({ transform: [{ translateY: wingTranslation.value }] }));
  const menuStyle = useAnimatedStyle(() => ({ transform: [{ translateY: menuFloatingY.value }] }));

  useEffect(() => {
    menuFloatingY.value = withRepeat(withTiming(10, { duration: 1500 }), -1, true);
  }, []);

  const handlePress = () => {
    wingTranslation.value = withSequence(withTiming(-6, { duration: 40 }), withTiming(6, { duration: 80 }), withTiming(0, { duration: 60 }));
    flap();
  };

  return (
    <TouchableWithoutFeedback onPressIn={handlePress}>
      <Animated.View style={[{ flex: 1 }, backgroundStyle]}>
        <CelestialBodies scoreSV={scoreSV} />
        <ScrollingClouds x={cloudX} opacityStyle={cloudOpacityStyle} />
        <PipeSet x={pipe1X} gapY={pipe1GapY} />
        <PipeSet x={pipe2X} gapY={pipe2GapY} />
        <PipeSet x={pipe3X} gapY={pipe3GapY} />
        <PowerUpCollectible x={powerUpX} y={powerUpY} type={currentPowerUpType} />
        <ScrollingGround x={groundX} />

        <Animated.View style={[{ position: "absolute", top: 0, left: GAME_CONFIG.BIRD_X, zIndex: 10, justifyContent: 'center', alignItems: 'center' }, birdStyle]}>
          {activePowerUp === 'shield' && (
            <View style={{ position: 'absolute', inset: -8, borderRadius: 10, borderWidth: 4, borderColor: '#3498db', backgroundColor: 'rgba(52, 152, 219, 0.2)' }} />
          )}
          {activePowerUp === 'shrink' && (
             <View style={{ position: 'absolute', inset: -4, borderRadius: 8, borderWidth: 2, borderColor: '#9b59b6', borderStyle: 'dashed' }} />
          )}

          <View style={{ flex: 1, width: '100%', backgroundColor: "#ff5e5e", borderRadius: 6, borderWidth: 3, borderColor: "#2d3436" }}>
            <View style={{ position: 'absolute', top: '15%', right: '15%', width: '25%', height: '25%', backgroundColor: 'white', borderRadius: 2, borderWidth: 2, borderColor: '#2d3436' }}>
              <View style={{ position: 'absolute', right: 0, top: 0, width: 2, height: 2, backgroundColor: 'black' }} />
            </View>
            <View style={{ position: 'absolute', top: '40%', right: '-20%', width: '30%', height: '30%', backgroundColor: '#fab1a0', borderRadius: 2, borderWidth: 3, borderColor: "#2d3436" }} />
          </View>
          <Animated.View style={[{ position: 'absolute', top: '40%', left: '-15%', width: '45%', height: '35%', backgroundColor: 'white', borderRadius: 2, borderWidth: 3, borderColor: "#2d3436", zIndex: 11 }, wingStyle]} />
        </Animated.View>

        {!showMenu && !gameOver && (
          <View style={{ marginTop: 80, alignItems: 'center' }}>
            <Text style={{ fontSize: 80, fontWeight: "bold", color: "white", textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}>
              {score}
            </Text>
            {activePowerUp !== 'none' && (
              <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 10, marginTop: -10 }}>
                <Text style={{ color: 'white', fontWeight: 'bold' }}>{activePowerUp.toUpperCase()} ACTIVE!</Text>
              </View>
            )}
          </View>
        )}

        {showMenu && (
           <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
             <Animated.View style={[{ position: 'absolute', top: '5%', alignSelf: 'center', alignItems: 'center' }, menuStyle]}>
               <Text style={{ fontSize: 48, fontWeight: "900", color: "white", textShadowColor: 'rgba(0,0,0,0.3)', textShadowRadius: 10 }}>MOCKINGBIRD</Text>
               <View style={{ backgroundColor: "#ff5e5e", paddingHorizontal: 40, paddingVertical: 15, borderRadius: 10, borderWidth: 4, borderColor: '#2d3436', marginTop: 40 }}>
                  <Text style={{ fontSize: 24, fontWeight: "900", color: "white" }}>START</Text>
               </View>
               <View style={{ backgroundColor: 'rgba(0,0,0,0.1)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 30 }}>
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>BEST: {highScore}</Text>
               </View>
             </Animated.View>
             
             <View style={{ 
              position: 'absolute',
              top: '43%',
              left: 0,
              right: 0,
              width: '100%',
              alignItems: 'center',
              zIndex: 20
            }}>
            <DailyChallenges challenges={dailyChallenges} />
          </View>
           </View>
        )}

        {!gameRunning && !gameOver && !showMenu && (
           <View style={{ position: 'absolute', top: '50%', alignSelf: 'center', alignItems: 'center' }}>
             <Text style={{ fontSize: 20, color: 'white', fontWeight: 'bold', letterSpacing: 1 }}>TAP TO FLAP</Text>
           </View>
        )}

        {gameOver && (
          <View style={{ position: "absolute", top: "25%", alignSelf: "center", alignItems: "center", backgroundColor: "white", padding: 30, borderRadius: 10, width: '80%', borderWidth: 4, borderColor: '#566573', elevation: 10 }}>
            <Text style={{ fontSize: 28, fontWeight: "bold", color: "#566573" }}>GAME OVER</Text>
            <View style={{ marginVertical: 20, alignItems: 'center' }}>
               <Text style={{ fontSize: 40, fontWeight: "bold", color: "#2c3e50" }}>{score}</Text>
               <Text style={{ fontSize: 14, color: "#95a5a6", marginTop: 5 }}>BEST: {highScore}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableWithoutFeedback onPress={resetGame}>
                <View style={{ backgroundColor: "#e67e22", paddingHorizontal: 25, paddingVertical: 12, borderRadius: 4, borderWidth: 3, borderColor: '#566573' }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>RESTART</Text>
                </View>
              </TouchableWithoutFeedback>
              <TouchableWithoutFeedback onPress={returnToMenu}>
                <View style={{ backgroundColor: "#3498db", paddingHorizontal: 25, paddingVertical: 12, borderRadius: 4, borderWidth: 3, borderColor: '#566573' }}>
                  <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>MENU</Text>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        )}
      </Animated.View>
    </TouchableWithoutFeedback>
  );
}
