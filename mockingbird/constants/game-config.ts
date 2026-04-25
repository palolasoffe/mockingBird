import { Dimensions } from "react-native";

const { width, height } = Dimensions.get("window");

export const GAME_CONFIG = {
  SCREEN_WIDTH: width,
  SCREEN_HEIGHT: height,
  
  BIRD_SIZE: 40,
  BIRD_X: 100,
  INITIAL_BIRD_Y: height / 2,
  
  GRAVITY: 0.5,
  FLAP_STRENGTH: -8,
  
  PIPE_WIDTH: 60,
  PIPE_GAP: 160,
  PIPE_SPEED: 4,
  PIPE_SPAWN_X: width + 60,
  PIPE_MIN_GAP_Y: 100,
  PIPE_MAX_GAP_Y: height - 300,
};
