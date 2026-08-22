/**
 * THE LAST SIGNAL — GAME CONSTANTS & CONFIGURATION
 * Centralized game constants, physics values, entity specs, color palettes, and enums.
 */

// ==========================================
// 1. ENGINE & DISPLAY
// ==========================================
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const TARGET_FPS = 60;
export const FIXED_DELTA_TIME = 1 / 60;
export const TILE_SIZE = 32;

// ==========================================
// 2. PLAYER PHYSICS & STATS
// ==========================================
export const PLAYER_WALK_SPEED = 140;
export const PLAYER_SPRINT_SPEED = 240;
export const PLAYER_CROUCH_SPEED = 70;
export const PLAYER_ACCELERATION = 1400;
export const PLAYER_FRICTION = 0.82;
export const PLAYER_RADIUS = 12;
export const PLAYER_WIDTH = 24;
export const PLAYER_HEIGHT = 24;
export const PLAYER_MAX_HEALTH = 100;

// Stamina System
export const STAMINA_MAX = 100;
export const STAMINA_SPRINT_DRAIN = 28;       // Units per second while sprinting
export const STAMINA_WALK_RECOVERY = 10;      // Units per second while walking
export const STAMINA_IDLE_RECOVERY = 22;      // Units per second while standing still
export const STAMINA_CROUCH_RECOVERY = 28;    // Units per second while crouching
export const STAMINA_EXHAUSTION_THRESHOLD = 20;// Must recover to 20 before sprinting again
export const STAMINA_RECOVERY_DELAY = 0.6;    // Delay (seconds) before recovery starts after sprinting

// Flashlight & Battery System
export const BATTERY_MAX = 100;
export const BATTERY_DRAIN_RATE = 1.6;        // Units per second when flashlight is ON
export const BATTERY_PACK_RESTORE = 40;       // Percentage restored by battery pickup
export const FLASHLIGHT_CONE_ANGLE = (65 * Math.PI) / 180; // 65-degree cone
export const FLASHLIGHT_DISTANCE = 380;       // Maximum beam reach in pixels
export const FLASHLIGHT_INNER_RADIUS = 36;    // Ambient 360-degree light around player
export const FLASHLIGHT_LOW_BATTERY = 20;     // Battery level triggering light flicker
export const FLASHLIGHT_CRITICAL_BATTERY = 5; // Battery level triggering severe flicker

// Health & Healing
export const HEALTH_MAX = 100;
export const MEDKIT_RESTORE = 50;             // Health restored per medkit use

// Noise Radii (Acoustic stimulus detected by AI)
export const NOISE_RADIUS_IDLE = 0;
export const NOISE_RADIUS_CROUCH = 0;
export const NOISE_RADIUS_WALK = 100;
export const NOISE_RADIUS_SPRINT = 300;
export const NOISE_RADIUS_INTERACT = 80;
export const NOISE_RADIUS_TERMINAL = 150;
export const NOISE_RADIUS_DOOR = 120;
export const NOISE_RADIUS_DAMAGE = 200;

// ==========================================
// 3. NEXUS-9 (HOSTILE AI ENTITY)
// ==========================================
export const ENEMY_RADIUS = 16;
export const ENEMY_WIDTH = 32;
export const ENEMY_HEIGHT = 32;
export const ENEMY_PATROL_SPEED = 85;
export const ENEMY_INVESTIGATE_SPEED = 115;
export const ENEMY_CHASE_SPEED = 195;
export const ENEMY_FRENZY_SPEED = 235;
export const ENEMY_ATTACK_DAMAGE = 45;
export const ENEMY_ATTACK_RANGE = 40;
export const ENEMY_ATTACK_COOLDOWN = 1.2;     // Seconds between attacks

// AI Perception
export const ENEMY_SIGHT_CONE_ANGLE = (110 * Math.PI) / 180; // 110-degree field of view
export const ENEMY_SIGHT_DISTANCE = 400;                     // Line-of-sight range
export const ENEMY_HEARING_RADIUS_WALK = 120;
export const ENEMY_HEARING_RADIUS_SPRINT = 350;
export const ENEMY_SEARCH_DURATION = 6.0;                    // Seconds spent investigating last known position

// AI Aura & Environmental Disturbance
export const ENEMY_AURA_FAR_DIST = 260;       // Distance where glitch & heartbeat begins
export const ENEMY_AURA_NEAR_DIST = 130;      // Distance where flashlight flickers & audio muffles

// ==========================================
// 4. INTERACTION & OBJECTS
// ==========================================
export const INTERACTION_RADIUS = 60;
export const PICKUP_RADIUS = 26;
export const DOOR_INTERACTION_RADIUS = 52;
export const DOOR_AUTO_CLOSE_DELAY = 4.0;     // Seconds before opened door auto-closes

// ==========================================
// 5. CAMERA & VIEWPORT
// ==========================================
export const CAMERA_SMOOTHING = 0.08;
export const CAMERA_DEFAULT_ZOOM = 1.0;
export const CAMERA_MIN_ZOOM = 0.6;
export const CAMERA_MAX_ZOOM = 2.0;
export const CAMERA_SHAKE_DECAY = 0.88;
export const CAMERA_MAX_SHAKE_OFFSET = 30;

// ==========================================
// 6. ENUMS & IDENTIFIERS
// ==========================================

export const GAME_STATES = Object.freeze({
  TITLE: 'TITLE',
  INTRO: 'INTRO',
  PLAYING: 'PLAYING',
  TERMINAL: 'TERMINAL',
  CCTV: 'CCTV',
  PAUSED: 'PAUSED',
  GAMEOVER: 'GAMEOVER',
  VICTORY: 'VICTORY'
});

export const THREAT_LEVELS = Object.freeze({
  LEVEL_0_NORMAL: 0,
  LEVEL_1_UNSTABLE: 1,
  LEVEL_2_SECURITY_BREACH: 2,
  LEVEL_3_ACTIVE_HUNT: 3,
  LEVEL_4_QUARANTINE: 4,
  LEVEL_5_CRITICAL_FAILURE: 5
});

export const THREAT_NAMES = Object.freeze({
  [THREAT_LEVELS.LEVEL_0_NORMAL]: 'STATUS NOMINAL',
  [THREAT_LEVELS.LEVEL_1_UNSTABLE]: 'CONTAINMENT UNSTABLE',
  [THREAT_LEVELS.LEVEL_2_SECURITY_BREACH]: 'SECURITY BREACH DETECTED',
  [THREAT_LEVELS.LEVEL_3_ACTIVE_HUNT]: 'ACTIVE HOSTILITY // CODE RED',
  [THREAT_LEVELS.LEVEL_4_QUARANTINE]: 'STATIONWIDE QUARANTINE',
  [THREAT_LEVELS.LEVEL_5_CRITICAL_FAILURE]: 'CATASTROPHIC CORE OVERRIDE'
});

export const CCTV_CAMERAS = Object.freeze([
  { id: 'CAM-01', sector: 'habitation', name: 'HABITATION AIRLOCK', x: 7 * 32 + 16, y: 12 * 32 + 16, angle: 0 },
  { id: 'CAM-02', sector: 'security', name: 'SECURITY HUB & ARMORY', x: 26 * 32 + 16, y: 12 * 32 + 16, angle: Math.PI / 4 },
  { id: 'CAM-03', sector: 'cryo', name: 'CRYO LABS [FRAGMENT ALPHA]', x: 52 * 32 + 16, y: 10 * 32 + 16, angle: -Math.PI / 2 },
  { id: 'CAM-04', sector: 'hydroponics', name: 'HYDROPONICS BIOMASS', x: 50 * 32 + 16, y: 30 * 32 + 16, angle: Math.PI },
  { id: 'CAM-05', sector: 'power', name: 'SUBSTATION REACTOR [BETA]', x: 52 * 32 + 16, y: 52 * 32 + 16, angle: -Math.PI / 4 },
  { id: 'CAM-06', sector: 'server_core', name: 'DATA VAULT CORE [GAMMA]', x: 14 * 32 + 16, y: 50 * 32 + 16, angle: Math.PI / 2 },
  { id: 'CAM-07', sector: 'comms', name: 'CENTRAL COMMS ARRAY', x: 30 * 32 + 16, y: 30 * 32 + 16, angle: 0 },
  { id: 'CAM-08', sector: 'escape_bay', name: 'EMERGENCY EVAC AIRLOCK', x: 10 * 32 + 16, y: 30 * 32 + 16, angle: Math.PI }
]);

export const AI_STATES = Object.freeze({
  IDLE: 'IDLE',
  PATROL: 'PATROL',
  INVESTIGATE: 'INVESTIGATE',
  CHASE: 'CHASE',
  FRENZY: 'FRENZY'
});

export const TILE_TYPES = Object.freeze({
  VOID: 0,
  WALL: 1,
  FLOOR: 2,
  GLASS: 3,
  DOOR_CLOSED: 4,
  DOOR_LOCKED_BLUE: 5,
  DOOR_LOCKED_RED: 6,
  DOOR_LOCKED_MASTER: 7,
  GENERATOR: 8,
  COMMS_DISH: 9,
  ESCAPE_POD: 10,
  FLOOR_GRATE: 11,
  DOOR_OPEN: 12
});

export const TILE_NAMES = Object.freeze({
  [TILE_TYPES.VOID]: 'Space Void',
  [TILE_TYPES.WALL]: 'Station Bulkhead',
  [TILE_TYPES.FLOOR]: 'Standard Deck Plate',
  [TILE_TYPES.GLASS]: 'Reinforced Quartz Window',
  [TILE_TYPES.DOOR_CLOSED]: 'Airlock Door (Closed)',
  [TILE_TYPES.DOOR_LOCKED_BLUE]: 'Security Door (Blue Clearance)',
  [TILE_TYPES.DOOR_LOCKED_RED]: 'Engineering Door (Red Clearance)',
  [TILE_TYPES.DOOR_LOCKED_MASTER]: 'Command Bulkhead (Master Clearance)',
  [TILE_TYPES.GENERATOR]: 'Substation Main Reactor',
  [TILE_TYPES.COMMS_DISH]: 'Subspace Transmitter Array',
  [TILE_TYPES.ESCAPE_POD]: 'Emergency Evacuation Pod',
  [TILE_TYPES.FLOOR_GRATE]: 'Maintenance Deck Grate',
  [TILE_TYPES.DOOR_OPEN]: 'Airlock Door (Open)'
});

export const SECTOR_IDS = Object.freeze({
  HABITATION: 'habitation',
  SECURITY: 'security',
  CRYO: 'cryo',
  HYDROPONICS: 'hydroponics',
  POWER: 'power',
  SERVER_CORE: 'server_core',
  COMMS: 'comms',
  ESCAPE_BAY: 'escape_bay'
});

export const DOOR_STATES = Object.freeze({
  CLOSED: 'CLOSED',
  OPEN: 'OPEN',
  LOCKED: 'LOCKED',
  OPENING: 'OPENING',
  CLOSING: 'CLOSING'
});

export const SECURITY_LEVELS = Object.freeze({
  NONE: 'NONE',
  BLUE: 'BLUE',
  RED: 'RED',
  MASTER: 'MASTER'
});

export const KEYCARD_TYPES = Object.freeze({
  BLUE: 'blue',
  RED: 'red',
  MASTER: 'master'
});

export const FRAGMENT_TYPES = Object.freeze({
  ALPHA: 'alpha',
  BETA: 'beta',
  GAMMA: 'gamma'
});

export const ITEM_TYPES = Object.freeze({
  KEYCARD_BLUE: 'KEYCARD_BLUE',
  KEYCARD_RED: 'KEYCARD_RED',
  KEYCARD_MASTER: 'KEYCARD_MASTER',
  FRAGMENT_ALPHA: 'FRAGMENT_ALPHA',
  FRAGMENT_BETA: 'FRAGMENT_BETA',
  FRAGMENT_GAMMA: 'FRAGMENT_GAMMA',
  MEDKIT: 'MEDKIT',
  BATTERY_PACK: 'BATTERY_PACK',
  AUDIO_LOG: 'AUDIO_LOG',
  SONIC_DECOY: 'SONIC_DECOY',
  EMP_CHARGE: 'EMP_CHARGE'
});

export const INPUT_ACTIONS = Object.freeze({
  MOVE_UP: 'MOVE_UP',
  MOVE_DOWN: 'MOVE_DOWN',
  MOVE_LEFT: 'MOVE_LEFT',
  MOVE_RIGHT: 'MOVE_RIGHT',
  SPRINT: 'SPRINT',
  CROUCH: 'CROUCH',
  FLASHLIGHT: 'FLASHLIGHT',
  INTERACT: 'INTERACT',
  MAP: 'MAP',
  PAUSE: 'PAUSE',
  USE_MEDKIT: 'USE_MEDKIT',
  USE_BATTERY: 'USE_BATTERY',
  USE_DECOY: 'USE_DECOY',
  USE_EMP: 'USE_EMP',
  CRAFTING: 'CRAFTING'
});

export const EVENTS = Object.freeze({
  // Player
  PLAYER_MOVED: 'PLAYER_MOVED',
  PLAYER_DAMAGED: 'PLAYER_DAMAGED',
  PLAYER_HEALED: 'PLAYER_HEALED',
  PLAYER_DIED: 'PLAYER_DIED',
  PLAYER_HIDDEN: 'PLAYER_HIDDEN',
  PLAYER_UNHIDDEN: 'PLAYER_UNHIDDEN',
  NOISE_EMITTED: 'NOISE_EMITTED',
  STAMINA_CHANGED: 'STAMINA_CHANGED',
  BATTERY_CHANGED: 'BATTERY_CHANGED',
  FLASHLIGHT_TOGGLED: 'FLASHLIGHT_TOGGLED',
  DECOY_DEPLOYED: 'DECOY_DEPLOYED',
  EMP_TRIGGERED: 'EMP_TRIGGERED',
  MAP_TOGGLED: 'MAP_TOGGLED',

  // Game / World
  STATE_CHANGED: 'STATE_CHANGED',
  OBJECTIVE_UPDATED: 'OBJECTIVE_UPDATED',
  OBJECTIVE_COMPLETED: 'OBJECTIVE_COMPLETED',
  FRAGMENT_COLLECTED: 'FRAGMENT_COLLECTED',
  FRAGMENT_DECRYPTED: 'FRAGMENT_DECRYPTED',
  INVENTORY_CHANGED: 'INVENTORY_CHANGED',
  INTERACTION_TRIGGERED: 'INTERACTION_TRIGGERED',
  DOOR_STATE_CHANGED: 'DOOR_STATE_CHANGED',
  DOOR_OPENED: 'DOOR_OPENED',
  DOOR_LOCKED: 'DOOR_LOCKED',
  TERMINAL_OPENED: 'TERMINAL_OPENED',
  TERMINAL_CLOSED: 'TERMINAL_CLOSED',
  BREAKER_RESET: 'BREAKER_RESET',
  GENERATOR_ONLINE: 'GENERATOR_ONLINE',
  BROADCAST_SENT: 'BROADCAST_SENT',
  HAZARD_TRIGGERED: 'HAZARD_TRIGGERED',
  CCTV_OPENED: 'CCTV_OPENED',
  CCTV_CLOSED: 'CCTV_CLOSED',
  THREAT_LEVEL_CHANGED: 'THREAT_LEVEL_CHANGED',
  STATION_ANNOUNCEMENT: 'STATION_ANNOUNCEMENT',
  EVENT_TRIGGERED: 'EVENT_TRIGGERED',
  CHECKPOINT_SAVED: 'CHECKPOINT_SAVED',
  CHECKPOINT_LOADED: 'CHECKPOINT_LOADED',

  // AI & Entity
  ENEMY_STATE_CHANGED: 'ENEMY_STATE_CHANGED',
  ENEMY_ALERTED: 'ENEMY_ALERTED',
  ENEMY_ATTACKED: 'ENEMY_ATTACKED',
  ENEMY_STUNNED: 'ENEMY_STUNNED',
  ENTITY_PROXIMITY: 'ENTITY_PROXIMITY',
  ENTITY_SCREECH: 'ENTITY_SCREECH',
  AI_WHISPER: 'AI_WHISPER',

  // FX & UI
  SCREEN_SHAKE: 'SCREEN_SHAKE',
  AUDIO_TRIGGER: 'AUDIO_TRIGGER',
  LOG_DISCOVERED: 'LOG_DISCOVERED',
  TOAST_NOTIFICATION: 'TOAST_NOTIFICATION'
});

// ==========================================
// 7. COLOR PALETTES & RETRO THEMES
// ==========================================
export const COLORS = Object.freeze({
  // Terminal CRT Green
  CRT_GREEN_BRIGHT: '#00ff66',
  CRT_GREEN: '#00cc55',
  CRT_GREEN_DARK: '#005522',
  CRT_GREEN_DIM: 'rgba(0, 255, 102, 0.15)',
  CRT_SCANLINE: 'rgba(0, 255, 102, 0.04)',

  // Amber / Warning
  AMBER_BRIGHT: '#ffaa00',
  AMBER: '#ff8800',
  AMBER_DARK: '#884400',
  AMBER_DIM: 'rgba(255, 170, 0, 0.15)',

  // Cyan / Tech / HUD
  CYAN_BRIGHT: '#00f0ff',
  CYAN: '#00b4d8',
  CYAN_DARK: '#004a7c',
  CYAN_DIM: 'rgba(0, 240, 255, 0.15)',

  // Danger / NEXUS-9 / Blood
  ALERT_RED_BRIGHT: '#ff2244',
  ALERT_RED: '#cc1133',
  ALERT_RED_DARK: '#660011',
  ALERT_RED_DIM: 'rgba(255, 34, 68, 0.18)',

  // Atmosphere & Backgrounds
  BG_DARK: '#05080c',
  BACKGROUND_BLACK: '#05080c',
  BG_SECTOR: '#0a0e14',
  BG_PANEL: 'rgba(10, 14, 20, 0.88)',
  BG_GRID_LINE: '#111822',
  SHADOW_COLOR: '#020406',
  FOG_COLOR: 'rgba(3, 5, 8, 0.96)',

  // Keycard Specific
  KEYCARD_BLUE: '#00aaff',
  KEYCARD_RED: '#ff3344',
  KEYCARD_MASTER: '#ffd700',

  // Fragment Specific
  FRAGMENT_ALPHA: '#00ffcc',
  FRAGMENT_BETA: '#ffaa00',
  FRAGMENT_GAMMA: '#cc44ff'
});

export const STATION_AUDIO_LOGS = Object.freeze({
  'LOG-01': {
    id: 'LOG-01',
    title: 'PERSONAL LOG: DR. ARIS VANCE',
    author: 'Dr. Aris Vance',
    role: 'Systems Engineer',
    sector: 'Habitation Bay',
    duration: 6.5,
    transcript: "Log entry 402. Comms dish went dead at 02:00. NEXUS-9 isn't responding to override commands... It sealed the bulkheads from the core. I'm heading towards Cryo Labs."
  },
  'LOG-02': {
    id: 'LOG-02',
    title: 'SECURITY MEMO: LEVEL 4 BREACH',
    author: 'Chief Miller',
    role: 'Security Detail',
    sector: 'Security Hub',
    duration: 6.5,
    transcript: "Priority Black! The anomaly broke containment. Kinetic fire had no effect on the tendrils. Deploy sonic decoys and EMP charges to slow it down. Evacuate immediately!"
  },
  'LOG-03': {
    id: 'LOG-03',
    title: 'RESEARCH LOG: SYNTAX DEVIATION',
    author: 'Dr. Evelyn Reed',
    role: 'Lead Xenologist',
    sector: 'Cryo Laboratories',
    duration: 7.0,
    transcript: "The subspace signal isn't random radiation... It has mathematical syntax. When we decrypted Fragment Alpha, NEXUS-9 overclocked its neural lattice. It didn't break—it evolved."
  },
  'LOG-04': {
    id: 'LOG-04',
    title: 'REACTOR MEMO: BREAKER SURGE',
    author: 'Sarah Lin',
    role: 'Chief Engineer',
    sector: 'Power Substation',
    duration: 6.5,
    transcript: "Breaker grid tripped across all conduits. If the reactor destabilizes, life support dies. Reset the four breaker switches in sequence to reboot primary station power."
  }
});
