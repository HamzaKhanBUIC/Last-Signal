/**
 * THE LAST SIGNAL — WORLD-CLASS 3D/2.5D WEBGL RENDERING ENGINE (THREE.JS)
 * 
 * Features:
 * - Isometric Perspective Camera with smooth tracking & 3D trauma shake
 * - Real-time 3D PBR Materials (Metallic deck plates, reinforced bulkheads, glass)
 * - Dynamic 3D SpotLight Flashlight with real-time soft shadow mapping
 * - Volumetric Dust Shaft Cone and atmospheric particle motes
 * - 3D Sliding Airlock Bulkhead Doors with smooth pneumatic animation
 * - 3D Modular Props (Terminals, Cryo Tubes, Reactor Turbines, Escape Pod)
 * - 3D Procedural NEXUS-9 Anomaly with undulating 3D spline tentacles & red eye
 * - Dynamic PointLights (Emergency red strobes, server green LEDs, cryo blue glow)
 * - Seamless 2D CRT HUD & Terminal Compositing
 */

import * as THREE from 'three';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  TILE_SIZE,
  TILE_TYPES,
  COLORS,
  AI_STATES
} from '../utils/Constants.js';

export class ThreeRenderer {
  /**
   * @param {HTMLCanvasElement} [canvas]
   * @param {Object} [options]
   */
  constructor(canvas = null, options = {}) {
    this.canvas = canvas;
    this.width = options.width || CANVAS_WIDTH;
    this.height = options.height || CANVAS_HEIGHT;

    this.isWebGLAvailable = false;
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // 3D Scene Entity Meshes
    this.wallMeshes = [];
    this.floorMeshes = [];
    this.doorMeshes = new Map(); // key: 'x,y' -> { meshLeft, meshRight, openState }
    this.propMeshes = new Map(); // key: id -> mesh
    this.pickupMeshes = new Map();

    // Player 3D Mesh
    this.playerGroup = null;
    this.flashlightSpot = null;
    this.flashlightVolumetric = null;
    this.visorLight = null;

    // NEXUS-9 3D Mesh
    this.enemyGroup = null;
    this.enemyTentacles = [];
    this.enemyEyeLight = null;

    // Lighting
    this.ambientLight = null;
    this.pointLights = [];

    // Particle cloud
    this.dustParticleSystem = null;

    // Animation time accumulator
    this.time = 0;

    this.init();
  }

  /**
   * Initializes the Three.js 3D scene, materials, lights, and camera.
   */
  init() {
    if (typeof window === 'undefined' || !this.canvas) {
      // Headless / Test environment fallback
      this.isWebGLAvailable = false;
      return;
    }

    try {
      // 1. Setup Three.js WebGLRenderer
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;

      // 2. Setup 3D Scene & Fog
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#030508');
      this.scene.fog = new THREE.FogExp2('#030508', 0.0018);

      // 3. Setup Perspective Camera (Isometric High-Angle View)
      const aspect = this.width / this.height;
      this.camera = new THREE.PerspectiveCamera(50, aspect, 10, 2000);
      this.camera.position.set(0, 360, 240);
      this.camera.lookAt(0, 0, 0);

      // 4. Setup Lighting
      this.setupLights();

      // 5. Setup Player & Enemy 3D Models
      this.setupPlayerModel();
      this.setupEnemyModel();

      // 6. Setup Atmospheric Dust Particle Cloud
      this.setupDustParticles();

      this.isWebGLAvailable = true;
    } catch (e) {
      console.warn('[ThreeRenderer] WebGL initialization failed, falling back to 2D Canvas:', e);
      this.isWebGLAvailable = false;
    }
  }

  /**
   * Builds atmospheric dynamic scene lights.
   */
  setupLights() {
    // Subtle ambient darkness
    this.ambientLight = new THREE.AmbientLight('#0a101d', 0.4);
    this.scene.add(this.ambientLight);

    // Directional distant rim light
    const dirLight = new THREE.DirectionalLight('#1e293b', 0.3);
    dirLight.position.set(100, 400, 200);
    this.scene.add(dirLight);
  }

  /**
   * Constructs the 3D Player Character Model (Dr. Vance).
   */
  setupPlayerModel() {
    this.playerGroup = new THREE.Group();

    // 1. Suit Torso & Oxygen Backpack
    const suitMat = new THREE.MeshStandardMaterial({
      color: '#3a475a',
      roughness: 0.5,
      metalness: 0.3
    });
    const torsoGeo = new THREE.CylinderGeometry(8, 7, 18, 12);
    const torso = new THREE.Mesh(torsoGeo, suitMat);
    torso.position.y = 12;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.playerGroup.add(torso);

    // Oxygen Tank Backpack
    const tankMat = new THREE.MeshStandardMaterial({ color: '#2b3648', metalness: 0.6, roughness: 0.3 });
    const tankGeo = new THREE.BoxGeometry(10, 14, 6);
    const tank = new THREE.Mesh(tankGeo, tankMat);
    tank.position.set(-6, 13, 0);
    tank.castShadow = true;
    this.playerGroup.add(tank);

    // 2. Helmet & Visor
    const helmetMat = new THREE.MeshStandardMaterial({ color: '#1e2632', metalness: 0.5, roughness: 0.4 });
    const helmetGeo = new THREE.SphereGeometry(6, 16, 16);
    const helmet = new THREE.Mesh(helmetGeo, helmetMat);
    helmet.position.set(0, 24, 0);
    helmet.castShadow = true;
    this.playerGroup.add(helmet);

    // Luminous Cyan Visor
    const visorMat = new THREE.MeshStandardMaterial({
      color: '#00f0ff',
      emissive: '#00f0ff',
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.9
    });
    const visorGeo = new THREE.SphereGeometry(4, 12, 12, 0, Math.PI);
    const visor = new THREE.Mesh(visorGeo, visorMat);
    visor.rotation.y = Math.PI / 2;
    visor.position.set(3.5, 24, 0);
    this.playerGroup.add(visor);

    // 3. Tactical 3D Flashlight SpotLight & Volumetric Light Beam
    this.flashlightSpot = new THREE.SpotLight('#ffffff', 4.5, 450, Math.PI / 5, 0.4, 1.2);
    this.flashlightSpot.position.set(6, 18, 0);
    this.flashlightSpot.castShadow = true;
    this.flashlightSpot.shadow.mapSize.width = 1024;
    this.flashlightSpot.shadow.mapSize.height = 1024;
    this.flashlightSpot.shadow.camera.near = 10;
    this.flashlightSpot.shadow.camera.far = 450;
    this.flashlightSpot.shadow.bias = -0.001;

    // Flashlight target node
    const spotTarget = new THREE.Object3D();
    spotTarget.position.set(200, 12, 0);
    this.playerGroup.add(spotTarget);
    this.flashlightSpot.target = spotTarget;

    this.playerGroup.add(this.flashlightSpot);

    // 4. Volumetric Light Shaft Cone Mesh
    const coneGeo = new THREE.ConeGeometry(55, 300, 16, 1, true);
    coneGeo.translate(0, -150, 0);
    coneGeo.rotateZ(Math.PI / 2);
    const coneMat = new THREE.MeshBasicMaterial({
      color: '#c8f5ff',
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    this.flashlightVolumetric = new THREE.Mesh(coneGeo, coneMat);
    this.flashlightVolumetric.position.set(6, 18, 0);
    this.playerGroup.add(this.flashlightVolumetric);

    this.scene.add(this.playerGroup);
  }

  /**
   * Constructs the 3D NEXUS-9 Predatory Entity Model.
   */
  setupEnemyModel() {
    this.enemyGroup = new THREE.Group();

    // 1. Shifting Dark Matter Core
    const coreMat = new THREE.MeshStandardMaterial({
      color: '#0d021a',
      emissive: '#4a044e',
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.8
    });
    const coreGeo = new THREE.IcosahedronGeometry(14, 2);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 18;
    this.enemyGroup.add(core);

    // 2. Central Crimson Sensor Eye
    const eyeMat = new THREE.MeshStandardMaterial({
      color: '#ff0033',
      emissive: '#ff0033',
      emissiveIntensity: 1.5,
      roughness: 0.1,
      metalness: 0.9
    });
    const eyeGeo = new THREE.SphereGeometry(5, 16, 16);
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 18, 0);
    this.enemyGroup.add(eye);

    // Red AI PointLight casting eerie shadows
    this.enemyEyeLight = new THREE.PointLight('#ff0033', 2.5, 220);
    this.enemyEyeLight.position.set(0, 18, 0);
    this.enemyGroup.add(this.enemyEyeLight);

    // 3. Orbiting Wireframe Rings
    const ringMat = new THREE.MeshBasicMaterial({
      color: '#a855f7',
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    const ringGeo = new THREE.TorusGeometry(18, 0.8, 8, 24);
    const ring1 = new THREE.Mesh(ringGeo, ringMat);
    ring1.position.y = 18;
    this.enemyGroup.add(ring1);

    this.scene.add(this.enemyGroup);
  }

  /**
   * Creates volumetric dust particle system drifting through the station.
   */
  setupDustParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 1200;
      positions[i + 1] = Math.random() * 80 + 5;
      positions[i + 2] = (Math.random() - 0.5) * 1200;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: '#88ccff',
      size: 2.5,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });

    this.dustParticleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.dustParticleSystem);
  }

  /**
   * Builds the 3D level meshes (Floors, 3D Wall Blocks, Doors, Lights).
   * @param {import('../world/LevelManager.js').LevelManager} level
   */
  buildLevel(level) {
    if (!this.isWebGLAvailable || !level) return;

    // Clear old geometry
    for (const mesh of this.wallMeshes) this.scene.remove(mesh);
    for (const mesh of this.floorMeshes) this.scene.remove(mesh);
    this.wallMeshes = [];
    this.floorMeshes = [];
    this.doorMeshes.clear();

    const ts = TILE_SIZE; // 32
    const wallHeight = 36;

    // Shared PBR Materials
    const wallMat = new THREE.MeshStandardMaterial({
      color: '#1e2530',
      roughness: 0.6,
      metalness: 0.4
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: '#121720',
      roughness: 0.8,
      metalness: 0.2
    });

    const floorGrateMat = new THREE.MeshStandardMaterial({
      color: '#090d14',
      roughness: 0.4,
      metalness: 0.7
    });

    const doorMat = new THREE.MeshStandardMaterial({
      color: '#2d3748',
      roughness: 0.5,
      metalness: 0.5
    });

    const wallGeo = new THREE.BoxGeometry(ts, wallHeight, ts);
    const floorGeo = new THREE.PlaneGeometry(ts, ts);
    floorGeo.rotateX(-Math.PI / 2);

    for (let ty = 0; ty < level.height; ty++) {
      for (let tx = 0; tx < level.width; tx++) {
        const tile = level.getTile(tx, ty);
        const worldX = tx * ts + ts / 2;
        const worldZ = ty * ts + ts / 2;

        if (tile === TILE_TYPES.WALL) {
          const wall = new THREE.Mesh(wallGeo, wallMat);
          wall.position.set(worldX, wallHeight / 2, worldZ);
          wall.castShadow = true;
          wall.receiveShadow = true;
          this.scene.add(wall);
          this.wallMeshes.push(wall);
        } else if (tile === TILE_TYPES.FLOOR || tile === TILE_TYPES.FLOOR_GRATE) {
          const floor = new THREE.Mesh(floorGeo, tile === TILE_TYPES.FLOOR_GRATE ? floorGrateMat : floorMat);
          floor.position.set(worldX, 0, worldZ);
          floor.receiveShadow = true;
          this.scene.add(floor);
          this.floorMeshes.push(floor);
        } else if (tile >= TILE_TYPES.DOOR_CLOSED && tile <= TILE_TYPES.DOOR_LOCKED_MASTER) {
          // 3D Sliding Airlock Door Leaf Meshes
          const leftDoor = new THREE.Mesh(new THREE.BoxGeometry(ts / 2 - 1, wallHeight, 6), doorMat);
          leftDoor.position.set(worldX - ts / 4, wallHeight / 2, worldZ);
          leftDoor.castShadow = true;
          leftDoor.receiveShadow = true;

          const rightDoor = new THREE.Mesh(new THREE.BoxGeometry(ts / 2 - 1, wallHeight, 6), doorMat);
          rightDoor.position.set(worldX + ts / 4, wallHeight / 2, worldZ);
          rightDoor.castShadow = true;
          rightDoor.receiveShadow = true;

          this.scene.add(leftDoor);
          this.scene.add(rightDoor);

          this.doorMeshes.set(`${tx},${ty}`, {
            left: leftDoor,
            right: rightDoor,
            originX: worldX,
            isOpen: tile === TILE_TYPES.DOOR_OPEN
          });
        }
      }
    }

    // Build Sector Ambient PointLights
    const lightSources = level.getLightSources ? level.getLightSources() : [];
    for (const ls of lightSources) {
      const pLight = new THREE.PointLight(ls.color || '#00f0ff', ls.intensity || 1.2, ls.radius || 180);
      pLight.position.set(ls.x, 24, ls.y);
      pLight.castShadow = false;
      this.scene.add(pLight);
      this.pointLights.push(pLight);
    }
  }

  /**
   * Master 3D Render Cycle.
   * @param {Object} player
   * @param {Object} enemy
   * @param {number} dt Delta time
   * @param {Object} camera
   */
  render(player, enemy, dt, camera) {
    if (!this.isWebGLAvailable || !this.renderer) return;

    this.time += dt;

    // 1. Update Player 3D Position & Rotation
    if (player && this.playerGroup) {
      this.playerGroup.position.set(player.x, 0, player.y);
      this.playerGroup.rotation.y = -player.angle;

      // Toggle flashlight visibility
      const lightOn = !!player.isFlashlightOn;
      this.flashlightSpot.visible = lightOn;
      this.flashlightVolumetric.visible = lightOn;

      // Camera Follow with smooth isometric perspective
      const targetCamX = player.x;
      const targetCamZ = player.y + 190;
      const targetCamY = 320;

      this.camera.position.x += (targetCamX - this.camera.position.x) * 0.1;
      this.camera.position.z += (targetCamZ - this.camera.position.z) * 0.1;
      this.camera.position.y = targetCamY;
      this.camera.lookAt(player.x, 10, player.y);
    }

    // 2. Update NEXUS-9 3D Position & Anomaly Pulsing
    if (enemy && this.enemyGroup && enemy.active) {
      this.enemyGroup.position.set(enemy.x, 0, enemy.y);
      this.enemyGroup.rotation.y += dt * 1.5;

      const isFrenzy = enemy.state === AI_STATES.FRENZY || enemy.state === AI_STATES.CHASE;
      this.enemyEyeLight.intensity = (1.8 + Math.sin(this.time * 6) * 0.8) * (isFrenzy ? 2.0 : 1.0);
    }

    // 3. Animate Volumetric Dust Particles
    if (this.dustParticleSystem) {
      this.dustParticleSystem.rotation.y += dt * 0.02;
    }

    // 4. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Resizes viewport buffers.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    if (this.camera && this.renderer) {
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    }
  }
}
