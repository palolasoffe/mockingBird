import { useEffect, useRef, useState } from "react";
import { Dimensions, Text, TouchableWithoutFeedback, View } from "react-native";

export default function GameScreen() {
  const [birdY, setBirdY] = useState(300);
  const [pipes, setPipes] = useState([{ x: 400, gapY: 200 }]);
  const velocity = useRef(0);
  const birdYRef = useRef(300);
  const pipesRef = useRef([{ x: 400, gapY: 200 }]);
  const gameOverRef = useRef(false);

  useEffect(() => {
    let frame: number;
    const SCREEN_HEIGHT = Dimensions.get("window").height;

    const loop = () => {
      if (gameOverRef.current) return;
      velocity.current += 0.5;

      setBirdY((y) => {
        let newY = y + velocity.current;
        birdYRef.current = newY;

        // yläreuna
        if (newY < 0) {
          newY = 0;
          velocity.current = 0;
        }

        // alareuna
        if (newY > SCREEN_HEIGHT - 40) {
          newY = SCREEN_HEIGHT - 40;
          velocity.current = 0;

          console.log("GAME OVER");
          gameOverRef.current = true;
        }

        return newY;
      });

      setPipes((prev) => {
        let updated = prev.map((pipe) => ({
          ...pipe,
          x: pipe.x - 3,
        }));

        if (updated[0].x < -60) {
          updated.shift();
          updated.push({
            x: 400,
            gapY: Math.random() * 300 + 100,
          });
        }
        
        pipesRef.current = updated;
        return updated;
      });

      const birdX = 100;
      const birdSize = 40;

      pipesRef.current.forEach(pipe => {
        const pipeWidth = 60;
        const gapSize = 150;

        const withinX =
          birdX + birdSize > pipe.x &&
          birdX < pipe.x + pipeWidth;

        const hitsTop = birdYRef.current < pipe.gapY;
        const hitsBottom = birdYRef.current + birdSize > pipe.gapY + gapSize;

        if (withinX && (hitsTop || hitsBottom)) {
          console.log("HIT PIPE → GAME OVER");
          gameOverRef.current = true;
        }
      });

      // 👇 TÄRKEIN RIVI
      frame = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(frame);
  }, []);

  const flap = () => {
    velocity.current = -8;
  };

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
      </View>
    </TouchableWithoutFeedback>
  );
}
