import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { 
  useSharedValue, 
  useAnimatedStyle, 
  useFrameCallback, 
  runOnJS 
} from "react-native-reanimated";
import { GAME_CONFIG } from "@/constants/game-config";

export const useGameEngine = () => {
  // UI State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [leaderboard, setLeaderboard] = useState<number[]>([]);
  const [pipeGapY, setPipeGapY] = useState(GAME_CONFIG.INITIAL_BIRD_Y - 80);

  // Engine Values (Physics)
  const birdY = useSharedValue(GAME_CONFIG.INITIAL_BIRD_Y);
  const birdVelocity = useSharedValue(0);
  const pipesX = useSharedValue(GAME_CONFIG.PIPE_SPAWN_X);
  
  // Game Status (Shared for the Worklet)
  const isPlaying = useSharedValue(false);
  const isDead = useSharedValue(false);

  const birdAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: birdY.value },
      { rotate: `${Math.min(Math.max(birdVelocity.value * 3, -30), 90)}deg` }
    ],
  }));

  const pipeAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: pipesX.value }],
  }));

  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    switch(type) {
      case 'light': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
      case 'medium': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case 'heavy': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
      case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    }
  };

  const handleGameOver = useCallback((finalScore: number) => {
    setGameOver(true);
    setGameRunning(false);
    isPlaying.value = false;
    isDead.value = true;
    triggerHaptic('error');
    
    const updateStorage = async () => {
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
    updateStorage();
  }, [highScore]);

  const handleScoreUpdate = useCallback(() => {
    setScore(s => s + 1);
    triggerHaptic('success');
  }, []);

  useFrameCallback(() => {
    if (!isPlaying.value || isDead.value) return;

    // 1. Gravity
    birdVelocity.value += GAME_CONFIG.GRAVITY;
    birdY.value += birdVelocity.value;

    // 2. Ceiling/Floor check
    if (birdY.value <= 0 || birdY.value >= GAME_CONFIG.SCREEN_HEIGHT - GAME_CONFIG.BIRD_SIZE) {
      runOnJS(handleGameOver)(score);
    }

    // 3. Pipes
    pipesX.value -= GAME_CONFIG.PIPE_SPEED;
    if (pipesX.value < -GAME_CONFIG.PIPE_WIDTH) {
      pipesX.value = GAME_CONFIG.PIPE_SPAWN_X;
      const nextGap = Math.random() * (GAME_CONFIG.PIPE_MAX_GAP_Y - GAME_CONFIG.PIPE_MIN_GAP_Y) + GAME_CONFIG.PIPE_MIN_GAP_Y;
      runOnJS(setPipeGapY)(nextGap);
      runOnJS(handleScoreUpdate)();
    }

    // 4. Collision
    const birdRight = GAME_CONFIG.BIRD_X + GAME_CONFIG.BIRD_SIZE;
    const birdLeft = GAME_CONFIG.BIRD_X;
    const pipeRight = pipesX.value + GAME_CONFIG.PIPE_WIDTH;
    const pipeLeft = pipesX.value;

    if (birdRight > pipeLeft && birdLeft < pipeRight) {
      const hitsTop = birdY.value < pipeGapY;
      const hitsBottom = birdY.value + GAME_CONFIG.BIRD_SIZE > pipeGapY + GAME_CONFIG.PIPE_GAP;
      if (hitsTop || hitsBottom) {
        runOnJS(handleGameOver)(score);
      }
    }
  });

  const flap = useCallback(() => {
    if (isDead.value) {
      resetGame();
      return;
    }
    
    if (!isPlaying.value) {
      isPlaying.value = true;
      setGameRunning(true);
      triggerHaptic('medium');
    }
    
    birdVelocity.value = GAME_CONFIG.FLAP_STRENGTH;
    triggerHaptic('light');
  }, [gameOver, gameRunning]);

  const resetGame = useCallback(() => {
    birdY.value = GAME_CONFIG.INITIAL_BIRD_Y;
    birdVelocity.value = 0;
    pipesX.value = GAME_CONFIG.PIPE_SPAWN_X;
    setScore(0);
    setGameOver(false);
    setGameRunning(true);
    isDead.value = false;
    isPlaying.value = true;
  }, []);

  useEffect(() => {
    const init = async () => {
      const saved = await AsyncStorage.getItem("HIGH_SCORE");
      const savedScores = await AsyncStorage.getItem("SCORES");
      if (saved) setHighScore(Number(saved));
      if (savedScores) setLeaderboard(JSON.parse(savedScores));
    };
    init();
  }, []);

  return {
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
    resetGame
  };
};
