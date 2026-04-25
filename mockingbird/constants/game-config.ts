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
  GROUND_SPEED: 4.5,
  CLOUD_SPEED: 1.5,

  // Environment Palettes (Changes every 10 points)
  BACKGROUND_COLORS: [
    "#4ec0ca", // 0-9: Day
    "#ff9f43", // 10-19: Sunset
    "#2c3e50", // 20-29: Night
    "#8e44ad", // 30-39: Magic Purple
    "#16a085", // 40-49: Deep Sea
  ],
};
