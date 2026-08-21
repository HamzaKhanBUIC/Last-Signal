/**
 * THE LAST SIGNAL — PROCEDURAL PIXEL-ART SPRITE & TEXTURE GENERATOR
 * 
 * Generates 100% procedural pixel-art sprites, textures, decals, and animations
 * using offscreen HTML5 canvases. Zero external image assets required.
 */

import {
  TILE_TYPES,
  ITEM_TYPES,
  KEYCARD_TYPES,
  FRAGMENT_TYPES,
  COLORS,
  TILE_SIZE,
  AI_STATES
} from '../utils/Constants.js';
import { createOffscreenCanvas } from './CanvasUtils.js';

export class SpriteGenerator {
  constructor() {
    this.cache = new Map();
    this.tileCache = new Map();
    this.itemCache = new Map();
    this.decalCache = new Map();
    this.initialized = false;
  }

  /**
   * Initializes and pre-bakes all procedural assets into offscreen canvases.
   */
  init() {
    if (this.initialized) return;

    // 1. Bake Tiles
    this.bakeTiles();

    // 2. Bake Items & Pickups
    this.bakeItems();

    // 3. Bake Decals & Floor Markings
    this.bakeDecals();

    // 4. Bake Animated Frame Sequences (Player & NEXUS-9)
    this.bakeEntityFrames();

    this.initialized = true;
  }

  /**
   * Helper to register a baked canvas into the cache.
   * @param {string} key
   * @param {HTMLCanvasElement|OffscreenCanvas} canvas
   */
  register(key, canvas) {
    this.cache.set(key, canvas);
    return canvas;
  }

  /**
   * Retrieves a cached canvas asset by key.
   * @param {string} key
   * @returns {HTMLCanvasElement|OffscreenCanvas|null}
   */
  get(key) {
    if (!this.initialized) this.init();
    return this.cache.get(key) || null;
  }

  /**
   * Retrieves a baked tile canvas by tile type enum.
   * @param {number} tileType
   * @returns {HTMLCanvasElement|OffscreenCanvas|null}
   */
  getTile(tileType) {
    if (!this.initialized) this.init();
    return this.tileCache.get(tileType) || this.tileCache.get(TILE_TYPES.VOID);
  }

  /**
   * Retrieves a baked item canvas by item type identifier.
   * @param {string} itemType
   * @returns {HTMLCanvasElement|OffscreenCanvas|null}
   */
  getItem(itemType) {
    if (!this.initialized) this.init();
    return this.itemCache.get(itemType) || null;
  }

  /**
   * Retrieves a baked decal canvas.
   * @param {string} decalName
   * @returns {HTMLCanvasElement|OffscreenCanvas|null}
   */
  getDecal(decalName) {
    if (!this.initialized) this.init();
    return this.decalCache.get(decalName) || null;
  }

  // =========================================================================
  // 1. TILE BAKING
  // =========================================================================

  bakeTiles() {
    const S = TILE_SIZE; // 32px

    // --- TILE_TYPES.VOID ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#030508';
      ctx.fillRect(0, 0, S, S);
      // Subtle distant star dust
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.fillRect(4, 7, 1, 1);
      ctx.fillRect(18, 22, 1, 1);
      ctx.fillStyle = 'rgba(100, 200, 255, 0.2)';
      ctx.fillRect(27, 9, 1, 1);
      this.tileCache.set(TILE_TYPES.VOID, canvas);
      this.register('tile_void', canvas);
    }

    // --- TILE_TYPES.FLOOR (Standard Deck Plate) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Dark metallic steel base
      ctx.fillStyle = '#161c24';
      ctx.fillRect(0, 0, S, S);

      // Plate bevel borders
      ctx.fillStyle = '#222c38';
      ctx.fillRect(1, 1, S - 2, 1);
      ctx.fillRect(1, 1, 1, S - 2);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(1, S - 2, S - 2, 1);
      ctx.fillRect(S - 2, 1, 1, S - 2);

      // Panel seam gridlines
      ctx.fillStyle = '#0f141a';
      ctx.fillRect(0, 0, S, 1);
      ctx.fillRect(0, 0, 1, S);
      ctx.fillRect(S - 1, 0, 1, S);
      ctx.fillRect(0, S - 1, S, 1);

      // Center cross seam
      ctx.fillStyle = '#111720';
      ctx.fillRect(S / 2, 2, 1, S - 4);
      ctx.fillRect(2, S / 2, S - 4, 1);

      // Corner rivets / bolts
      const rivets = [
        [3, 3], [S - 5, 3], [3, S - 5], [S - 5, S - 5],
        [S / 2 - 2, S / 2 - 2], [S / 2 + 1, S / 2 + 1]
      ];
      ctx.fillStyle = '#3a4756';
      for (const [rx, ry] of rivets) {
        ctx.fillRect(rx, ry, 2, 2);
      }
      ctx.fillStyle = '#090d12';
      for (const [rx, ry] of rivets) {
        ctx.fillRect(rx + 1, ry + 1, 1, 1);
      }

      this.tileCache.set(TILE_TYPES.FLOOR, canvas);
      this.register('tile_floor', canvas);
    }

    // --- TILE_TYPES.FLOOR_GRATE (Maintenance Deck Grate) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Deep void beneath
      ctx.fillStyle = '#080b0f';
      ctx.fillRect(0, 0, S, S);

      // Frame
      ctx.fillStyle = '#2a3340';
      ctx.fillRect(0, 0, S, 2);
      ctx.fillRect(0, S - 2, S, 2);
      ctx.fillRect(0, 0, 2, S);
      ctx.fillRect(S - 2, 0, 2, S);

      // Metallic diamond ventilation grating
      ctx.fillStyle = '#3e4c5e';
      for (let y = 3; y < S - 3; y += 4) {
        for (let x = 3; x < S - 3; x += 4) {
          ctx.fillRect(x, y, 2, 2);
          ctx.fillRect(x + 2, y + 2, 2, 2);
        }
      }
      // Highlight edges
      ctx.fillStyle = '#5c6f88';
      ctx.fillRect(2, 2, S - 4, 1);
      ctx.fillRect(2, 2, 1, S - 4);

      this.tileCache.set(TILE_TYPES.FLOOR_GRATE, canvas);
      this.register('tile_floor_grate', canvas);
    }

    // --- TILE_TYPES.WALL (Station Heavy Bulkhead) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Deep reinforced titanium alloy
      ctx.fillStyle = '#242a35';
      ctx.fillRect(0, 0, S, S);

      // Top highlighted bevel
      ctx.fillStyle = '#3e495b';
      ctx.fillRect(0, 0, S, 3);
      ctx.fillRect(0, 0, 3, S);

      // Bottom shadow bevel
      ctx.fillStyle = '#11151c';
      ctx.fillRect(0, S - 4, S, 4);
      ctx.fillRect(S - 4, 0, 4, S);

      // Inner panel insert
      ctx.fillStyle = '#1c222c';
      ctx.fillRect(4, 4, S - 8, S - 8);

      // Vertical structural ribs
      ctx.fillStyle = '#313b4a';
      ctx.fillRect(8, 5, 2, S - 10);
      ctx.fillRect(S - 10, 5, 2, S - 10);

      // Central caution notch
      ctx.fillStyle = '#0e1218';
      ctx.fillRect(S / 2 - 3, S / 2 - 3, 6, 6);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(S / 2 - 1, S / 2 - 1, 2, 2);

      this.tileCache.set(TILE_TYPES.WALL, canvas);
      this.register('tile_wall', canvas);
    }

    // --- TILE_TYPES.GLASS (Reinforced Quartz Window) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Deep space beneath with cyan glass tint
      ctx.fillStyle = '#06101c';
      ctx.fillRect(0, 0, S, S);

      // Translucent cyan glass body
      ctx.fillStyle = 'rgba(0, 180, 240, 0.18)';
      ctx.fillRect(2, 2, S - 4, S - 4);

      // Frame
      ctx.fillStyle = '#283848';
      ctx.strokeRect(1, 1, S - 2, S - 2);

      // Diagonal specular reflection glints
      ctx.strokeStyle = 'rgba(200, 245, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(4, S - 8);
      ctx.lineTo(S - 8, 4);
      ctx.moveTo(10, S - 6);
      ctx.lineTo(S - 6, 10);
      ctx.stroke();

      // Frost condensation along bottom corners
      ctx.fillStyle = 'rgba(180, 230, 255, 0.3)';
      ctx.fillRect(3, S - 5, 3, 2);
      ctx.fillRect(S - 6, S - 5, 3, 2);

      this.tileCache.set(TILE_TYPES.GLASS, canvas);
      this.register('tile_glass', canvas);
    }

    // --- TILE_TYPES.DOOR_CLOSED (Airlock Bulkhead) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Dark door frame
      ctx.fillStyle = '#1c222c';
      ctx.fillRect(0, 0, S, S);

      // Twin interlocking pressure door leaves
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(2, 2, S / 2 - 3, S - 4);
      ctx.fillRect(S / 2 + 1, 2, S / 2 - 3, S - 4);

      // Center seal seam
      ctx.fillStyle = '#0f141c';
      ctx.fillRect(S / 2 - 1, 0, 2, S);

      // Yellow/Black Hazard Stripes on upper & lower thresholds
      for (let i = 2; i < S - 2; i += 6) {
        ctx.fillStyle = '#ffaa00';
        ctx.fillRect(i, 2, 3, 3);
        ctx.fillRect(i, S - 5, 3, 3);
        ctx.fillStyle = '#111';
        ctx.fillRect(i + 3, 2, 3, 3);
        ctx.fillRect(i + 3, S - 5, 3, 3);
      }

      // Center lock status LED (Red when closed/locked)
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(S / 2 - 2, S / 2 - 2, 4, 4);
      ctx.fillStyle = 'rgba(255, 34, 68, 0.4)';
      ctx.fillRect(S / 2 - 4, S / 2 - 4, 8, 8);

      this.tileCache.set(TILE_TYPES.DOOR_CLOSED, canvas);
      this.register('tile_door_closed', canvas);
    }

    // --- TILE_TYPES.DOOR_OPEN ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Floor deck base
      ctx.fillStyle = '#141a22';
      ctx.fillRect(0, 0, S, S);

      // Door tracks on floor
      ctx.fillStyle = '#2a3442';
      ctx.fillRect(0, 2, S, 2);
      ctx.fillRect(0, S - 4, S, 2);

      // Retracted door leaves at outer edges
      ctx.fillStyle = '#3a475a';
      ctx.fillRect(0, 4, 4, S - 8);
      ctx.fillRect(S - 4, 4, 4, S - 8);

      // Green cleared indicator lights
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(1, 1, 2, 2);
      ctx.fillRect(S - 3, 1, 2, 2);

      this.tileCache.set(TILE_TYPES.DOOR_OPEN, canvas);
      this.register('tile_door_open', canvas);
    }

    // --- TILE_TYPES.DOOR_LOCKED_BLUE ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Draw closed door base
      ctx.drawImage(this.tileCache.get(TILE_TYPES.DOOR_CLOSED), 0, 0);

      // Blue Security Clearance Biometric Scanner Keypad
      ctx.fillStyle = '#0066cc';
      ctx.fillRect(S / 2 - 4, S / 2 - 4, 8, 8);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(S / 2 - 2, S / 2 - 2, 4, 4);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.5)';
      ctx.fillRect(S / 2 - 6, S / 2 - 6, 12, 12);

      this.tileCache.set(TILE_TYPES.DOOR_LOCKED_BLUE, canvas);
      this.register('tile_door_locked_blue', canvas);
    }

    // --- TILE_TYPES.DOOR_LOCKED_RED ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.tileCache.get(TILE_TYPES.DOOR_CLOSED), 0, 0);

      // Red Engineering Clearance Lock
      ctx.fillStyle = '#990011';
      ctx.fillRect(S / 2 - 4, S / 2 - 4, 8, 8);
      ctx.fillStyle = '#ff2244';
      ctx.fillRect(S / 2 - 2, S / 2 - 2, 4, 4);
      ctx.fillStyle = 'rgba(255, 34, 68, 0.5)';
      ctx.fillRect(S / 2 - 6, S / 2 - 6, 12, 12);

      this.tileCache.set(TILE_TYPES.DOOR_LOCKED_RED, canvas);
      this.register('tile_door_locked_red', canvas);
    }

    // --- TILE_TYPES.DOOR_LOCKED_MASTER ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(this.tileCache.get(TILE_TYPES.DOOR_CLOSED), 0, 0);

      // Master Gold Command Quantum Lock
      ctx.fillStyle = '#997700';
      ctx.fillRect(S / 2 - 4, S / 2 - 4, 8, 8);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(S / 2 - 2, S / 2 - 2, 4, 4);
      ctx.fillStyle = 'rgba(255, 215, 0, 0.6)';
      ctx.fillRect(S / 2 - 6, S / 2 - 6, 12, 12);

      this.tileCache.set(TILE_TYPES.DOOR_LOCKED_MASTER, canvas);
      this.register('tile_door_locked_master', canvas);
    }

    // --- TILE_TYPES.GENERATOR (Reactor Coil Machine Structure) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Dark heavy transformer housing
      ctx.fillStyle = '#1c212a';
      ctx.fillRect(0, 0, S, S);

      // High-voltage copper magnetic induction coils
      ctx.fillStyle = '#b45309';
      ctx.fillRect(4, 4, S - 8, 4);
      ctx.fillRect(4, S - 8, S - 8, 4);

      // Copper ribs
      ctx.fillStyle = '#d97706';
      for (let x = 6; x < S - 6; x += 4) {
        ctx.fillRect(x, 4, 2, 4);
        ctx.fillRect(x, S - 8, 2, 4);
      }

      // Central pulsating plasma reactor core
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(6, 10, S - 12, S - 20);

      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(10, 13, S - 20, 6);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(12, 15, S - 24, 2);

      // Warning lightning hazard symbol
      ctx.fillStyle = '#fbbf24';
      ctx.fillRect(S / 2 - 1, 11, 2, 2);

      this.tileCache.set(TILE_TYPES.GENERATOR, canvas);
      this.register('tile_generator', canvas);
    }

    // --- TILE_TYPES.COMMS_DISH (Subspace Array Terminal) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Dark platform base
      ctx.fillStyle = '#131c26';
      ctx.fillRect(0, 0, S, S);

      // Parabolic concentric dish rings
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, 12, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, 7, 0, Math.PI * 2);
      ctx.stroke();

      // Central emitter needle
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(S / 2 - 2, S / 2 - 2, 4, 4);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(S / 2 - 1, S / 2 - 1, 2, 2);

      // Signal waveguide crossarms
      ctx.fillStyle = '#0369a1';
      ctx.fillRect(S / 2 - 1, 2, 2, 6);
      ctx.fillRect(S / 2 - 1, S - 8, 2, 6);
      ctx.fillRect(2, S / 2 - 1, 6, 2);
      ctx.fillRect(S - 8, S / 2 - 1, 6, 2);

      this.tileCache.set(TILE_TYPES.COMMS_DISH, canvas);
      this.register('tile_comms_dish', canvas);
    }

    // --- TILE_TYPES.ESCAPE_POD ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Dock berth
      ctx.fillStyle = '#1e2632';
      ctx.fillRect(0, 0, S, S);

      // Pod hull curvature
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, 13, 0, Math.PI * 2);
      ctx.fill();

      // Hatch viewport
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(S / 2, S / 2, 6, 0, Math.PI * 2);
      ctx.fill();

      // Launch hazard border
      ctx.fillStyle = '#eab308';
      ctx.fillRect(2, 2, 3, 3);
      ctx.fillRect(S - 5, 2, 3, 3);
      ctx.fillRect(2, S - 5, 3, 3);
      ctx.fillRect(S - 5, S - 5, 3, 3);

      this.tileCache.set(TILE_TYPES.ESCAPE_POD, canvas);
      this.register('tile_escape_pod', canvas);
    }
  }

  // =========================================================================
  // 2. ITEM & PICKUP BAKING
  // =========================================================================

  bakeItems() {
    const S = 32;

    // --- Signal Fragment Alpha [CRY-01] (Cyan Cryo Crystal) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      const cx = S / 2;
      const cy = S / 2;

      // Glow halo
      ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();

      // Holographic Octahedron Prism
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy + 10);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
      ctx.fill();

      // Facet highlights
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx + 7, cy);
      ctx.lineTo(cx, cy);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#bae6fd';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 10);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx - 7, cy);
      ctx.closePath();
      ctx.fill();

      // Glowing core spark
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);

      this.itemCache.set(ITEM_TYPES.FRAGMENT_ALPHA, canvas);
      this.itemCache.set('frag-alpha', canvas);
      this.register('item_frag_alpha', canvas);
    }

    // --- Signal Fragment Beta [PWR-02] (Amber Power Core) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      const cx = S / 2;
      const cy = S / 2;

      // Amber glow
      ctx.fillStyle = 'rgba(245, 158, 11, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();

      // Resonance ring
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, 8, 0, Math.PI * 2);
      ctx.stroke();

      // Central core
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(cx - 4, cy - 4, 8, 8);
      ctx.fillStyle = '#fef3c7';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);

      this.itemCache.set(ITEM_TYPES.FRAGMENT_BETA, canvas);
      this.itemCache.set('frag-beta', canvas);
      this.register('item_frag_beta', canvas);
    }

    // --- Signal Fragment Gamma [DAT-03] (Purple Neural Shard) ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      const cx = S / 2;
      const cy = S / 2;

      // Purple glow
      ctx.fillStyle = 'rgba(168, 85, 247, 0.25)';
      ctx.beginPath();
      ctx.arc(cx, cy, 12, 0, Math.PI * 2);
      ctx.fill();

      // Neural lattice shards
      ctx.fillStyle = '#7e22ce';
      ctx.beginPath();
      ctx.moveTo(cx - 6, cy - 8);
      ctx.lineTo(cx + 8, cy - 5);
      ctx.lineTo(cx + 4, cy + 8);
      ctx.lineTo(cx - 7, cy + 4);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#c084fc';
      ctx.fillRect(cx - 3, cy - 3, 6, 6);
      ctx.fillStyle = '#faf5ff';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);

      this.itemCache.set(ITEM_TYPES.FRAGMENT_GAMMA, canvas);
      this.itemCache.set('frag-gamma', canvas);
      this.register('item_frag_gamma', canvas);
    }

    // --- KEYCARDS (Blue, Red, Master) ---
    const keycards = [
      { type: ITEM_TYPES.KEYCARD_BLUE, id: 'keycard-blue', base: '#1d4ed8', chip: '#60a5fa', trim: '#93c5fd' },
      { type: ITEM_TYPES.KEYCARD_RED, id: 'keycard-red', base: '#b91c1c', chip: '#f87171', trim: '#fca5a5' },
      { type: ITEM_TYPES.KEYCARD_MASTER, id: 'keycard-master', base: '#b45309', chip: '#fbbf24', trim: '#fef08a' }
    ];

    for (const kc of keycards) {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      const cx = S / 2;
      const cy = S / 2;

      // Card body
      ctx.fillStyle = kc.base;
      ctx.fillRect(cx - 7, cy - 5, 14, 10);

      // Holographic magnetic strip
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - 7, cy - 3, 14, 2);

      // Microchip / Smart contact pins
      ctx.fillStyle = kc.chip;
      ctx.fillRect(cx + 1, cy + 1, 4, 3);

      // Lanyard hole
      ctx.fillStyle = '#000000';
      ctx.fillRect(cx - 5, cy - 4, 2, 2);

      // Glowing outline
      ctx.strokeStyle = kc.trim;
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - 7.5, cy - 5.5, 15, 11);

      this.itemCache.set(kc.type, canvas);
      this.itemCache.set(kc.id, canvas);
      this.register(`item_${kc.id}`, canvas);
    }

    // --- BATTERY PACK ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      const cx = S / 2;
      const cy = S / 2;

      // Battery body
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(cx - 6, cy - 8, 12, 16);

      // Positive terminal nub
      ctx.fillStyle = '#94a3b8';
      ctx.fillRect(cx - 2, cy - 10, 4, 2);

      // Green charge level bars
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(cx - 4, cy - 5, 8, 2);
      ctx.fillRect(cx - 4, cy - 1, 8, 2);
      ctx.fillRect(cx - 4, cy + 3, 8, 2);

      // Lightning bolt icon
      ctx.fillStyle = '#eab308';
      ctx.fillRect(cx - 1, cy - 3, 2, 6);

      this.itemCache.set(ITEM_TYPES.BATTERY_PACK, canvas);
      this.itemCache.set('battery', canvas);
      this.register('item_battery', canvas);
    }

    // --- MEDKIT ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      const cx = S / 2;
      const cy = S / 2;

      // White hardcase container
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(cx - 8, cy - 6, 16, 12);

      // Bevel & latch
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(cx - 8, cy + 4, 16, 2);
      ctx.fillStyle = '#475569';
      ctx.fillRect(cx - 2, cy - 7, 4, 2); // Handle

      // Medical Red Cross
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(cx - 5, cy - 2, 10, 4);
      ctx.fillRect(cx - 2, cy - 5, 4, 10);

      this.itemCache.set(ITEM_TYPES.MEDKIT, canvas);
      this.itemCache.set('medkit', canvas);
      this.register('item_medkit', canvas);
    }

    // --- TERMINAL CONSOLE SPRITE ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      // Console pedestal
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(4, 4, S - 8, S - 8);

      // Phosphor Green CRT Screen
      ctx.fillStyle = '#022c15';
      ctx.fillRect(7, 7, S - 14, 11);

      // CRT Scanlines & Code Text
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(9, 9, 8, 1);
      ctx.fillRect(9, 12, 12, 1);
      ctx.fillRect(9, 15, 6, 1);

      // Keyboard & Control Panel deck
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(7, 20, S - 14, 6);
      ctx.fillStyle = '#64748b';
      ctx.fillRect(9, 21, 10, 2);
      ctx.fillRect(9, 24, 12, 1);

      // Status indicator lights
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(S - 9, 21, 2, 2);
      ctx.fillStyle = '#ffaa00';
      ctx.fillRect(S - 9, 24, 2, 1);

      this.itemCache.set('terminal', canvas);
      this.register('prop_terminal', canvas);
    }
  }

  // =========================================================================
  // 3. DECAL BAKING
  // =========================================================================

  bakeDecals() {
    const S = 32;

    // --- BLOOD SPLATTERS (1, 2, 3) ---
    {
      // Splatter 1
      const c1 = createOffscreenCanvas(S, S);
      const ctx1 = c1.getContext('2d');
      ctx1.fillStyle = 'rgba(120, 10, 20, 0.85)';
      ctx1.beginPath();
      ctx1.arc(14, 15, 6, 0, Math.PI * 2);
      ctx1.arc(22, 12, 3.5, 0, Math.PI * 2);
      ctx1.arc(9, 21, 2.5, 0, Math.PI * 2);
      ctx1.arc(24, 23, 2, 0, Math.PI * 2);
      ctx1.fill();
      ctx1.fillStyle = 'rgba(70, 5, 10, 0.9)';
      ctx1.fillRect(13, 14, 3, 3);
      this.decalCache.set('blood_1', c1);
      this.register('decal_blood_1', c1);

      // Splatter 2 (Directional spray)
      const c2 = createOffscreenCanvas(S, S);
      const ctx2 = c2.getContext('2d');
      ctx2.fillStyle = 'rgba(130, 15, 25, 0.8)';
      ctx2.beginPath();
      ctx2.ellipse(16, 16, 9, 4, Math.PI / 4, 0, Math.PI * 2);
      ctx2.fill();
      ctx2.fillStyle = 'rgba(100, 10, 20, 0.7)';
      ctx2.fillRect(6, 6, 2, 2);
      ctx2.fillRect(25, 24, 2, 3);
      ctx2.fillRect(27, 27, 1, 1);
      this.decalCache.set('blood_2', c2);
      this.register('decal_blood_2', c2);
    }

    // --- OIL LEAK / MACHINE FLUID ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(10, 15, 22, 0.9)';
      ctx.beginPath();
      ctx.ellipse(16, 17, 10, 6, -0.2, 0, Math.PI * 2);
      ctx.arc(8, 14, 3, 0, Math.PI * 2);
      ctx.fill();

      // Iridescent sheen highlight
      ctx.fillStyle = 'rgba(40, 90, 80, 0.4)';
      ctx.beginPath();
      ctx.ellipse(14, 15, 5, 2, -0.2, 0, Math.PI * 2);
      ctx.fill();

      this.decalCache.set('oil_1', canvas);
      this.register('decal_oil_1', canvas);
    }

    // --- HAZARD STRIPES DECAL ---
    {
      const canvas = createOffscreenCanvas(S, S);
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = 'rgba(0, 0, 0, 0)';
      ctx.fillRect(0, 0, S, S);

      for (let i = -S; i < S * 2; i += 8) {
        ctx.fillStyle = '#ffaa00';
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + 4, 0);
        ctx.lineTo(i + 4 - S, S);
        ctx.lineTo(i - S, S);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1a1a1a';
        ctx.beginPath();
        ctx.moveTo(i + 4, 0);
        ctx.lineTo(i + 8, 0);
        ctx.lineTo(i + 8 - S, S);
        ctx.lineTo(i + 4 - S, S);
        ctx.closePath();
        ctx.fill();
      }

      this.decalCache.set('hazard_stripes', canvas);
      this.register('decal_hazard_stripes', canvas);
    }
  }

  // =========================================================================
  // 4. PRE-BAKED ENTITY ANIMATION FRAMES
  // =========================================================================

  bakeEntityFrames() {
    // We pre-bake walk animation frames for Dr. Vance (facing right at 0 rad)
    // When rendering in-game, we rotate canvas to current aim angle for 360-degree fluid aiming!
    const frameCount = 6;
    for (let f = 0; f < frameCount; f++) {
      const size = 36;
      const canvas = createOffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;

      // Leg step offset based on frame index
      const legPhase = (f / frameCount) * Math.PI * 2;
      const leftLegOffset = Math.sin(legPhase) * 4;
      const rightLegOffset = -Math.sin(legPhase) * 4;

      // 1. Shadow beneath
      ctx.fillStyle = 'rgba(2, 4, 6, 0.45)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 2, 11, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      // 2. Boots / Feet (Top-down view)
      ctx.fillStyle = '#1c2430';
      ctx.fillRect(cx - 5 + leftLegOffset, cy - 9, 7, 4); // Left foot
      ctx.fillRect(cx - 5 + rightLegOffset, cy + 5, 7, 4); // Right foot

      // 3. Life-Support Backpack & Oxygen Tanks
      ctx.fillStyle = '#2b3648';
      ctx.fillRect(cx - 10, cy - 6, 6, 12);
      // Status indicator LED on backpack
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(cx - 9, cy - 4, 2, 2);

      // 4. Hazmat / Space Suit Body (Torso & Shoulders)
      ctx.fillStyle = '#3a475a';
      ctx.beginPath();
      ctx.ellipse(cx - 1, cy, 8, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // High-vis shoulder hazard orange stripes
      ctx.fillStyle = '#ff7700';
      ctx.fillRect(cx - 4, cy - 7, 4, 2);
      ctx.fillRect(cx - 4, cy + 5, 4, 2);

      // 5. Arms & Hands holding equipment
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(cx + 2, cy - 6, 6, 3); // Left arm
      ctx.fillRect(cx + 2, cy + 3, 6, 3); // Right arm

      // Right shoulder mounted flashlight fixture
      ctx.fillStyle = '#64748b';
      ctx.fillRect(cx + 5, cy + 4, 4, 3);
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(cx + 8, cy + 4, 2, 3);

      // 6. Helmet (Charcoal with Visor)
      ctx.fillStyle = '#212936';
      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fill();

      // Luminous Visor Glass (Cyan glow pointing forward at +X)
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.arc(cx + 1, cy, 4.5, -Math.PI / 2.5, Math.PI / 2.5);
      ctx.fill();

      // Visor specular glass glint
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx + 3, cy - 1, 1, 2);

      this.register(`player_walk_${f}`, canvas);
    }

    // NEXUS-9 Pulse Frames (8 frames)
    for (let f = 0; f < 8; f++) {
      const size = 48;
      const canvas = createOffscreenCanvas(size, size);
      const ctx = canvas.getContext('2d');
      const cx = size / 2;
      const cy = size / 2;
      const phase = (f / 8) * Math.PI * 2;

      // 1. Menacing dark-matter core
      ctx.fillStyle = '#0d021a';
      ctx.beginPath();
      ctx.arc(cx, cy, 14 + Math.sin(phase) * 2, 0, Math.PI * 2);
      ctx.fill();

      // 2. Holographic wireframe lattice nodes
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + phase * 0.5;
        const rad = 15 + Math.sin(phase + i) * 3;
        const px = cx + Math.cos(ang) * rad;
        const py = cy + Math.sin(ang) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.stroke();

      // 3. Central optical sensor cluster (Red AI Eye)
      ctx.fillStyle = '#ff0033';
      ctx.beginPath();
      ctx.arc(cx, cy, 5 + Math.sin(phase * 2) * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Central core highlight
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(cx - 1, cy - 1, 2, 2);

      this.register(`nexus_pulse_${f}`, canvas);
    }
  }

  // =========================================================================
  // 5. DYNAMIC IN-GAME ENTITY RENDERERS
  // =========================================================================

  /**
   * Renders Dr. Vance with precise rotational aim, smooth walk cycle interpolation,
   * flashlight fixture, and damage flash.
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x World X coordinate
   * @param {number} y World Y coordinate
   * @param {number} angle Look/Aim direction in radians
   * @param {number} [animTime=0] Time accumulator for walk cycle
   * @param {boolean} [isMoving=false]
   * @param {boolean} [isDamaged=false]
   * @param {boolean} [flashlightOn=true]
   */
  renderPlayer(ctx, x, y, angle, animTime = 0, isMoving = false, isDamaged = false, flashlightOn = true) {
    if (!this.initialized) this.init();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Frame selection
    const frameIndex = isMoving ? Math.floor((animTime * 8) % 6) : 0;
    const sprite = this.get(`player_walk_${frameIndex}`) || this.get('player_walk_0');

    if (sprite) {
      // Draw centered sprite
      const s = sprite.width;
      ctx.drawImage(sprite, -s / 2, -s / 2);
    }

    // Flashlight fixture beam flare
    if (flashlightOn) {
      ctx.fillStyle = 'rgba(200, 245, 255, 0.85)';
      ctx.fillRect(10, 3, 3, 2);
      ctx.fillStyle = 'rgba(0, 240, 255, 0.4)';
      ctx.fillRect(9, 2, 5, 4);
    }

    // Damage flash overlay
    if (isDamaged) {
      ctx.fillStyle = 'rgba(255, 34, 68, 0.45)';
      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  /**
   * Renders the terrifying NEXUS-9 AI Entity with procedural shifting tendrils,
   * holographic cage rotation, red scanning sensor iris, and glitch spikes.
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} x World X coordinate
   * @param {number} y World Y coordinate
   * @param {number} angle Movement/Facing direction
   * @param {number} [time=0] Time accumulator in seconds
   * @param {string} [aiState=AI_STATES.PATROL]
   * @param {number} [pulseFactor=1.0] Proximity/Threat pulse scale
   */
  renderEntity(ctx, x, y, angle, time = 0, aiState = AI_STATES.PATROL, pulseFactor = 1.0) {
    if (!this.initialized) this.init();

    ctx.save();
    ctx.translate(x, y);

    const isFrenzy = aiState === AI_STATES.FRENZY || aiState === AI_STATES.CHASE;
    const speedMult = isFrenzy ? 3.0 : 1.5;
    const t = time * speedMult;

    // 1. Shifting Dark Matter Tendrils (Procedural Bezier curves)
    const tendrilCount = isFrenzy ? 8 : 6;
    ctx.strokeStyle = isFrenzy ? 'rgba(180, 0, 40, 0.7)' : 'rgba(75, 0, 130, 0.65)';
    ctx.lineWidth = 2.5;

    for (let i = 0; i < tendrilCount; i++) {
      const baseAng = (i / tendrilCount) * Math.PI * 2 + t * 0.4;
      const reach = (22 + Math.sin(t * 3 + i * 2) * 8) * pulseFactor;
      const cpAng = baseAng + Math.cos(t * 2 + i) * 0.8;
      const cpDist = 14 * pulseFactor;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(
        Math.cos(cpAng) * cpDist,
        Math.sin(cpAng) * cpDist,
        Math.cos(baseAng) * reach,
        Math.sin(baseAng) * reach
      );
      ctx.stroke();
    }

    // 2. Outer Pulsating Dark Anomaly Core
    const coreRad = (14 + Math.sin(t * 4) * 3) * pulseFactor;
    const grad = ctx.createRadialGradient(0, 0, 2, 0, 0, coreRad + 8);
    grad.addColorStop(0, isFrenzy ? '#ff0033' : '#a855f7');
    grad.addColorStop(0.5, isFrenzy ? '#660011' : '#1e0836');
    grad.addColorStop(1, 'rgba(10, 2, 20, 0)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, coreRad + 8, 0, Math.PI * 2);
    ctx.fill();

    // 3. Rotating Holographic Wireframe Cage
    const nodeCount = 5;
    ctx.strokeStyle = isFrenzy ? '#ff2244' : '#00f0ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();

    for (let i = 0; i < nodeCount; i++) {
      const ang = (i / nodeCount) * Math.PI * 2 - t * 0.8;
      const r = (16 + Math.sin(t * 2 + i) * 4) * pulseFactor;
      const px = Math.cos(ang) * r;
      const py = Math.sin(ang) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);

      // Node vertex spark
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px - 1.5, py - 1.5, 3, 3);
    }
    ctx.closePath();
    ctx.stroke();

    // 4. Central Optical Red Sensor Cluster
    ctx.fillStyle = '#ff0033';
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-1.5, -1.5, 3, 3);

    // 5. Digital Glitch Voxel Spikes (Occasional micro-offsets)
    if (Math.random() < 0.35 || isFrenzy) {
      ctx.fillStyle = isFrenzy ? 'rgba(255, 0, 68, 0.8)' : 'rgba(0, 240, 255, 0.8)';
      const gx = (Math.random() - 0.5) * 36;
      const gy = (Math.random() - 0.5) * 36;
      ctx.fillRect(gx, gy, 4, 4);
    }

    ctx.restore();
  }

  /**
   * Renders an interactive item pickup in the world with gentle levitation and breathing glow.
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} item Item metadata (type, x, y, subType)
   * @param {number} [time=0] Animation time
   */
  renderItem(ctx, item, time = 0) {
    if (!this.initialized) this.init();

    const hoverY = Math.sin(time * 3 + (item.x || 0)) * 3;
    const sprite = this.getItem(item.type) ||
                   this.getItem(item.id) ||
                   this.getItem(item.subType) ||
                   this.getItem(ITEM_TYPES.MEDKIT);

    if (sprite) {
      const s = sprite.width;
      ctx.drawImage(sprite, item.x - s / 2, item.y - s / 2 + hoverY);
    }
  }

  /**
   * Renders a computer terminal console with glowing CRT screen and animated cursor.
   * 
   * @param {CanvasRenderingContext2D} ctx
   * @param {Object} terminal Terminal metadata (x, y, type)
   * @param {number} [time=0]
   */
  renderTerminal(ctx, terminal, time = 0) {
    if (!this.initialized) this.init();

    const sprite = this.get('prop_terminal');
    if (sprite) {
      const s = sprite.width;
      ctx.drawImage(sprite, terminal.x - s / 2, terminal.y - s / 2);
    }

    // Blinking CRT cursor
    if (Math.floor(time * 3) % 2 === 0) {
      ctx.fillStyle = '#00ff66';
      ctx.fillRect(terminal.x + 2, terminal.y - 4, 3, 2);
    }
  }
}
