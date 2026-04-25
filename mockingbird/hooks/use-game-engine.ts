import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
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

  // Sound Refs
  const jumpSound = useRef<Audio.Sound | null>(null);
  const coinSound = useRef<Audio.Sound | null>(null);
  const crashSound = useRef<Audio.Sound | null>(null);

  // Engine Values (Physics)
  const birdY = useSharedValue(GAME_CONFIG.INITIAL_BIRD_Y);
  const birdVelocity = useSharedValue(0);
  
  // Multiple Pipes
  const pipe1X = useSharedValue(GAME_CONFIG.PIPE_SPAWN_X);
  const pipe1GapY = useSharedValue(200);
  const pipe1Scored = useSharedValue(false);

  const pipe2X = useSharedValue(GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING);
  const pipe2GapY = useSharedValue(300);
  const pipe2Scored = useSharedValue(false);

  const pipe3X = useSharedValue(GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING * 2);
  const pipe3GapY = useSharedValue(250);
  const pipe3Scored = useSharedValue(false);

  // Parallax Values
  const groundX = useSharedValue(0);
  const cloudX = useSharedValue(0);

  // Status
  const isPlaying = useSharedValue(false);
  const isDead = useSharedValue(false);

  const playSound = async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    try {
      if (soundRef.current) {
        await soundRef.current.replayAsync();
      }
    } catch (e) {
      console.log("Error playing sound", e);
    }
  };

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
    playSound(crashSound);
    
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
    playSound(coinSound);
  }, []);

  useFrameCallback(() => {
    if (!isPlaying.value || isDead.value) return;

    // 1. Bird Physics
    birdVelocity.value += GAME_CONFIG.GRAVITY;
    birdY.value += birdVelocity.value;

    const groundLevel = GAME_CONFIG.SCREEN_HEIGHT - GAME_CONFIG.FLOOR_HEIGHT - GAME_CONFIG.BIRD_SIZE;
    if (birdY.value <= 0 || birdY.value >= groundLevel) {
      runOnJS(handleGameOver)(score);
    }

    // 2. Parallax Scrolling
    groundX.value -= GAME_CONFIG.GROUND_SPEED;
    if (groundX.value <= -GAME_CONFIG.SCREEN_WIDTH) groundX.value = 0;

    cloudX.value -= GAME_CONFIG.CLOUD_SPEED;
    if (cloudX.value <= -GAME_CONFIG.SCREEN_WIDTH) cloudX.value = 0;

    // 3. Pipes Movement & Collision
    const pipes = [
      { x: pipe1X, gapY: pipe1GapY, scored: pipe1Scored },
      { x: pipe2X, gapY: pipe2GapY, scored: pipe2Scored },
      { x: pipe3X, gapY: pipe3GapY, scored: pipe3Scored }
    ];

    pipes.forEach(pipe => {
      pipe.x.value -= GAME_CONFIG.PIPE_SPEED;

      if (pipe.x.value < -GAME_CONFIG.PIPE_WIDTH) {
        const maxX = Math.max(pipe1X.value, pipe2X.value, pipe3X.value);
        pipe.x.value = maxX + GAME_CONFIG.PIPE_SPACING;
        pipe.gapY.value = Math.random() * (GAME_CONFIG.PIPE_MAX_GAP_Y - GAME_CONFIG.PIPE_MIN_GAP_Y) + GAME_CONFIG.PIPE_MIN_GAP_Y;
        pipe.scored.value = false;
      }

      if (!pipe.scored.value && pipe.x.value + GAME_CONFIG.PIPE_WIDTH < GAME_CONFIG.BIRD_X) {
        pipe.scored.value = true;
        runOnJS(handleScoreUpdate)();
      }

      const birdRight = GAME_CONFIG.BIRD_X + GAME_CONFIG.BIRD_SIZE;
      const birdLeft = GAME_CONFIG.BIRD_X;
      const pipeRight = pipe.x.value + GAME_CONFIG.PIPE_WIDTH;
      const pipeLeft = pipe.x.value;

      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        const hitsTop = birdY.value < pipe.gapY.value;
        const hitsBottom = birdY.value + GAME_CONFIG.BIRD_SIZE > pipe.gapY.value + GAME_CONFIG.PIPE_GAP;
        if (hitsTop || hitsBottom) {
          runOnJS(handleGameOver)(score);
        }
      }
    });
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
    playSound(jumpSound);
  }, [gameOver, gameRunning]);

  const resetGame = useCallback(() => {
    birdY.value = GAME_CONFIG.INITIAL_BIRD_Y;
    birdVelocity.value = 0;
    
    pipe1X.value = GAME_CONFIG.PIPE_SPAWN_X;
    pipe1GapY.value = 200;
    pipe1Scored.value = false;

    pipe2X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING;
    pipe2GapY.value = 300;
    pipe2Scored.value = false;

    pipe3X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING * 2;
    pipe3GapY.value = 250;
    pipe3Scored.value = false;

    groundX.value = 0;
    cloudX.value = 0;

    setScore(0);
    setGameOver(false);
    setGameRunning(true);
    isDead.value = false;
    isPlaying.value = true;
  }, []);

  useEffect(() => {
    const init = async () => {
      // Load scores
      const saved = await AsyncStorage.getItem("HIGH_SCORE");
      const savedScores = await AsyncStorage.getItem("SCORES");
      if (saved) setHighScore(Number(saved));
      if (savedScores) setLeaderboard(JSON.parse(savedScores));

      // Load sounds
      const { sound: jSound } = await Audio.Sound.createAsync(require("@/assets/audio/jump.mp3"));
      const { sound: cSound } = await Audio.Sound.createAsync(require("@/assets/audio/coin.mp3"));
      const { sound: crSound } = await Audio.Sound.createAsync(require("@/assets/audio/crash.mp3"));
      
      // Make coin sound more quiet
      await cSound.setVolumeAsync(0.4);
      
      jumpSound.current = jSound;
      coinSound.current = cSound;
      crashSound.current = crSound;
    };
    init();

    return () => {
      // Unload sounds
      jumpSound.current?.unloadAsync();
      coinSound.current?.unloadAsync();
      crashSound.current?.unloadAsync();
    };
  }, []);

  return {
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
    resetGame
  };
};
