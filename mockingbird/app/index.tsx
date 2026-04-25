import { Text, TouchableWithoutFeedback, View, ScrollView } from "react-native";
import Animated, { 
  useAnimatedStyle, 
  withSequence, 
  withTiming,
  useSharedValue,
  interpolate,
  Extrapolation
} from "react-native-reanimated";
import { GAME_CONFIG } from "@/constants/game-config";
import { useGameEngine } from "@/hooks/use-game-engine";

const PipeSet = ({ x, gapY }: { x: Animated.SharedValue<number>, gapY: Animated.SharedValue<number> }) => {
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));

  const topPipeStyle = useAnimatedStyle(() => ({
    height: gapY.value
  }));

  const bottomPipeStyle = useAnimatedStyle(() => ({
    top: gapY.value + GAME_CONFIG.PIPE_GAP
  }));

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

const ScrollingClouds = ({ x }: { x: Animated.SharedValue<number> }) => {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));

  const Cloud = ({ top, left, scale }: { top: number, left: number, scale: number }) => (
    <View style={{ position: 'absolute', top, left, transform: [{ scale }] }}>
      <View style={{ width: 60, height: 30, backgroundColor: 'white', borderRadius: 20, opacity: 0.8 }} />
      <View style={{ width: 40, height: 40, backgroundColor: 'white', borderRadius: 20, position: 'absolute', top: -15, left: 10, opacity: 0.8 }} />
    </View>
  );

  return (
    <Animated.View style={[{ position: 'absolute', top: 100, width: GAME_CONFIG.SCREEN_WIDTH * 2, height: 200 }, style]}>
      <Cloud top={20} left={50} scale={1} />
      <Cloud top={80} left={250} scale={0.8} />
      <Cloud top={20} left={GAME_CONFIG.SCREEN_WIDTH + 50} scale={1} />
      <Cloud top={80} left={GAME_CONFIG.SCREEN_WIDTH + 250} scale={0.8} />
    </Animated.View>
  );
};

const ScrollingGround = ({ x }: { x: Animated.SharedValue<number> }) => {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));

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
    score,
    highScore,
    gameOver,
    gameRunning,
    leaderboard,
    birdY,
    birdVelocity,
    pipe1X,
    pipe1GapY,
    pipe2X,
    pipe2GapY,
    pipe3X,
    pipe3GapY,
    groundX,
    cloudX,
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
        
        <ScrollingClouds x={cloudX} />
        
        {/* Pipes Stream */}
        <PipeSet x={pipe1X} gapY={pipe1GapY} />
        <PipeSet x={pipe2X} gapY={pipe2GapY} />
        <PipeSet x={pipe3X} gapY={pipe3GapY} />

        <ScrollingGround x={groundX} />

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
          <View style={{ 
            flex: 1, 
            backgroundColor: "#ff5e5e", 
            borderRadius: 6,
            borderWidth: 3, 
            borderColor: "#2d3436",
          }}>
            <View style={{ position: 'absolute', top: 6, right: 6, width: 8, height: 8, backgroundColor: 'white', borderRadius: 2, borderWidth: 2, borderColor: '#2d3436' }}>
              <View style={{ position: 'absolute', right: 0, top: 0, width: 2, height: 2, backgroundColor: 'black' }} />
            </View>
            <View style={{ position: 'absolute', top: 14, right: -8, width: 10, height: 10, backgroundColor: '#fab1a0', borderRadius: 2, borderWidth: 3, borderColor: "#2d3436" }} />
          </View>
          <Animated.View style={[{ position: 'absolute', top: 14, left: -4, width: 14, height: 10, backgroundColor: 'white', borderRadius: 2, borderWidth: 3, borderColor: "#2d3436", zIndex: 11 }, wingStyle]} />
        </Animated.View>

        {/* HUD */}
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
          <View style={{ position: "absolute", top: "25%", alignSelf: "center", alignItems: "center", backgroundColor: "white", padding: 30, borderRadius: 10, width: '80%', borderWidth: 4, borderColor: '#566573', elevation: 10 }}>
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
