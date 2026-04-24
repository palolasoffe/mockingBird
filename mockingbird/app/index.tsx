import { useEffect, useRef, useState } from "react";
import { Dimensions, Text, TouchableWithoutFeedback, View, ScrollView } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function GameScreen() {
  const SCREEN_HEIGHT = Dimensions.get("window").height;

  const [birdY, setBirdY] = useState(300);
  const [pipes, setPipes] = useState([{ x: 400, gapY: 200 }]);
  const [gameOver, setGameOver] = useState(false);
  const [gameRunning, setGameRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  
  const passedPipes = useRef(new Set());
  const pipeId = useRef(0);
  const birdYRef = useRef(300);
  const pipesRef = useRef([{ id: 0, x: 400, gapY: 200 }]);
  const velocity = useRef(0);
  const frameRef = useRef<number | null>(null);
  const gameRunningRef = useRef(false);
  const gameOverRef = useRef(false);

  /*
  const [birdY, setBirdY] = useState(300);
  const [pipes, setPipes] = useState([{ x: 400, gapY: 200 }]);
  const velocity = useRef(0);
  const birdYRef = useRef(300);
  const pipesRef = useRef([{ x: 400, gapY: 200 }]);
  const gameOverRef = useRef(false);
  */

  const startGame = () => {
    setGameOver(false);
    setGameRunning(true);

    gameRunningRef.current = true;
    gameOverRef.current = false;

    birdYRef.current = 300;
    pipesRef.current = [{ id: 0, x: 400, gapY: 200 }];
    velocity.current = 0;

    setBirdY(300);
    setPipes([{ x: 400, gapY: 200 }]);

    frameRef.current = requestAnimationFrame(loop);
  };

  const endGame = async () => {
    setGameOver(true);
    setGameRunning(false);

    gameRunningRef.current = false;
    gameOverRef.current = true;

    if (score > highScore) {
      setHighScore(score);
      try {
        await AsyncStorage.setItem("HIGH_SCORE", String(score));
      } catch (e) {
        console.log("Failed to save high score");
      }
    }

    saveScore();

    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  };

  // Restart game after losing
  const resetGame = () => {
    passedPipes.current.clear();
    pipeId.current = 1;
    setScore(0);
    
    startGame();
  };

  // Game loop
  const loop = () => {
    if (!gameRunningRef.current) return;

    velocity.current += 0.5;

    // bird
    let newY = birdYRef.current + velocity.current;

    if (newY < 0) {
      newY = 0;
      velocity.current = 0;
    }

    if (newY > SCREEN_HEIGHT - 40) {
      newY = SCREEN_HEIGHT - 40;
      velocity.current = 0;
      endGame();
    }

    birdYRef.current = newY;
    setBirdY(newY);

    // pipes
    const updatedPipes = pipesRef.current.map((pipe) => ({
      ...pipe,
      x: pipe.x - 3,
    }));

    // spawn new pipe
    if (updatedPipes[0].x < -60) {
      updatedPipes.shift();
      updatedPipes.push({
        id: pipeId.current++,
        x: 400,
        gapY: Math.random() * 300 + 100,
      });
    }

    pipesRef.current = updatedPipes;
    setPipes(updatedPipes);

    // 💥 collision check
    checkCollision();

    // Score count for passed pipe gap
    updatedPipes.forEach((pipe) => {
      if (pipe.x + 60 < 100 && !passedPipes.current.has(pipe.id)) {
        passedPipes.current.add(pipe.id);
        setScore(s => s + 1);
      }
    });

    frameRef.current = requestAnimationFrame(loop);
  };

  // Collision with pipe, ground or ceiling
  const checkCollision = () => {
    const birdX = 100;
    const birdSize = 40;

    pipesRef.current.forEach(pipe => {
      const pipeWidth = 60;
      const gapSize = 150;

      const withinX =
        birdX + birdSize > pipe.x &&
        birdX < pipe.x + pipeWidth;

      const hitsTop = birdYRef.current < pipe.gapY;
      const hitsBottom =
        birdYRef.current + birdSize > pipe.gapY + gapSize;

      // End the round if a collision has occurred
      if (withinX && (hitsTop || hitsBottom)) {
        if (!gameOverRef.current) {
          endGame();
        }
      }
    });
  };

  // Load personal best
  const loadHighScore = async () => {
    try {
      const saved = await AsyncStorage.getItem("HIGH_SCORE");
      if (saved !== null) {
        setHighScore(Number(saved));
      }
    } catch (e) {
      console.log("Failed to load high score");
    }
  };

  // Load leaderboard scores
  const loadScores = async () => {
    try {
      const saved = await AsyncStorage.getItem("SCORES");
      if (saved) {
        setLeaderboard(JSON.parse(saved));
      }
    } catch (e) {
      console.log("Error loading scores");
    }
  };

  // Save game score to leaderboard scores
  const saveScore = async () => {
    try {
      const saved = await AsyncStorage.getItem("SCORES");
      const scores = saved ? JSON.parse(saved) : [];

      scores.push(score);

      scores.sort((a: number, b: number) => b - a); // suurin ensin

      const top10 = scores.slice(0, 10);

      await AsyncStorage.setItem("SCORES", JSON.stringify(top10));
    } catch (e) {
      console.log("Error saving score");
    }
  };

  const flap = () => {
    if (!gameRunning || gameOver) return;
    velocity.current = -8;
  };

  useEffect(() => {
    loadHighScore();
    loadScores();
    startGame();

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <TouchableWithoutFeedback onPress={flap}>
      <View style={{ flex: 1, backgroundColor: "#70c5ce" }}>
        <View
          style={{
            position: "absolute",
            top: birdY,
            left: 100,
            width: 40,
            height: 40,
            backgroundColor: "yellow",
            borderRadius: 20,
            transform: [{ rotate: `${velocity.current * 3}deg` }],
          }}
        />

        {pipes.map((pipe, index) => (
          <View key={index}>
            {/* Yläputki */}
            <View
              style={{
                position: "absolute",
                left: pipe.x,
                top: 0,
                width: 60,
                height: pipe.gapY,
                backgroundColor: "green",
              }}
            />

            {/* Alaputki */}
            <View
              style={{
                position: "absolute",
                left: pipe.x,
                top: pipe.gapY + 150, // gap size
                width: 60,
                height: 700,
                backgroundColor: "green",
              }}
            />
          </View>
        ))}
        <Text style={{ textAlign: "center", marginTop: 50 }}>
          MockingBird 🐦
        </Text>
        <Text
          style={{
            position: "absolute",
            top: 80,
            alignSelf: "center",
            fontSize: 40,
            fontWeight: "bold",
            color: "white",
          }}
        >
          {score}
        </Text>
        {gameOver && (
          <View
            style={{
              position: "absolute",
              top: 250,
              alignSelf: "center",
              alignItems: "center",
            }}
          >
            <Text
              style={{
                fontSize: 40,
                fontWeight: "bold",
                color: "white",
                marginBottom: 20,
              }}
            >
              GAME OVER
            </Text>
            <Text style={{ fontSize: 20, color: "white" }}>
              Best: {highScore}
            </Text>
            <ScrollView style={{ maxHeight: 100 }}>
              {leaderboard.map((s, i) => (
                <Text key={i} style={{ color: "white", fontSize: 18 }}>
                  {i + 1}. {s}
                </Text>
              ))}
            </ScrollView>
            <TouchableWithoutFeedback onPress={resetGame}>
              <View
                style={{
                  backgroundColor: "white",
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 10,
                }}
              >
                <Text style={{ fontSize: 18, fontWeight: "bold" }}>
                  Restart
                </Text>
              </View>
            </TouchableWithoutFeedback>
          </View>
        )}
      </View>
    </TouchableWithoutFeedback>
  );
}
