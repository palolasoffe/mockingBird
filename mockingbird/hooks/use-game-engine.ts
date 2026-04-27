import { GAME_CONFIG } from "@/constants/game-config";
import { DailyChallenge, DailyChallengeData, loadDailyChallenges, updateMultipleChallenges } from "@/utils/daily-challenges";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  runOnJS,
  useFrameCallback,
  useSharedValue,
  withTiming
} from "react-native-reanimated";

export type PowerUpType = 'shield' | 'shrink' | 'none';

export const useGameEngine = () => {
  // UI State
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [showMenu, setShowMenu] = useState(true);
  const [leaderboard, setLeaderboard] = useState<number[]>([]);
  const [dailyChallenges, setDailyChallenges] = useState<DailyChallengeData | null>(null);
  const [completedChallenge, setCompletedChallenge] = useState<DailyChallenge | null>(null);
  const [totalStars, setTotalStars] = useState(0);

  // Power-up State (UI)
  const [activePowerUp, setActivePowerUp] = useState<PowerUpType>('none');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Challenge Tracking (Shared Values for Worklet compatibility)
  const powerUpsCollected = useSharedValue(0);
  const pipesPassed = useSharedValue(0);
  const gameStartTime = useRef<number | null>(null);

  // Sound Pools
  const jumpPool = useRef<Audio.Sound[]>([]);
  const coinPool = useRef<Audio.Sound[]>([]);
  const jumpIndex = useRef(0);
  const coinIndex = useRef(0);
  
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
  const playFromPool = (pool: React.MutableRefObject<Audio.Sound[]>, indexRef: React.MutableRefObject<number>) => {
    const sound = pool.current[indexRef.current];
    if (sound) {
      sound.replayAsync().catch(e => console.log("Error playing pool sound", e));
      indexRef.current = (indexRef.current + 1) % pool.current.length;
    }
  };

  const playSound = (soundRef: React.MutableRefObject<Audio.Sound | null>) => {
    if (soundRef.current) {
      soundRef.current.replayAsync().catch(e => console.log("Error playing sound", e));
    }
  };

  const playPowerUpSound = () => playSound(powerUpSound);
  const playCrashSound = () => playSound(crashSound);

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
    runOnJS(playPowerUpSound)();
    if (type === 'shield') isInvincible.value = true;
    else if (type === 'shrink') birdSize.value = withTiming(GAME_CONFIG.BIRD_SIZE * 0.6);
    runOnJS(setPowerUpTimer)(type);
  };

  const updateMusic = useCallback(async (newScore: number) => {
    const keys = ['day', 'sunset', 'night', 'magic', 'sea'];
    const bracket = Math.floor(newScore / 10) % keys.length;
    const nextKey = keys[bracket];
    
    if (currentMusicKey.current !== nextKey) {
      try {
        if (currentMusicKey.current) {
          const currentTrack = musicTracks.current[currentMusicKey.current];
          if (currentTrack) await currentTrack.stopAsync();
        }
        
        const nextTrack = musicTracks.current[nextKey];
        if (nextTrack) {
          await nextTrack.playAsync();
          currentMusicKey.current = nextKey;
        } else {
          console.log(`Track ${nextKey} not loaded yet, retrying in 500ms...`);
          setTimeout(() => updateMusic(newScore), 500);
        }
      } catch (e) {
        console.log("Error updating music", e);
      }
    }
  }, []);

  useEffect(() => {
    if (gameRunning && !gameOver) {
      updateMusic(score);
    } else if (currentMusicKey.current) {
      const stopMusic = async () => {
        try {
          const currentTrack = musicTracks.current[currentMusicKey.current!];
          if (currentTrack) await currentTrack.stopAsync();
          currentMusicKey.current = null;
        } catch (e) {
          console.log("Error stopping music", e);
        }
      };
      stopMusic();
    }
  }, [gameRunning, gameOver, score, updateMusic]);

  const syncChallenges = useCallback(async (sessionData: Partial<Record<DailyChallenge['type'], number>>) => {
    try {
      const result = await updateMultipleChallenges(sessionData);
      if (result.newlyCompleted) {
        setCompletedChallenge(result.newlyCompleted);
        setTotalStars(prev => {
          const newVal = prev + result.newlyCompleted!.rewardValue;
          AsyncStorage.setItem("TOTAL_STARS", String(newVal));
          return newVal;
        });
        setTimeout(() => setCompletedChallenge(null), 3000);
      }
      setDailyChallenges(result);
    } catch (error) {
      console.warn('Failed to sync challenges:', error);
    }
  }, []);

  const handleGameOver = useCallback(async (finalScore: number) => {
    setGameOver(true); setGameRunning(false); isPlaying.value = false; isDead.value = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    playCrashSound();
    
    // Calculate survival time
    const survivalTime = gameStartTime.current 
      ? Math.floor((Date.now() - gameStartTime.current) / 1000) 
      : 0;

    // SYNC ALL CHALLENGES IN ONE ATOMIC OPERATION
    await syncChallenges({
      pipes: pipesPassed.value,
      score: finalScore,
      survival: survivalTime,
      powerups: powerUpsCollected.value
    });
    
    const updateStorage = async () => {
      try {
        const savedScores = await AsyncStorage.getItem("SCORES");
        let scores = savedScores ? JSON.parse(savedScores) : [];
        scores.push(finalScore); scores.sort((a: number, b: number) => b - a);
        const top10 = scores.slice(0, 10); setLeaderboard(top10);
        await AsyncStorage.setItem("SCORES", JSON.stringify(top10));
        if (finalScore > highScore) { 
          setHighScore(finalScore); 
          await AsyncStorage.setItem("HIGH_SCORE", String(finalScore)); 
        }
      } catch (e) {
        console.warn("AsyncStorage not available or failed:", e);
      }
    };
    updateStorage();
  }, [highScore, syncChallenges]);

  const handleScoreUpdate = useCallback(() => { 
    setScore(s => s + 1);
    playFromPool(coinPool, coinIndex); 
  }, []);

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
      if (withinX && withinY) { 
        powerUpsCollected.value++; 
        activatePowerUp(currentPowerUpType.value); 
        powerUpX.value = -200; 
      }
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
        pipe.scored.value = true; 
        pipesPassed.value++; 
        runOnJS(handleScoreUpdate)();
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
    
    // Reset pipes
    pipe1X.value = GAME_CONFIG.PIPE_SPAWN_X; pipe1GapY.value = 200; pipe1Scored.value = false;
    pipe2X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING; pipe2GapY.value = 300; pipe2Scored.value = false;
    pipe3X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING * 2; pipe3GapY.value = 250; pipe3Scored.value = false;
    
    // Reset environment
    groundX.value = 0; cloudX.value = 0;
    
    // Reset session tracking
    powerUpsCollected.value = 0;
    pipesPassed.value = 0;
    gameStartTime.current = null;
  }, []);

  const flap = useCallback(() => {
    if (isDead.value) { resetGame(); return; }
    if (showMenu) { startFromMenu(); return; }
    if (!isPlaying.value) { 
      isPlaying.value = true; 
      setGameRunning(true); 
      gameStartTime.current = Date.now();
    }
    birdVelocity.value = GAME_CONFIG.FLAP_STRENGTH; playFromPool(jumpPool, jumpIndex);
  }, [gameOver, gameRunning, showMenu, startFromMenu]);

  const resetGame = useCallback(() => {
    birdY.value = GAME_CONFIG.INITIAL_BIRD_Y; birdVelocity.value = 0; birdSize.value = GAME_CONFIG.BIRD_SIZE;
    isInvincible.value = false; mercyFrames.value = 0; setActivePowerUp('none'); powerUpX.value = -200;
    if (timerRef.current) clearTimeout(timerRef.current);
    pipe1X.value = GAME_CONFIG.PIPE_SPAWN_X; pipe1GapY.value = 200; pipe1Scored.value = false;
    pipe2X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING; pipe2GapY.value = 300; pipe2Scored.value = false;
    pipe3X.value = GAME_CONFIG.PIPE_SPAWN_X + GAME_CONFIG.PIPE_SPACING * 2; pipe3GapY.value = 250; pipe3Scored.value = false;
    groundX.value = 0; cloudX.value = 0; setScore(0); setGameOver(false); setGameRunning(true); isDead.value = false; isPlaying.value = true;
    
    // Reset session tracking
    powerUpsCollected.value = 0;
    pipesPassed.value = 0;
    gameStartTime.current = Date.now();
  }, []);

  useEffect(() => {
    const init = async () => {
      console.log("Initializing Game Engine...");
      try {
        await Audio.setAudioModeAsync({
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldRouteAudioToReceiverIfInverted: false,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        });
        console.log("Audio mode set successfully");
      } catch (error) {
        console.error("Error setting audio mode:", error);
      }

      // Load Storage (Non-blocking)
      try {
        const saved = await AsyncStorage.getItem("HIGH_SCORE"); 
        const savedScores = await AsyncStorage.getItem("SCORES");
        const savedStars = await AsyncStorage.getItem("TOTAL_STARS");
        const dailyChallengesData = await loadDailyChallenges();
        if (saved) setHighScore(Number(saved));
        if (savedScores) setLeaderboard(JSON.parse(savedScores));
        if (savedStars) setTotalStars(Number(savedStars));
        setDailyChallenges(dailyChallengesData || null);
        console.log("Storage loaded successfully");
      } catch (e) {
        console.warn("AsyncStorage failed during init:", e);
      }
      
      // Load Sounds (Critical)
      try {
        console.log("Loading sound effects...");
        // Pre-load pools
        const jPool = await Promise.all([
          Audio.Sound.createAsync(require("@/assets/audio/jump.mp3")),
          Audio.Sound.createAsync(require("@/assets/audio/jump.mp3")),
          Audio.Sound.createAsync(require("@/assets/audio/jump.mp3")),
        ]);
        const cPool = await Promise.all([
          Audio.Sound.createAsync(require("@/assets/audio/coin.mp3")),
          Audio.Sound.createAsync(require("@/assets/audio/coin.mp3")),
        ]);

        jumpPool.current = jPool.map(p => p.sound);
        coinPool.current = cPool.map(p => p.sound);
        
        // Lower volume for coin sounds
        await Promise.all(coinPool.current.map(s => s.setVolumeAsync(0.3)));

        const { sound: crSound } = await Audio.Sound.createAsync(require("@/assets/audio/crash.mp3"));
        const { sound: pSound } = await Audio.Sound.createAsync(require("@/assets/audio/coin.mp3"));
        
        powerUpSound.current = pSound; 
        await pSound.setVolumeAsync(0.3);
        crashSound.current = crSound;
        console.log("Sound effects loaded");

        console.log("Loading music tracks...");
        const tracks = {
          day: (await Audio.Sound.createAsync(require("@/assets/audio/day.mp3"), { isLooping: true, volume: 0.3 })).sound,
          sunset: (await Audio.Sound.createAsync(require("@/assets/audio/sunset.mp3"), { isLooping: true, volume: 0.3 })).sound,
          night: (await Audio.Sound.createAsync(require("@/assets/audio/night.mp3"), { isLooping: true, volume: 0.3 })).sound,
          magic: (await Audio.Sound.createAsync(require("@/assets/audio/magic_purple.mp3"), { isLooping: true, volume: 0.3 })).sound,
          sea: (await Audio.Sound.createAsync(require("@/assets/audio/deep_sea.mp3"), { isLooping: true, volume: 0.3 })).sound,
        };
        musicTracks.current = tracks;
        console.log("Music tracks loaded");
      } catch (error) {
        console.error("Critical error loading audio assets:", error);
      }
    };
    init();
    return () => {
      const cleanup = async () => {
        try {
          await Promise.all(jumpPool.current.map(s => s.unloadAsync()));
          await Promise.all(coinPool.current.map(s => s.unloadAsync()));
          await crashSound.current?.unloadAsync();
          await powerUpSound.current?.unloadAsync();
          for (const t of Object.values(musicTracks.current)) {
            await t?.unloadAsync();
          }
        } catch (e) {
          console.log("Error cleaning up audio", e);
        }
      };
      cleanup();
    };
  }, []);

  return {
    score, highScore, gameOver, gameRunning, showMenu, leaderboard, activePowerUp, dailyChallenges,
    completedChallenge, totalStars,
    birdY, birdVelocity, birdSize, pipe1X, pipe1GapY, pipe2X, pipe2GapY, pipe3X, pipe3GapY,
    powerUpX, powerUpY, currentPowerUpType, groundX, cloudX, flap, resetGame, startFromMenu, returnToMenu
  };
};
