import { Text, TouchableWithoutFeedback, View, ScrollView } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  withSequence, 
  withSpring, 
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolation
} from "react-native-reanimated";
import { GAME_CONFIG } from "@/constants/game-config";
import { useGameEngine } from "@/hooks/use-game-engine";

export default function GameScreen() {
  const {
    score,
    highScore,
    gameOver,
    gameRunning,
    leaderboard,
    pipeGapY,
    birdY,
    birdVelocity,
    pipeAnimatedStyle,
    flap,
  } = useGameEngine();

  const wingTranslation = useSharedValue(0);

  const birdStyle = useAnimatedStyle(() => {
    const rotation = interpolate(
      birdVelocity.value,
      [-10, 10],
      [-20, 30],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateY: birdY.value },
        { rotate: `${rotation}deg` },
      ],
    };
  });

  const wingStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: wingTranslation.value }]
  }));

  const handlePress = () => {
    // Tiny, quick wing flap
    wingTranslation.value = withSequence(
      withTiming(-6, { duration: 40 }),
      withTiming(6, { duration: 80 }),
      withTiming(0, { duration: 60 })
    );

    flap();
  };

  return (
    <TouchableWithoutFeedback onPressIn={handlePress}>
      <View style={{ flex: 1, backgroundColor: "#4ec0ca" }}>
        
        {/* Square Bird Container */}
        <Animated.View style={[
          {
            position: "absolute",
            top: 0,
            left: GAME_CONFIG.BIRD_X,
            width: GAME_CONFIG.BIRD_SIZE,
            height: GAME_CONFIG.BIRD_SIZE,
            zIndex: 10,
          },
          birdStyle
        ]}>
          {/* Main Square Body */}
          <View style={{ 
            flex: 1, 
            backgroundColor: "#ff5e5e", // Vibrant Red
            borderRadius: 6,
            borderWidth: 3, 
            borderColor: "#2d3436",
          }}>
            {/* Minimalist Eye */}
            <View style={{ 
              position: 'absolute', 
              top: 6, 
              right: 6, 
              width: 8, 
              height: 8, 
              backgroundColor: 'white', 
              borderRadius: 2,
              borderWidth: 2,
              borderColor: '#2d3436'
            }}>
              <View style={{ position: 'absolute', right: 0, top: 0, width: 2, height: 2, backgroundColor: 'black' }} />
            </View>

            {/* Simple Blocky Beak */}
            <View style={{ 
              position: 'absolute', 
              top: 14, 
              right: -8, 
              width: 10, 
              height: 10, 
              backgroundColor: '#fab1a0', // Soft Orange
              borderRadius: 2, 
              borderWidth: 3, 
              borderColor: "#2d3436" 
            }} />
          </View>

          {/* Tiny Moving Wing */}
          <Animated.View style={[
            {
              position: 'absolute',
              top: 14,
              left: -4,
              width: 14,
              height: 10,
              backgroundColor: 'white',
              borderRadius: 2,
              borderWidth: 3,
              borderColor: "#2d3436",
              zIndex: 11,
            },
            wingStyle
          ]} />
        </Animated.View>

        {/* Minimalist Pipes */}
        <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: GAME_CONFIG.PIPE_WIDTH }, pipeAnimatedStyle]}>
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: pipeGapY }}>
            <View style={{ flex: 1, backgroundColor: "#73bf2e", borderLeftWidth: 4, borderRightWidth: 4, borderColor: "#54802a" }}>
               <View style={{ position: 'absolute', right: 8, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
            <View style={{ position: 'absolute', bottom: 0, left: -6, right: -6, height: 24, backgroundColor: "#73bf2e", borderWidth: 4, borderColor: "#54802a", borderRadius: 2 }} />
          </View>

          <View style={{ position: "absolute", top: pipeGapY + GAME_CONFIG.PIPE_GAP, left: 0, right: 0, bottom: 0 }}>
            <View style={{ flex: 1, backgroundColor: "#73bf2e", borderLeftWidth: 4, borderRightWidth: 4, borderColor: "#54802a" }}>
               <View style={{ position: 'absolute', right: 8, top: 0, bottom: 0, width: 4, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            </View>
            <View style={{ position: 'absolute', top: 0, left: -6, right: -6, height: 24, backgroundColor: "#73bf2e", borderWidth: 4, borderColor: "#54802a", borderRadius: 2 }} />
          </View>
        </Animated.View>

        {/* Clean Score */}
        <View style={{ marginTop: 80, alignItems: 'center' }}>
          <Text style={{ fontSize: 80, fontWeight: "bold", color: "white", textShadowColor: 'rgba(0,0,0,0.2)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 4 }}>
            {score}
          </Text>
        </View>

        {!gameRunning && !gameOver && (
           <View style={{ position: 'absolute', top: '50%', alignSelf: 'center', alignItems: 'center' }}>
             <Text style={{ fontSize: 20, color: 'white', fontWeight: 'bold', letterSpacing: 1 }}>TAP TO START</Text>
           </View>
        )}

        {gameOver && (
          <View style={{ position: "absolute", top: "30%", alignSelf: "center", alignItems: "center", backgroundColor: "white", padding: 30, borderRadius: 10, width: '80%', borderWidth: 4, borderColor: '#566573' }}>
            <Text style={{ fontSize: 28, fontWeight: "bold", color: "#566573" }}>GAME OVER</Text>
            
            <View style={{ marginVertical: 20, alignItems: 'center' }}>
               <Text style={{ fontSize: 40, fontWeight: "bold", color: "#2c3e50" }}>{score}</Text>
               <Text style={{ fontSize: 14, color: "#95a5a6", marginTop: 5 }}>BEST: {highScore}</Text>
            </View>

            <View style={{ backgroundColor: "#e67e22", paddingHorizontal: 30, paddingVertical: 12, borderRadius: 4, borderWidth: 3, borderColor: '#566573' }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>RESTART</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
