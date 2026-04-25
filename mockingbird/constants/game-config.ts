import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const GAME_CONFIG = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  
  BIRD_SIZE: 38,
  BIRD_X: 80,
  INITIAL_BIRD_Y: height / 3,
  
  GRAVITY: 0.6,          // Increased for faster falling
  FLAP_STRENGTH: -10,     // Increased for more "punch"
  
  PIPE_WIDTH: 65,
  PIPE_GAP: 170,          // Slightly wider gap for the faster physics
  PIPE_SPEED: 4.5,        // Slightly faster
  PIPE_SPAWN_X: width + 100,
  PIPE_MIN_GAP_Y: 100,
  PIPE_MAX_GAP_Y: height - 350,
};
