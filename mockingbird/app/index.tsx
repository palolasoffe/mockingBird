import { useEffect, useState } from "react";
import { Text, TouchableWithoutFeedback, View, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  useFrameCallback,
  runOnJS 
} from "react-native-reanimated";
import { GAME_CONFIG } from "@/constants/game-config";

export default function GameScreen() {
  // Game State (UI only)
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [leaderboard, setLeaderboard] = useState<number[]>([]);

  // Engine Values (Physics) - Running on the UI Thread
  const birdY = useSharedValue(GAME_CONFIG.INITIAL_BIRD_Y);
  const birdVelocity = useSharedValue(0);
  const pipesX = useSharedValue(GAME_CONFIG.PIPE_SPAWN_X);
  const [pipeGapY, setPipeGapY] = useState(200);

  const birdAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: birdY.value },
      { rotate: `${Math.min(Math.max(birdVelocity.value * 3, -30), 90)}deg` }
    ],
  }));

  const pipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pipesX.value }],
  }));

  const handleGameOver = async (finalScore: number) => {
    setGameOver(true);
    setGameRunning(false);

    // Load existing scores to update leaderboard
    const savedScores = await AsyncStorage.getItem("SCORES");
    let scores = savedScores ? JSON.parse(savedScores) : [];
    scores.push(finalScore);
    scores.sort((a: number, b: number) => b - a);
    const top10 = scores.slice(0, 10);
    
    setLeaderboard(top10);
    await AsyncStorage.setItem("SCORES", JSON.stringify(top10));

    if (finalScore > highScore) {
      setHighScore(finalScore);
      await AsyncStorage.setItem("HIGH_SCORE", String(finalScore));
    }
  };

  useFrameCallback(() => {
    if (!gameRunning || gameOver) return;

    // 1. Bird Physics
    birdVelocity.value += GAME_CONFIG.GRAVITY;
    birdY.value += birdVelocity.value;

    // 2. Ground/Ceiling Collision
    if (birdY.value <= 0 || birdY.value >= GAME_CONFIG.SCREEN_HEIGHT - GAME_CONFIG.BIRD_SIZE) {
      runOnJS(handleGameOver)(score);
    }

    // 3. Pipe Movement
    pipesX.value -= GAME_CONFIG.PIPE_SPEED;

    // 4. Reset Pipe & Spawn New Gap
    if (pipesX.value < -GAME_CONFIG.PIPE_WIDTH) {
      pipesX.value = GAME_CONFIG.PIPE_SPAWN_X;
      // Randomize next gap position
      const nextGap = Math.random() * (GAME_CONFIG.PIPE_MAX_GAP_Y - GAME_CONFIG.PIPE_MIN_GAP_Y) + GAME_CONFIG.PIPE_MIN_GAP_Y;
      runOnJS(setPipeGapY)(nextGap);
      runOnJS(setScore)(s => s + 1);
    }

    // 5. Pipe Collision Logic (Precise math on UI thread)
    const birdRight = GAME_CONFIG.BIRD_X + GAME_CONFIG.BIRD_SIZE;
    const birdLeft = GAME_CONFIG.BIRD_X;
    const pipeRight = pipesX.value + GAME_CONFIG.PIPE_WIDTH;
    const pipeLeft = pipesX.value;

    const withinX = birdRight > pipeLeft && birdLeft < pipeRight;
    
    if (withinX) {
      const hitsTop = birdY.value < pipeGapY;
      const hitsBottom = birdY.value + GAME_CONFIG.BIRD_SIZE > pipeGapY + GAME_CONFIG.PIPE_GAP;
      if (hitsTop || hitsBottom) {
        runOnJS(handleGameOver)(score);
      }
    }
  });

  const flap = () => {
    if (gameOver) {
      resetGame();
      return;
    }
    if (!gameRunning) {
      setGameRunning(true);
      return;
    }
    birdVelocity.value = GAME_CONFIG.FLAP_STRENGTH;
  };

  const resetGame = () => {
    birdY.value = GAME_CONFIG.INITIAL_BIRD_Y;
    birdVelocity.value = 0;
    pipesX.value = GAME_CONFIG.PIPE_SPAWN_X;
    setScore(0);
    setGameOver(false);
    setGameRunning(true);
  };

  useEffect(() => {
    const init = async () => {
      const saved = await AsyncStorage.getItem("HIGH_SCORE");
      const savedScores = await AsyncStorage.getItem("SCORES");
      if (saved) setHighScore(Number(saved));
      if (savedScores) setLeaderboard(JSON.parse(savedScores));
    };
    init();
  }, []);

  return (
    <TouchableWithoutFeedback onPress={flap}>
      <View style={{ flex: 1, backgroundColor: "#70c5ce" }}>
        {/* Bird */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: GAME_CONFIG.BIRD_X,
              width: GAME_CONFIG.BIRD_SIZE,
              height: GAME_CONFIG.BIRD_SIZE,
              backgroundColor: "yellow",
              borderRadius: GAME_CONFIG.BIRD_SIZE / 2,
              zIndex: 10,
            },
            birdAnimatedStyle,
          ]}
        />

        {/* Pipes */}
        <Animated.View style={[{ position: "absolute", inset: 0 }, pipeAnimatedStyle]}>
          {/* Top Pipe */}
          <View
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: GAME_CONFIG.PIPE_WIDTH,
              height: pipeGapY,
              backgroundColor: "green",
              borderBottomWidth: 5,
              borderColor: "#1a4a1a",
            }}
          />
          {/* Bottom Pipe */}
          <View
            style={{
              position: "absolute",
              left: 0,
              top: pipeGapY + GAME_CONFIG.PIPE_GAP,
              width: GAME_CONFIG.PIPE_WIDTH,
              height: GAME_CONFIG.SCREEN_HEIGHT,
              backgroundColor: "green",
              borderTopWidth: 5,
              borderColor: "#1a4a1a",
            }}
          />
        </Animated.View>

        {/* Score UI */}
        <View style={{ marginTop: 60, alignItems: 'center' }}>
          <Text style={{ color: "white", fontSize: 18, opacity: 0.8 }}>MockingBird 🐦</Text>
          <Text style={{ fontSize: 80, fontWeight: "900", color: "white", textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 2, height: 2 }, textShadowRadius: 5 }}>
            {score}
          </Text>
        </View>

        {!gameRunning && !gameOver && (
           <View style={{ position: 'absolute', top: '50%', alignSelf: 'center' }}>
             <Text style={{ fontSize: 24, color: 'white', fontWeight: 'bold' }}>TAP TO START</Text>
           </View>
        )}

        {gameOver && (
          <View
            style={{
              position: "absolute",
              top: "25%",
              alignSelf: "center",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.9)",
              padding: 30,
              borderRadius: 25,
              width: '80%',
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: 0.3,
              shadowRadius: 20,
            }}
          >
            <Text style={{ fontSize: 32, fontWeight: "900", color: "#d32f2f" }}>GAME OVER</Text>
            <View style={{ marginVertical: 20, alignItems: 'center' }}>
               <Text style={{ fontSize: 18, color: "#555" }}>Current Score: {score}</Text>
               <Text style={{ fontSize: 22, fontWeight: "bold", color: "#333" }}>Best: {highScore}</Text>
            </View>
            
            <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>TOP SCORES</Text>
            <ScrollView style={{ maxHeight: 120, width: '100%' }}>
              {leaderboard.map((s, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#eee' }}>
                  <Text style={{ color: "#333" }}>#{i + 1}</Text>
                  <Text style={{ fontWeight: 'bold' }}>{s}</Text>
                </View>
              ))}
            </ScrollView>

            <View style={{ backgroundColor: "#70c5ce", paddingHorizontal: 30, paddingVertical: 15, borderRadius: 30, marginTop: 25 }}>
              <Text style={{ fontSize: 18, fontWeight: "bold", color: "white" }}>Restart</Text>
            </View>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
