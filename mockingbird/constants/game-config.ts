import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const GAME_CONFIG = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  
  BIRD_SIZE: 38,
  BIRD_X: 80,
  INITIAL_BIRD_Y: height / 3,
  
  GRAVITY: 0.6,
  FLAP_STRENGTH: -10,
  
  PIPE_WIDTH: 65,
  PIPE_GAP: 170,
  PIPE_SPEED: 4.5,
  PIPE_SPAWN_X: width + 100,
  PIPE_SPACING: 350,
  PIPE_MIN_GAP_Y: 100,
  PIPE_MAX_GAP_Y: height - 400,

  // Parallax Settings
  FLOOR_HEIGHT: 80,
  GROUND_SPEED: 4.5,      // Matches pipe speed
  CLOUD_SPEED: 1.5,       // Slower for depth
};
