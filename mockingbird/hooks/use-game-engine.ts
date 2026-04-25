import { useState, useEffect, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { 
  useSharedValue, 
  useAnimatedStyle, 
  useFrameCallback, 
  runOnJS,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation
} from "react-native-reanimated";
import { GAME_CONFIG } from "@/constants/game-config";

export type PowerUpType = 'shield' | 'shrink' | 'none';

export const useGameEngine = () => {
  // UI State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [leaderboard, setLeaderboard] = useState<number[]>([]);

  // Power-up State (UI)
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType>('none');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound Refs
  const jumpSound = useRef<Audio.Sound | null>(null);
  const coinSound = useRef<Audio.Sound | null>(null);
  const crashSound = useRef<Audio.Sound | null>(null);
  const powerUpSound = useRef<Audio.Sound | null>(null);

  // Music Refs
  const musicTracks = useRef<{ [key: string]: Audio.Sound | null }>({
    day: null, sunset: null, night: null, magic: null, sea: null,
  });
  const currentMusicKey = useRef<string | null>(null);

  // Engine Values (Physics)
  const birdY = useSharedValue(GAME_CONFIG.INITIAL_BIRD_Y);
  const birdVelocity = useSharedValue(0);
  const birdSize = useSharedValue(GAME_CONFIG.BIRD_SIZE);
  
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

  // Power-up Shared Values
  const powerUpX = useSharedValue(-100);
  const powerUpY = useSharedValue(0);
  const currentPowerUpType = useSharedValue<PowerUpType>('none');
  const isInvincible = useSharedValue(false);
  const mercyFrames = useSharedValue(0);

  // Parallax Values
  const groundX = useSharedValue(0);
  const cloudX = useSharedValue(0);

  // Status
  const isPlaying = useSharedValue(false);
  const isDead = useSharedValue(false);

  // UTILITY FUNCTIONS
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' | 'success' | 'error') => {
    switch(type) {
      case 'light': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); break;
      case 'medium': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); break;
      case 'heavy': Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); break;
      case 'success': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); break;
      case 'error': Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); break;
    }
  };

  const playSound = async (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    try { if (soundRef.current) await soundRef.current.replayAsync(); } 
    catch (e) { console.log("Error playing sound", e); }
  };

  const setPowerUpTimer = (type: PowerUpType) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setActivePowerUp('none');
      if (type === 'shrink') birdSize.value = withTiming(GAME_CONFIG.BIRD_SIZE);
      if (type === 'shield') isInvincible.value = false;
    }, GAME_CONFIG.POWERUP_DURATION);
  };

  const activatePowerUp = (type: PowerUpType) => {
    "worklet";
    runOnJS(setActivePowerUp)(type);
    runOnJS(playSound)(powerUpSound);
    runOnJS(triggerHaptic)('success');
    if (type === 'shield') isInvincible.value = true;
    else if (type === 'shrink') birdSize.value = withTiming(GAME_CONFIG.BIRD_SIZE * 0.6);
    runOnJS(setPowerUpTimer)(type);
  };

  const updateMusic = useCallback(async (newScore: number) => {
    const keys = ['day', 'sunset', 'night', 'magic', 'sea'];
    const bracket = Math.floor(newScore / 10) % keys.length;
    const nextKey = keys[bracket];
    if (currentMusicKey.current !== nextKey) {
      if (currentMusicKey.current) await musicTracks.current[currentMusicKey.current]?.stopAsync();
      const nextTrack = musicTracks.current[nextKey];
      if (nextTrack) { await nextTrack.playAsync(); currentMusicKey.current = nextKey; }
    }
  }, []);

  useEffect(() => {
    if (gameRunning && !gameOver) updateMusic(score);
    else if (currentMusicKey.current) {
      musicTracks.current[currentMusicKey.current]?.stopAsync();
      currentMusicKey.current = null;
    }
  }, [gameRunning, gameOver, score, updateMusic]);

  const handleGameOver = useCallback((finalScore: number) => {
    setGameOver(true); setGameRunning(false); isPlaying.value = false; isDead.value = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    triggerHaptic('error'); playSound(crashSound);
    const updateStorage = async () => {
      const savedScores = await AsyncStorage.getItem("SCORES");
      let scores = savedScores ? JSON.parse(savedScores) : [];
      scores.push(finalScore); scores.sort((a: number, b: number) => b - a);
      const top10 = scores.slice(0, 10); setLeaderboard(top10);
      await AsyncStorage.setItem("SCORES", JSON.stringify(top10));
      if (finalScore > highScore) { setHighScore(finalScore); await AsyncStorage.setItem("HIGH_SCORE", String(finalScore)); }
    };
    updateStorage();
  }, [highScore]);

  const handleScoreUpdate = useCallback(() => { setScore(s => s + 1); triggerHaptic('success'); playSound(coinSound); }, []);

  useFrameCallback(() => {
    if (!isPlaying.value || isDead.value) return;

    birdVelocity.value += GAME_CONFIG.GRAVITY;
    birdY.value += birdVelocity.value;

    const groundLevel = GAME_CONFIG.SCREEN_HEIGHT - GAME_CONFIG.FLOOR_HEIGHT - birdSize.value;
    if (birdY.value <= 0 || birdY.value >= groundLevel) {
       if (isInvincible.value || mercyFrames.value > 0) {
          birdY.value = groundLevel - 5;
          birdVelocity.value = GAME_CONFIG.FLAP_STRENGTH;
          isInvincible.value = false;
          mercyFrames.value = 60;
          runOnJS(setActivePowerUp)('none');
       } else {
          runOnJS(handleGameOver)(score);
       }
    }

    groundX.value -= GAME_CONFIG.GROUND_SPEED;
    if (groundX.value <= -GAME_CONFIG.SCREEN_WIDTH) groundX.value = 0;
    cloudX.value -= GAME_CONFIG.CLOUD_SPEED;
    if (cloudX.value <= -GAME_CONFIG.SCREEN_WIDTH) cloudX.value = 0;

    if (powerUpX.value > -GAME_CONFIG.POWERUP_SIZE - 20) {
      powerUpX.value -= GAME_CONFIG.PIPE_SPEED;
      const withinX = GAME_CONFIG.BIRD_X + birdSize.value > powerUpX.value && GAME_CONFIG.BIRD_X < powerUpX.value + GAME_CONFIG.POWERUP_SIZE;
      const withinY = birdY.value + birdSize.value > powerUpY.value && birdY.value < powerUpY.value + GAME_CONFIG.POWERUP_SIZE;
      if (withinX && withinY) { activatePowerUp(currentPowerUpType.value); powerUpX.value = -200; }
    }

    const pipes = [{ x: pipe1X, gapY: pipe1GapY, scored: pipe1Scored }, { x: pipe2X, gapY: pipe2GapY, scored: pipe2Scored }, { x: pipe3X, gapY: pipe3GapY, scored: pipe3Scored }];

    pipes.forEach(pipe => {
      pipe.x.value -= GAME_CONFIG.PIPE_SPEED;
      if (pipe.x.value < -GAME_CONFIG.PIPE_WIDTH) {
        const maxX = Math.max(pipe1X.value, pipe2X.value, pipe3X.value);
        pipe.x.value = maxX + GAME_CONFIG.PIPE_SPACING;
        pipe.gapY.value = Math.random() * (GAME_CONFIG.PIPE_MAX_GAP_Y - GAME_CONFIG.PIPE_MIN_GAP_Y) + GAME_CONFIG.PIPE_MIN_GAP_Y;
        pipe.scored.value = false;
        if (powerUpX.value < -GAME_CONFIG.POWERUP_SIZE && Math.random() < GAME_CONFIG.POWERUP_SPAWN_CHANCE) {
          powerUpX.value = pipe.x.value + GAME_CONFIG.PIPE_SPACING / 2;
          powerUpY.value = pipe.gapY.value + (GAME_CONFIG.PIPE_GAP / 2) - (GAME_CONFIG.POWERUP_SIZE / 2);
          currentPowerUpType.value = Math.random() > 0.5 ? 'shield' : 'shrink';
        }
      }
      if (!pipe.scored.value && pipe.x.value + GAME_CONFIG.PIPE_WIDTH < GAME_CONFIG.BIRD_X) {
        pipe.scored.value = true; runOnJS(handleScoreUpdate)();
      }
      const birdRight = GAME_CONFIG.BIRD_X + birdSize.value;
      const birdLeft = GAME_CONFIG.BIRD_X;
      const pipeRight = pipe.x.value + GAME_CONFIG.PIPE_WIDTH;
      const pipeLeft = pipe.x.value;
      if (birdRight > pipeLeft && birdLeft < pipeRight) {
        const hitsTop = birdY.value < pipe.gapY.value;
        const hitsBottom = birdY.value + birdSize.value > pipe.gapY.value + GAME_CONFIG.PIPE_GAP;
        if (hitsTop || hitsBottom) {
          if (isInvincible.value) {
             isInvincible.value = false;
             mercyFrames.value = 60;
             runOnJS(setActivePowerUp)('none');
             runOnJS(triggerHaptic)('heavy');
          } else if (mercyFrames.value <= 0) {
            runOnJS(handleGameOver)(score);
          }
        }
      }
    });

    if (mercyFrames.value > 0) mercyFrames.value -= 1;
  });

  const startFromMenu = useCallback(() => setShowMenu(false), []);
  const returnToMenu = useCallback(() => {
    setShowMenu(true); setGameOver(false); setGameRunning(false); isDead.value = false; isPlaying.value = false;
    birdY.value = GAME_CONFIG.INITIAL_BIRD_Y; birdVelocity.value = 0; birdSize.value = GAME_CONFIG.BIRD_SIZE;
    isInvincible.value = false; mercyFrames.value = 0; setActivePowerUp('none'); setScore(0); powerUpX.value = -200;
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const flap = useCallback(() => {
    if (isDead.value) { resetGame(); return; }
    if (showMenu) { startFromMenu(); return; }
    if (!isPlaying.value) { isPlaying.value = true; setGameRunning(true); triggerHaptic('medium'); }
    birdVelocity.value = GAME_CONFIG.FLAP_STRENGTH; triggerHaptic('light'); playSound(jumpSound);
  }, [gameOver, gameRunning, showMenu, startFromMenu]);

  const resetGame = useCallback(() => {
    birdY.value = GAME_CONFIG.INITIAL_BIRD_Y; birdVelocity.value = 0; birdSize.value = GAME_CONFIG.BIRD_SIZE;
    isInvincible.value = false; mercyFrames.value = 0; setActivePowerUp('none'); powerUpX.value = -200;
    if (timerRef.current) clearTimeout(timerRef.current);
    pipe1X.value = GAME_CONFIG.PIPE_SPAWN_X; pipe1GapY.value = 200; pipe1Scored.value = false;
    pipe2X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING; pipe2GapY.value = 300; pipe2Scored.value = false;
    pipe3X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING * 2; pipe3GapY.value = 250; pipe3Scored.value = false;
    groundX.value = 0; cloudX.value = 0; setScore(0); setGameOver(false); setGameRunning(true); isDead.value = false; isPlaying.value = true;
  }, []);

  useEffect(() => {
    const init = async () => {
      const saved = await AsyncStorage.getItem("HIGH_SCORE");
      const savedScores = await AsyncStorage.getItem("SCORES");
      if (saved) setHighScore(Number(saved));
      if (savedScores) setLeaderboard(JSON.parse(savedScores));
      const { sound: jSound } = await Audio.Sound.createAsync(require("@/assets/audio/jump.mp3"));
      const { sound: cSound } = await Audio.Sound.createAsync(require("@/assets/audio/coin.mp3"));
      const { sound: crSound } = await Audio.Sound.createAsync(require("@/assets/audio/crash.mp3"));
      powerUpSound.current = cSound; await cSound.setVolumeAsync(0.4);
      jumpSound.current = jSound; coinSound.current = cSound; crashSound.current = crSound;
      const tracks = {
        day: (await Audio.Sound.createAsync(require("@/assets/audio/day.mp3"), { isLooping: true, volume: 0.3 })).sound,
        sunset: (await Audio.Sound.createAsync(require("@/assets/audio/sunset.mp3"), { isLooping: true, volume: 0.3 })).sound,
        night: (await Audio.Sound.createAsync(require("@/assets/audio/night.mp3"), { isLooping: true, volume: 0.3 })).sound,
        magic: (await Audio.Sound.createAsync(require("@/assets/audio/magic_purple.mp3"), { isLooping: true, volume: 0.3 })).sound,
        sea: (await Audio.Sound.createAsync(require("@/assets/audio/deep_sea.mp3"), { isLooping: true, volume: 0.3 })).sound,
      };
      musicTracks.current = tracks;
    };
    init();
    return () => {
      jumpSound.current?.unloadAsync(); coinSound.current?.unloadAsync(); crashSound.current?.unloadAsync();
      Object.values(musicTracks.current).forEach(t => t?.unloadAsync());
    };
  }, []);

  return {
    score, highScore, gameOver, gameRunning, showMenu, leaderboard, activePowerUp,
    birdY, birdVelocity, birdSize, pipe1X, pipe1GapY, pipe2X, pipe2GapY, pipe3X, pipe3GapY,
    powerUpX, powerUpY, currentPowerUpType, groundX, cloudX, flap, resetGame, startFromMenu, returnToMenu
  };
};
