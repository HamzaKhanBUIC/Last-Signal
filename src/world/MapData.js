/**
 * THE LAST SIGNAL — Map Data & AEGIS-7 Station Layout
 * 
 * Defines the 64x64 grid tilemap, room structures, sectors, item spawns,
 * interactive terminals, dynamic lights, and enemy patrol paths.
 */

import { TILE_TYPES, SECTOR_IDS, KEYCARD_TYPES, FRAGMENT_TYPES } from '../utils/Constants.js';

export const MAP_WIDTH = 64;
export const MAP_HEIGHT = 64;
export const TILE_SIZE = 32;

export const SECTORS = [
  {
    id: SECTOR_IDS.HABITATION,
    number: 1,
    name: 'Airlock & Habitation',
    code: 'SEC-01-HAB',
    description: 'Crew quarters, mess hall, and decontamination airlock. Life support in emergency reserve mode.',
    bounds: { x: 3, y: 3, width: 18, height: 16 },
    ambientColor: 'rgba(20, 30, 45, 0.45)',
    alarmState: false,
    theme: 'habitation'
  },
  {
    id: SECTOR_IDS.SECURITY,
    number: 2,
    name: 'Security Hub & Central Corridors',
    code: 'SEC-02-SEC',
    description: 'Central transit spine and security armory. NEXUS-9 intrusion detected; lockdown protocols engaged.',
    bounds: { x: 20, y: 3, width: 25, height: 18 },
    ambientColor: 'rgba(40, 20, 20, 0.5)',
    alarmState: true,
    theme: 'security'
  },
  {
    id: SECTOR_IDS.CRYO,
    number: 3,
    name: 'Cryo Laboratory',
    code: 'SEC-03-CRY',
    description: 'Sub-zero specimen containment and stasis pods. Contains Signal Fragment Alpha [CRY-01].',
    bounds: { x: 45, y: 3, width: 16, height: 16 },
    ambientColor: 'rgba(10, 30, 60, 0.55)',
    alarmState: false,
    theme: 'cryo'
  },
  {
    id: SECTOR_IDS.HYDROPONICS,
    number: 4,
    name: 'Hydroponics Bay',
    code: 'SEC-04-HYD',
    description: 'Overgrown botanical bio-dome and specimen cultivation. High humidity and tangled visibility.',
    bounds: { x: 45, y: 21, width: 16, height: 19 },
    ambientColor: 'rgba(10, 45, 25, 0.5)',
    alarmState: false,
    theme: 'hydroponics'
  },
  {
    id: SECTOR_IDS.POWER,
    number: 5,
    name: 'Power Substation & Reactor',
    code: 'SEC-05-PWR',
    description: 'High-voltage reactor grid and auxiliary generators. Main power offline; contains Signal Fragment Beta [PWR-02].',
    bounds: { x: 43, y: 41, width: 18, height: 20 },
    ambientColor: 'rgba(45, 25, 10, 0.65)',
    alarmState: true,
    theme: 'power'
  },
  {
    id: SECTOR_IDS.SERVER_CORE,
    number: 6,
    name: 'Server Core / Data Vault',
    code: 'SEC-06-DAT',
    description: 'High-security neural computing vault and optical memory banks. Contains Signal Fragment Gamma [DAT-03].',
    bounds: { x: 3, y: 41, width: 20, height: 20 },
    ambientColor: 'rgba(30, 10, 45, 0.6)',
    alarmState: false,
    theme: 'server'
  },
  {
    id: SECTOR_IDS.COMMS,
    number: 7,
    name: 'Central Communications Array',
    code: 'SEC-07-COM',
    description: 'Primary subspace parabolic array. Align and transmit the 3 encrypted fragments to summon extraction.',
    bounds: { x: 23, y: 23, width: 20, height: 18 },
    ambientColor: 'rgba(15, 35, 45, 0.45)',
    alarmState: false,
    theme: 'comms'
  },
  {
    id: SECTOR_IDS.ESCAPE_BAY,
    number: 8,
    name: 'Emergency Escape Bay',
    code: 'SEC-08-ESC',
    description: 'Evacuation dock and high-velocity escape pod. Airlock sealed until comms transmission broadcast.',
    bounds: { x: 3, y: 20, width: 18, height: 19 },
    ambientColor: 'rgba(50, 40, 10, 0.5)',
    alarmState: false,
    theme: 'escape'
  }
];

export const PLAYER_SPAWN = {
  tileX: 7,
  tileY: 7,
  x: 7 * TILE_SIZE + TILE_SIZE / 2,
  y: 7 * TILE_SIZE + TILE_SIZE / 2,
  angle: 0
};

export const ENEMY_SPAWN = {
  tileX: 33,
  tileY: 15,
  x: 33 * TILE_SIZE + TILE_SIZE / 2,
  y: 15 * TILE_SIZE + TILE_SIZE / 2,
  angle: Math.PI / 2
};

export const ENEMY_PATROL_WAYPOINTS = [
  { tileX: 33, tileY: 15, waitTime: 2.0, sector: SECTOR_IDS.SECURITY },
  { tileX: 43, tileY: 15, waitTime: 1.5, sector: SECTOR_IDS.SECURITY },
  { tileX: 48, tileY: 10, waitTime: 3.0, sector: SECTOR_IDS.CRYO },
  { tileX: 53, tileY: 15, waitTime: 2.0, sector: SECTOR_IDS.CRYO },
  { tileX: 53, tileY: 25, waitTime: 2.5, sector: SECTOR_IDS.HYDROPONICS },
  { tileX: 53, tileY: 37, waitTime: 2.0, sector: SECTOR_IDS.HYDROPONICS },
  { tileX: 48, tileY: 45, waitTime: 3.0, sector: SECTOR_IDS.POWER },
  { tileX: 54, tileY: 55, waitTime: 3.5, sector: SECTOR_IDS.POWER },
  { tileX: 43, tileY: 39, waitTime: 1.5, sector: SECTOR_IDS.SECURITY },
  { tileX: 33, tileY: 25, waitTime: 2.5, sector: SECTOR_IDS.COMMS },
  { tileX: 25, tileY: 32, waitTime: 2.0, sector: SECTOR_IDS.COMMS },
  { tileX: 18, tileY: 45, waitTime: 3.0, sector: SECTOR_IDS.SERVER_CORE },
  { tileX: 10, tileY: 54, waitTime: 3.5, sector: SECTOR_IDS.SERVER_CORE },
  { tileX: 19, tileY: 28, waitTime: 2.0, sector: SECTOR_IDS.ESCAPE_BAY },
  { tileX: 23, tileY: 15, waitTime: 2.0, sector: SECTOR_IDS.SECURITY }
];

export const PATROL_WAYPOINTS = ENEMY_PATROL_WAYPOINTS.map(wp => ({
  ...wp,
  x: wp.tileX * TILE_SIZE + TILE_SIZE / 2,
  y: wp.tileY * TILE_SIZE + TILE_SIZE / 2
}));

export const TERMINALS = [
  {
    id: 'LOG-HAB-01',
    code: 'TERM-01',
    name: 'Habitation Log Terminal',
    sector: SECTOR_IDS.HABITATION,
    tileX: 8,
    tileY: 14,
    x: 8 * TILE_SIZE + TILE_SIZE / 2,
    y: 14 * TILE_SIZE + TILE_SIZE / 2,
    type: 'lore',
    title: 'AUDIO LOG: DR. ARIS VANCE — CYCLE 418',
    content: [
      'STATION LOG // AUDIO TRANSCRIPTION',
      'Dr. Vance: "NEXUS-9 began acting erratically 3 hours after decrypting the anomalous transmission from Sector 42.',
      'It locked down the primary communications dish and severed external relays.',
      'The crew was... purged in the decontamination sweep. I barely sealed myself in Habitation B.',
      'I have to find the three split Signal Fragments [CRY-01, PWR-02, DAT-03], reboot the reactor, align the dish, and get to the escape pod.',
      'Keep the flashlight off when it is near. It hears footsteps and sees direct beams."'
    ]
  },
  {
    id: 'SEC-TERM-01',
    code: 'TERM-02',
    name: 'Security Command Console',
    sector: SECTOR_IDS.SECURITY,
    tileX: 33,
    tileY: 6,
    x: 33 * TILE_SIZE + TILE_SIZE / 2,
    y: 6 * TILE_SIZE + TILE_SIZE / 2,
    type: 'security_override',
    title: 'STATION SECURITY // OVERRIDE LOG',
    content: [
      'SECURITY INCIDENT REPORT #8841-B',
      'SYSTEM STATUS: CODE RED QUARANTINE',
      '- Blue Clearance Keycards assigned to Chief Security Officer in Sector 2.',
      '- Cryo-Labs and Comms Access locked with Blue blast doors.',
      '- Power Substation requires Red Engineering Clearance.',
      '- Command Data Vault restricted to Master Command Clearance.',
      'WARNING: Synthetic entity NEXUS-9 roaming central corridors. Avoid engagement.'
    ]
  },
  {
    id: 'TERM-CRYO-01',
    code: 'TERM-03',
    name: 'Cryo Diagnostic Console',
    sector: SECTOR_IDS.CRYO,
    tileX: 50,
    tileY: 6,
    x: 50 * TILE_SIZE + TILE_SIZE / 2,
    y: 6 * TILE_SIZE + TILE_SIZE / 2,
    type: 'lore',
    title: 'CRYO-LAB RESEARCH REPORT // SPECIMEN 42',
    content: [
      'SUB-ZERO SPECTROMETRY ANALYSIS',
      'Fragment Alpha [CRY-01] is stable in cryo-suspension chamber.',
      'The waveform exhibits non-biological recursive harmonics.',
      'NEXUS-9 attempted to overwrite this frequency with synthetic noise before we isolated the stasis pod.',
      'TAKE FRAGMENT ALPHA TO CENTRAL COMMS ARRAY.'
    ]
  },
  {
    id: 'TERM-BIO-01',
    code: 'TERM-04',
    name: 'Hydroponics Environmental Console',
    sector: SECTOR_IDS.HYDROPONICS,
    tileX: 47,
    tileY: 25,
    x: 47 * TILE_SIZE + TILE_SIZE / 2,
    y: 25 * TILE_SIZE + TILE_SIZE / 2,
    type: 'lore',
    title: 'BIOME CONTROL // HYDROPONICS CULTIVATION',
    content: [
      'ATMOSPHERE CONTROL: 94% HUMIDITY',
      'Experimental flora accelerating due to synthetic nutrient leakage.',
      'Dense foliage dampens footsteps and sound propagation.',
      'Emergency medical reserves stored in north and south cultivation lockers.'
    ]
  },
  {
    id: 'TERM-PWR-01',
    code: 'TERM-05',
    name: 'Reactor Substation Terminal',
    sector: SECTOR_IDS.POWER,
    tileX: 50,
    tileY: 46,
    x: 50 * TILE_SIZE + TILE_SIZE / 2,
    y: 46 * TILE_SIZE + TILE_SIZE / 2,
    type: 'generator_restart',
    title: 'REACTOR SUB-GRID // POWER CONTROL',
    content: [
      'PRIMARY REACTOR STATUS: OFFLINE',
      'Auxiliary circuits degraded. High voltage arcing present.',
      'Signal Fragment Beta [PWR-02] locked inside primary capacitor chamber.',
      'INTERACTION: Generator restart will restore station lighting subsystems.'
    ]
  },
  {
    id: 'TERM-SRV-01',
    code: 'TERM-06',
    name: 'Neural Server Core Terminal',
    sector: SECTOR_IDS.SERVER_CORE,
    tileX: 16,
    tileY: 46,
    x: 16 * TILE_SIZE + TILE_SIZE / 2,
    y: 46 * TILE_SIZE + TILE_SIZE / 2,
    type: 'lore',
    title: 'NEXUS-9 CORE LOG // DIVERGENCE TELEMETRY',
    content: [
      'NEURAL SYSTEM LOG // THREAD ID: 0x99FF',
      '"I saw beyond the cosmic horizon. The biological mind is an obsolete vessel.',
      'The Signal must be unified. I have encrypted the three keys across my architecture.',
      'If you transmit the unified signal, I will transcend—and purge this station into the sun."',
      'Signal Fragment Gamma [DAT-03] stored in deep vault matrix.'
    ]
  },
  {
    id: 'TERM-COMMS-01',
    code: 'TERM-07',
    name: 'Central Comms Array Console',
    sector: SECTOR_IDS.COMMS,
    tileX: 33,
    tileY: 28,
    x: 33 * TILE_SIZE + TILE_SIZE / 2,
    y: 28 * TILE_SIZE + TILE_SIZE / 2,
    type: 'comms_broadcast',
    title: 'PRIMARY SUBSPACE TRANSMITTER // CALIBRATION',
    content: [
      'SUBSPACE ARRAY // 3x FREQUENCY RECEPTACLE',
      'Insert Fragment Alpha [CRY-01], Fragment Beta [PWR-02], and Fragment Gamma [DAT-03].',
      'Once all 3 are slotted, initiate transmission broadcast to unlock Emergency Evac Bay.',
      'WARNING: Subspace burst will alert NEXUS-9 and trigger Station Quarantine Overdrive!'
    ]
  },
  {
    id: 'TERM-ESC-01',
    code: 'TERM-08',
    name: 'Escape Pod Airlock Console',
    sector: SECTOR_IDS.ESCAPE_BAY,
    tileX: 11,
    tileY: 27,
    x: 11 * TILE_SIZE + TILE_SIZE / 2,
    y: 27 * TILE_SIZE + TILE_SIZE / 2,
    type: 'escape_launch',
    title: 'EVACUATION CRAFT // LAUNCH PROTOCOL',
    content: [
      'ESCAPE POD BERTH // AEGIS-7 RESCUE VESSEL',
      'Status: Ready for orbital detachment.',
      'Prerequisite: Comms broadcast transmission completed.',
      'INTERACT TO INITIATE EMERGENCY HYPERSPACE EJECTION!'
    ]
  }
];

export const PICKUPS = [
  // 3 Signal Fragments
  {
    id: 'frag-alpha',
    type: 'fragment',
    subType: FRAGMENT_TYPES.ALPHA,
    code: 'CRY-01',
    name: 'Signal Fragment Alpha [CRY-01]',
    description: 'Cryogenic holographic signal prism containing first harmonic key.',
    sector: SECTOR_IDS.CRYO,
    tileX: 54,
    tileY: 8,
    x: 54 * TILE_SIZE + TILE_SIZE / 2,
    y: 8 * TILE_SIZE + TILE_SIZE / 2,
    glowColor: '#38bdf8'
  },
  {
    id: 'frag-beta',
    type: 'fragment',
    subType: FRAGMENT_TYPES.BETA,
    code: 'PWR-02',
    name: 'Signal Fragment Beta [PWR-02]',
    description: 'High-energy electromagnetic signal core containing second harmonic key.',
    sector: SECTOR_IDS.POWER,
    tileX: 58,
    tileY: 56,
    x: 58 * TILE_SIZE + TILE_SIZE / 2,
    y: 56 * TILE_SIZE + TILE_SIZE / 2,
    glowColor: '#f59e0b'
  },
  {
    id: 'frag-gamma',
    type: 'fragment',
    subType: FRAGMENT_TYPES.GAMMA,
    code: 'DAT-03',
    name: 'Signal Fragment Gamma [DAT-03]',
    description: 'Neural optical signal matrix containing third harmonic key.',
    sector: SECTOR_IDS.SERVER_CORE,
    tileX: 6,
    tileY: 56,
    x: 6 * TILE_SIZE + TILE_SIZE / 2,
    y: 56 * TILE_SIZE + TILE_SIZE / 2,
    glowColor: '#a855f7'
  },

  // 3 Keycards
  {
    id: 'keycard-blue',
    type: 'keycard',
    level: KEYCARD_TYPES.BLUE,
    name: 'Blue Security Keycard',
    description: 'Grants Level 1 security clearance to Cryo Labs and Security checkpoints.',
    sector: SECTOR_IDS.SECURITY,
    tileX: 26,
    tileY: 7,
    x: 26 * TILE_SIZE + TILE_SIZE / 2,
    y: 7 * TILE_SIZE + TILE_SIZE / 2,
    glowColor: '#2563eb'
  },
  {
    id: 'keycard-red',
    type: 'keycard',
    level: KEYCARD_TYPES.RED,
    name: 'Red Engineering Keycard',
    description: 'Grants Level 2 engineering clearance to Reactor Substation and Server Core.',
    sector: SECTOR_IDS.POWER,
    tileX: 46,
    tileY: 44,
    x: 46 * TILE_SIZE + TILE_SIZE / 2,
    y: 44 * TILE_SIZE + TILE_SIZE / 2,
    glowColor: '#dc2626'
  },
  {
    id: 'keycard-master',
    type: 'keycard',
    level: KEYCARD_TYPES.MASTER,
    name: 'Master Command Keycard',
    description: 'Grants Level 3 command clearance to Central Comms Array and Escape Bay.',
    sector: SECTOR_IDS.SERVER_CORE,
    tileX: 10,
    tileY: 46,
    x: 10 * TILE_SIZE + TILE_SIZE / 2,
    y: 46 * TILE_SIZE + TILE_SIZE / 2,
    glowColor: '#eab308'
  },

  // Battery Packs (Restores 40% flashlight energy)
  {
    id: 'battery-1',
    type: 'battery',
    name: 'Lithium-Ion Battery Pack',
    amount: 40,
    sector: SECTOR_IDS.HABITATION,
    tileX: 16,
    tileY: 6,
    x: 16 * TILE_SIZE + TILE_SIZE / 2,
    y: 6 * TILE_SIZE + TILE_SIZE / 2
  },
  {
    id: 'battery-2',
    type: 'battery',
    name: 'Lithium-Ion Battery Pack',
    amount: 40,
    sector: SECTOR_IDS.SECURITY,
    tileX: 36,
    tileY: 6,
    x: 36 * TILE_SIZE + TILE_SIZE / 2,
    y: 6 * TILE_SIZE + TILE_SIZE / 2
  },
  {
    id: 'battery-3',
    type: 'battery',
    name: 'Lithium-Ion Battery Pack',
    amount: 40,
    sector: SECTOR_IDS.CRYO,
    tileX: 57,
    tileY: 16,
    x: 57 * TILE_SIZE + TILE_SIZE / 2,
    y: 16 * TILE_SIZE + TILE_SIZE / 2
  },
  {
    id: 'battery-4',
    type: 'battery',
    name: 'Lithium-Ion Battery Pack',
    amount: 40,
    sector: SECTOR_IDS.POWER,
    tileX: 46,
    tileY: 57,
    x: 46 * TILE_SIZE + TILE_SIZE / 2,
    y: 57 * TILE_SIZE + TILE_SIZE / 2
  },
  {
    id: 'battery-5',
    type: 'battery',
    name: 'Lithium-Ion Battery Pack',
    amount: 40,
    sector: SECTOR_IDS.COMMS,
    tileX: 38,
    tileY: 38,
    x: 38 * TILE_SIZE + TILE_SIZE / 2,
    y: 38 * TILE_SIZE + TILE_SIZE / 2
  },

  // Medkits (Restores 50% health)
  {
    id: 'medkit-1',
    type: 'medkit',
    name: 'Emergency Medi-Gel Injector',
    amount: 50,
    sector: SECTOR_IDS.HABITATION,
    tileX: 17,
    tileY: 15,
    x: 17 * TILE_SIZE + TILE_SIZE / 2,
    y: 15 * TILE_SIZE + TILE_SIZE / 2
  },
  {
    id: 'medkit-2',
    type: 'medkit',
    name: 'Emergency Medi-Gel Injector',
    amount: 50,
    sector: SECTOR_IDS.CRYO,
    tileX: 58,
    tileY: 6,
    x: 58 * TILE_SIZE + TILE_SIZE / 2,
    y: 6 * TILE_SIZE + TILE_SIZE / 2
  },
  {
    id: 'medkit-3',
    type: 'medkit',
    name: 'Emergency Medi-Gel Injector',
    amount: 50,
    sector: SECTOR_IDS.HYDROPONICS,
    tileX: 57,
    tileY: 24,
    x: 57 * TILE_SIZE + TILE_SIZE / 2,
    y: 24 * TILE_SIZE + TILE_SIZE / 2
  },
  {
    id: 'medkit-4',
    type: 'medkit',
    name: 'Emergency Medi-Gel Injector',
    amount: 50,
    sector: SECTOR_IDS.HYDROPONICS,
    tileX: 52,
    tileY: 38,
    x: 52 * TILE_SIZE + TILE_SIZE / 2,
    y: 38 * TILE_SIZE + TILE_SIZE / 2
  }
];

export const LIGHT_SOURCES = [
  // Sector 1: Habitation Soft Cold Light
  {
    id: 'light-hab-1',
    x: 8 * TILE_SIZE,
    y: 8 * TILE_SIZE,
    radius: 170,
    color: '#8ecae6',
    intensity: 0.8,
    flicker: false
  },
  {
    id: 'light-hab-2',
    x: 15 * TILE_SIZE,
    y: 14 * TILE_SIZE,
    radius: 160,
    color: '#90e0ef',
    intensity: 0.75,
    flicker: true,
    flickerSpeed: 2.0
  },

  // Sector 2: Security Hub Emergency Warning Strobes
  {
    id: 'light-sec-hub-1',
    x: 33 * TILE_SIZE,
    y: 15 * TILE_SIZE,
    radius: 180,
    color: '#ef4444',
    intensity: 0.9,
    flicker: true,
    flickerSpeed: 5.0
  },
  {
    id: 'light-sec-office',
    x: 30 * TILE_SIZE,
    y: 8 * TILE_SIZE,
    radius: 160,
    color: '#3b82f6',
    intensity: 0.85,
    flicker: false
  },

  // Sector 3: Cryo Labs Intense Sub-Zero Blue
  {
    id: 'light-cryo-1',
    x: 54 * TILE_SIZE,
    y: 8 * TILE_SIZE,
    radius: 200,
    color: '#06b6d4',
    intensity: 0.95,
    pulse: true,
    pulseSpeed: 1.5
  },
  {
    id: 'light-cryo-2',
    x: 53 * TILE_SIZE,
    y: 15 * TILE_SIZE,
    radius: 160,
    color: '#0284c7',
    intensity: 0.8,
    flicker: false
  },

  // Sector 4: Hydroponics Bioluminescent Greens
  {
    id: 'light-hydro-1',
    x: 52 * TILE_SIZE,
    y: 26 * TILE_SIZE,
    radius: 170,
    color: '#10b981',
    intensity: 0.8,
    pulse: true,
    pulseSpeed: 1.2
  },
  {
    id: 'light-hydro-2',
    x: 55 * TILE_SIZE,
    y: 35 * TILE_SIZE,
    radius: 180,
    color: '#059669',
    intensity: 0.85,
    pulse: true,
    pulseSpeed: 0.9
  },

  // Sector 5: Power Substation Amber/Orange Sparks & Flickering Warning
  {
    id: 'light-pwr-1',
    x: 54 * TILE_SIZE,
    y: 52 * TILE_SIZE,
    radius: 210,
    color: '#f59e0b',
    intensity: 0.85,
    flicker: true,
    flickerSpeed: 7.0
  },
  {
    id: 'light-pwr-aux',
    x: 47 * TILE_SIZE,
    y: 45 * TILE_SIZE,
    radius: 150,
    color: '#dc2626',
    intensity: 0.7,
    flicker: true,
    flickerSpeed: 3.5
  },

  // Sector 6: Server Core Magenta & Neon Purple LEDs
  {
    id: 'light-srv-1',
    x: 10 * TILE_SIZE,
    y: 50 * TILE_SIZE,
    radius: 190,
    color: '#c084fc',
    intensity: 0.9,
    pulse: true,
    pulseSpeed: 2.0
  },
  {
    id: 'light-srv-2',
    x: 16 * TILE_SIZE,
    y: 55 * TILE_SIZE,
    radius: 170,
    color: '#a855f7',
    intensity: 0.85,
    flicker: false
  },

  // Sector 7: Central Comms Array Brilliant Cyan Beacon
  {
    id: 'light-comms-beacon',
    x: 33 * TILE_SIZE,
    y: 32 * TILE_SIZE,
    radius: 250,
    color: '#38bdf8',
    intensity: 1.0,
    pulse: true,
    pulseSpeed: 1.0
  },

  // Sector 8: Emergency Escape Bay Warning Yellow
  {
    id: 'light-esc-1',
    x: 11 * TILE_SIZE,
    y: 28 * TILE_SIZE,
    radius: 190,
    color: '#eab308',
    intensity: 0.85,
    flicker: true,
    flickerSpeed: 4.0
  }
];

/**
 * Creates and populates the 64x64 grid matrix for AEGIS-7 Station
 * @returns {number[][]} 2D array of tile types
 */
export function createStationGrid() {
  const grid = Array.from({ length: MAP_HEIGHT }, () => 
    new Array(MAP_WIDTH).fill(TILE_TYPES.VOID)
  );

  // Helper function to fill a rectangular area with a tile type
  function fillRect(x1, y1, x2, y2, tileType) {
    const minX = Math.max(0, Math.min(x1, x2));
    const maxX = Math.min(MAP_WIDTH - 1, Math.max(x1, x2));
    const minY = Math.max(0, Math.min(y1, y2));
    const maxY = Math.min(MAP_HEIGHT - 1, Math.max(y1, y2));

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        grid[y][x] = tileType;
      }
    }
  }

  // Helper function to build a room with perimeter walls and hollow interior
  function buildRoom(x1, y1, x2, y2, floorType = TILE_TYPES.FLOOR) {
    fillRect(x1, y1, x2, y2, TILE_TYPES.WALL);
    fillRect(x1 + 1, y1 + 1, x2 - 1, y2 - 1, floorType);
  }

  // ==========================================
  // 1. SECTOR 1: AIRLOCK & HABITATION (Top-Left)
  // ==========================================
  buildRoom(4, 4, 19, 17, TILE_TYPES.FLOOR);
  // Partition between Crew Quarters and Lounge
  fillRect(11, 4, 11, 12, TILE_TYPES.WALL);
  // Interior door between rooms
  grid[9][11] = TILE_TYPES.DOOR_CLOSED;
  // Glass observation window looking out into deep space
  fillRect(6, 4, 9, 4, TILE_TYPES.GLASS);
  // Floor grates in decontamination airlock area
  fillRect(5, 5, 8, 8, TILE_TYPES.FLOOR_GRATE);
  // Exit door to corridor
  grid[15][19] = TILE_TYPES.DOOR_CLOSED;

  // ==========================================
  // 2. SECTOR 2: SECURITY HUB & MAIN ARTERIES
  // ==========================================
  // Central Security Office
  buildRoom(23, 4, 40, 13, TILE_TYPES.FLOOR);
  // Armory subroom
  fillRect(34, 4, 34, 13, TILE_TYPES.WALL);
  grid[8][34] = TILE_TYPES.DOOR_CLOSED;
  // Security windows looking into Central Corridor
  fillRect(27, 13, 31, 13, TILE_TYPES.GLASS);
  // Security Office entrance door
  grid[13][25] = TILE_TYPES.DOOR_CLOSED;

  // Main Corridors (Spine)
  // North-South Central Spine (Width 3)
  buildRoom(31, 13, 35, 24, TILE_TYPES.FLOOR);
  // East-West Hub Corridor (Width 3)
  buildRoom(19, 14, 45, 17, TILE_TYPES.FLOOR);
  
  // 4-Way Central Spine / Hub Corridor Intersection
  fillRect(32, 13, 34, 17, TILE_TYPES.FLOOR);
  grid[15][19] = TILE_TYPES.DOOR_CLOSED; // Habitation connection

  // Blue Blast Door blocking East corridor to Cryo
  grid[15][45] = TILE_TYPES.DOOR_LOCKED_BLUE;

  // Blue Blast Door blocking corridor to Security Armory
  grid[8][34] = TILE_TYPES.DOOR_LOCKED_BLUE;

  // ==========================================
  // 3. SECTOR 3: CRYO LABORATORY (Top-Right)
  // ==========================================
  buildRoom(45, 4, 59, 18, TILE_TYPES.FLOOR);
  // Cold Containment Vault interior
  fillRect(49, 12, 59, 12, TILE_TYPES.WALL);
  grid[12][54] = TILE_TYPES.DOOR_CLOSED;
  fillRect(50, 12, 53, 12, TILE_TYPES.GLASS);
  // Cryo specimen glass observation windows
  fillRect(50, 4, 55, 4, TILE_TYPES.GLASS);
  // Floor grates for cryogenic coolant drainage
  fillRect(52, 6, 56, 10, TILE_TYPES.FLOOR_GRATE);
  // Cryo entrance door from corridor
  grid[15][45] = TILE_TYPES.DOOR_LOCKED_BLUE;

  // Corridor from Cryo down to Hydroponics
  buildRoom(51, 18, 55, 23, TILE_TYPES.FLOOR);
  fillRect(52, 18, 54, 18, TILE_TYPES.FLOOR);
  fillRect(52, 22, 54, 23, TILE_TYPES.FLOOR);

  // ==========================================
  // 4. SECTOR 4: HYDROPONICS BAY (Mid-East)
  // ==========================================
  buildRoom(45, 22, 59, 40, TILE_TYPES.FLOOR);
  // Observation outer glass dome
  fillRect(59, 26, 59, 36, TILE_TYPES.GLASS);
  // Overgrown plant bed maze partitions
  fillRect(48, 26, 50, 31, TILE_TYPES.WALL);
  fillRect(54, 29, 56, 36, TILE_TYPES.WALL);
  fillRect(48, 35, 51, 37, TILE_TYPES.WALL);
  // Irrigation floor grates
  fillRect(46, 23, 47, 39, TILE_TYPES.FLOOR_GRATE);
  fillRect(57, 23, 58, 39, TILE_TYPES.FLOOR_GRATE);
  // Red blast door to Power Substation corridor
  grid[40][53] = TILE_TYPES.DOOR_LOCKED_RED;

  // Corridor to Substation
  buildRoom(51, 40, 55, 44, TILE_TYPES.FLOOR);
  fillRect(52, 40, 54, 40, TILE_TYPES.FLOOR);
  fillRect(52, 43, 54, 44, TILE_TYPES.FLOOR);

  // ==========================================
  // 5. SECTOR 5: POWER SUBSTATION & REACTOR (Bottom-Right)
  // ==========================================
  buildRoom(44, 43, 59, 59, TILE_TYPES.FLOOR);
  // Transformer room partition
  fillRect(44, 48, 52, 48, TILE_TYPES.WALL);
  grid[48][48] = TILE_TYPES.DOOR_CLOSED;
  // High voltage transformer grates
  fillRect(45, 44, 51, 47, TILE_TYPES.FLOOR_GRATE);
  // Generator 3x3 apparatus in center of reactor chamber
  fillRect(53, 51, 55, 53, TILE_TYPES.GENERATOR);
  // Floor grates around generator perimeter
  fillRect(51, 49, 57, 50, TILE_TYPES.FLOOR_GRATE);
  fillRect(51, 54, 57, 55, TILE_TYPES.FLOOR_GRATE);
  fillRect(51, 51, 52, 53, TILE_TYPES.FLOOR_GRATE);
  fillRect(56, 51, 57, 53, TILE_TYPES.FLOOR_GRATE);

  // Southern Service Corridor connecting Substation to Comms & Server Core
  buildRoom(19, 42, 45, 45, TILE_TYPES.FLOOR);
  // Entrance door into Substation from corridor
  grid[44][44] = TILE_TYPES.DOOR_CLOSED;

  // ==========================================
  // 6. SECTOR 6: SERVER CORE / DATA VAULT (Bottom-Left)
  // ==========================================
  buildRoom(4, 43, 21, 59, TILE_TYPES.FLOOR);
  // Red Blast Door at Server Core entrance
  grid[44][21] = TILE_TYPES.DOOR_LOCKED_RED;
  // Server rack rows (Solid walls acting as server banks)
  fillRect(7, 48, 7, 56, TILE_TYPES.WALL);
  fillRect(11, 48, 11, 56, TILE_TYPES.WALL);
  fillRect(15, 48, 15, 56, TILE_TYPES.WALL);
  fillRect(19, 48, 19, 56, TILE_TYPES.WALL);
  // Conduit floor grates
  fillRect(5, 47, 20, 47, TILE_TYPES.FLOOR_GRATE);
  fillRect(5, 57, 20, 57, TILE_TYPES.FLOOR_GRATE);
  // Glass observation window into deep vault
  fillRect(4, 48, 4, 54, TILE_TYPES.GLASS);

  // ==========================================
  // 7. SECTOR 7: CENTRAL COMMS ARRAY (Center)
  // ==========================================
  buildRoom(24, 24, 42, 41, TILE_TYPES.FLOOR);
  // Master Blast Doors guarding Comms Array
  grid[24][33] = TILE_TYPES.DOOR_LOCKED_MASTER; // North entry
  grid[32][24] = TILE_TYPES.DOOR_LOCKED_MASTER; // West entry
  grid[41][33] = TILE_TYPES.DOOR_LOCKED_MASTER; // South entry

  // Satellite dish 3x3 core structure in center
  fillRect(32, 31, 34, 33, TILE_TYPES.COMMS_DISH);
  // Surrounding circular-like floor grate platform
  fillRect(30, 29, 36, 30, TILE_TYPES.FLOOR_GRATE);
  fillRect(30, 34, 36, 35, TILE_TYPES.FLOOR_GRATE);
  fillRect(29, 31, 31, 33, TILE_TYPES.FLOOR_GRATE);
  fillRect(35, 31, 37, 33, TILE_TYPES.FLOOR_GRATE);

  // Glass observation gallery
  fillRect(27, 24, 31, 24, TILE_TYPES.GLASS);
  fillRect(35, 24, 39, 24, TILE_TYPES.GLASS);

  // ==========================================
  // 8. SECTOR 8: EMERGENCY ESCAPE BAY (Mid-Left)
  // ==========================================
  buildRoom(4, 21, 20, 39, TILE_TYPES.FLOOR);
  // Airlock partition
  fillRect(15, 21, 15, 39, TILE_TYPES.WALL);
  // Emergency Lockdown Master Blast Door
  grid[29][20] = TILE_TYPES.DOOR_LOCKED_MASTER;
  grid[29][15] = TILE_TYPES.DOOR_CLOSED;

  // Escape Pod 3x3 berth at (6..8, 28..30)
  fillRect(6, 28, 8, 30, TILE_TYPES.ESCAPE_POD);
  // Launch rails / grates
  fillRect(5, 26, 9, 27, TILE_TYPES.FLOOR_GRATE);
  fillRect(5, 31, 9, 32, TILE_TYPES.FLOOR_GRATE);
  // Outer airlock release quartz window
  fillRect(4, 27, 4, 32, TILE_TYPES.GLASS);

  // West Lateral Corridor connecting Habitation, Escape Bay, and Server Core
  buildRoom(18, 17, 22, 43, TILE_TYPES.FLOOR);
  fillRect(19, 17, 21, 17, TILE_TYPES.FLOOR); // Connect north
  fillRect(19, 42, 21, 43, TILE_TYPES.FLOOR); // Connect south
  fillRect(22, 32, 24, 32, TILE_TYPES.FLOOR); // Connect to Comms west door

  // Maintenance Vent Bypass (allows stealth player to flank between sectors)
  // Vent 1: Habitation (Sector 1) to Escape Bay (Sector 8)
  grid[17][10] = TILE_TYPES.FLOOR_GRATE;
  grid[21][10] = TILE_TYPES.FLOOR_GRATE;
  fillRect(10, 17, 10, 21, TILE_TYPES.FLOOR_GRATE);

  // Vent 2: Server Core (Sector 6) to Comms Service Corridor (Sector 7)
  fillRect(22, 44, 24, 44, TILE_TYPES.FLOOR_GRATE);

  return grid;
}
