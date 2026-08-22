/**
 * THE LAST SIGNAL — 2D DYNAMIC RAYCAST LIGHTING & SHADOW MASK SYSTEM
 * 
 * High-performance 2D raycasting visibility polygon generator,
 * directional flashlight beam, pulsing ambient station beacons,
 * entity aura distortion, and soft shadow mask compositing.
 */

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  FLASHLIGHT_CONE_ANGLE,
  FLASHLIGHT_DISTANCE,
  FLASHLIGHT_INNER_RADIUS,
  FLASHLIGHT_LOW_BATTERY,
  FLASHLIGHT_CRITICAL_BATTERY,
  ENEMY_AURA_NEAR_DIST,
  COLORS
} from '../utils/Constants.js';
import {
  raySegmentIntersection,
  normalizeAngle,
  normalizeAngle2PI,
  angleDifference,
  clamp,
  distance
} from '../utils/MathUtils.js';
import { createOffscreenCanvas } from './CanvasUtils.js';

export class LightingSystem {
  /**
   * @param {number} [width=CANVAS_WIDTH]
   * @param {number} [height=CANVAS_HEIGHT]
   */
  constructor(width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
    this.width = width;
    this.height = height;

    // Offscreen Darkness Canvas Mask
    this.darknessCanvas = createOffscreenCanvas(width, height);
    this.darknessCtx = this.darknessCanvas.getContext('2d');

    // Dynamic light state accumulators
    this.time = 0;
    this.ambientDarkness = 'rgba(3, 5, 8, 0.95)';
    this.ambientColor = '#030508';

    // Custom dynamic lights (e.g. flares, muzzle flashes, explosions)
    this.dynamicLights = [];

    // Debug visualization toggle
    this.debugShowRays = false;
    this.debugShowSegments = false;
  }

  /**
   * Resizes internal darkness mask buffer.
   * @param {number} width
   * @param {number} height
   */
  resize(width, height) {
    this.width = width;
    this.height = height;
    this.darknessCanvas = createOffscreenCanvas(width, height);
    this.darknessCtx = this.darknessCanvas.getContext('2d');
  }

  /**
   * Adds a temporary or persistent dynamic light source.
   * @param {Object} light
   */
  addDynamicLight(light) {
    this.dynamicLights.push({
      id: light.id || `dyn-light-${Date.now()}-${Math.random()}`,
      x: light.x,
      y: light.y,
      radius: light.radius || 150,
      color: light.color || '#00f0ff',
      intensity: light.intensity !== undefined ? light.intensity : 1.0,
      duration: light.duration || Infinity,
      elapsed: 0,
      flicker: light.flicker || false,
      pulse: light.pulse || false,
      pulseSpeed: light.pulseSpeed || 2.0
    });
  }

  /**
   * Updates dynamic lights and animation timers.
   * @param {number} dt Delta time in seconds
   */
  update(dt) {
    this.time += dt;

    // Update dynamic light durations
    for (let i = this.dynamicLights.length - 1; i >= 0; i--) {
      const light = this.dynamicLights[i];
      light.elapsed += dt;
      if (light.elapsed >= light.duration) {
        this.dynamicLights.splice(i, 1);
      }
    }
  }

  /**
   * Computes a 2D visibility polygon from a light source origin using raycasting against wall segments.
   * 
   * @param {number} lightX Light center X (world coordinates)
   * @param {number} lightY Light center Y (world coordinates)
   * @param {number} lightRadius Max light reach
   * @param {Array<{p1: {x: number, y: number}, p2: {x: number, y: number}}>} wallSegments
   * @param {Object} [options]
   * @param {boolean} [options.isCone=false] If true, bounds rays to a directional cone
   * @param {number} [options.facingAngle=0] Cone aim direction in radians
   * @param {number} [options.fovAngle=FLASHLIGHT_CONE_ANGLE] Cone aperture in radians
   * @returns {Array<{x: number, y: number}>} Array of polygon vertices
   */
  computeVisibilityPolygon(lightX, lightY, lightRadius, wallSegments, options = {}) {
    const isCone = !!options.isCone;
    const facingAngle = options.facingAngle || 0;
    const fovAngle = options.fovAngle || FLASHLIGHT_CONE_ANGLE;
    const halfFov = fovAngle * 0.5;

    // 1. Frustum cull segments outside light bounding circle
    const relevantSegments = [];
    const radSq = (lightRadius + 10) * (lightRadius + 10);

    for (let i = 0; i < wallSegments.length; i++) {
      const seg = wallSegments[i];
      const d1 = (seg.p1.x - lightX) ** 2 + (seg.p1.y - lightY) ** 2;
      const d2 = (seg.p2.x - lightX) ** 2 + (seg.p2.y - lightY) ** 2;
      if (d1 <= radSq || d2 <= radSq) {
        relevantSegments.push(seg);
      }
    }

    // 2. Collect unique angles to all segment endpoints within radius
    const angles = new Set();
    const eps = 0.0001; // Precision offset for corner grazing rays

    for (let i = 0; i < relevantSegments.length; i++) {
      const seg = relevantSegments[i];
      const p1 = seg.p1;
      const p2 = seg.p2;

      const a1 = Math.atan2(p1.y - lightY, p1.x - lightX);
      const a2 = Math.atan2(p2.y - lightY, p2.x - lightX);

      if (!isCone) {
        angles.add(a1);
        angles.add(a1 - eps);
        angles.add(a1 + eps);
        angles.add(a2);
        angles.add(a2 - eps);
        angles.add(a2 + eps);
      } else {
        // If cone, check if angle falls within FOV plus margin
        if (Math.abs(angleDifference(a1, facingAngle)) <= halfFov + 0.1) {
          angles.add(a1);
          angles.add(a1 - eps);
          angles.add(a1 + eps);
        }
        if (Math.abs(angleDifference(a2, facingAngle)) <= halfFov + 0.1) {
          angles.add(a2);
          angles.add(a2 - eps);
          angles.add(a2 + eps);
        }
      }
    }

    // 3. Add base perimeter arc rays to ensure smooth circular curvature
    if (isCone) {
      // Cone boundaries
      angles.add(facingAngle - halfFov);
      angles.add(facingAngle + halfFov);

      // Arc density points across cone
      const coneSteps = 16;
      for (let s = 1; s < coneSteps; s++) {
        const fraction = s / coneSteps;
        angles.add(facingAngle - halfFov + fraction * fovAngle);
      }
    } else {
      // 360-degree perimeter arc rays
      const omniSteps = 32;
      for (let s = 0; s < omniSteps; s++) {
        angles.add((s / omniSteps) * Math.PI * 2 - Math.PI);
      }
    }

    // 4. Cast rays and find closest segment intersections
    const rayResults = [];
    const angleList = Array.from(angles);

    for (let i = 0; i < angleList.length; i++) {
      const ang = angleList[i];

      // If cone, enforce strict cone boundary clamping
      if (isCone) {
        const diff = angleDifference(ang, facingAngle);
        if (Math.abs(diff) > halfFov + 0.001) continue;
      }

      const rdx = Math.cos(ang);
      const rdy = Math.sin(ang);
      let closestDist = lightRadius;
      let hitX = lightX + rdx * lightRadius;
      let hitY = lightY + rdy * lightRadius;

      // Test against relevant segments
      for (let s = 0; s < relevantSegments.length; s++) {
        const seg = relevantSegments[s];
        const hit = raySegmentIntersection(
          { x: lightX, y: lightY },
          { x: rdx, y: rdy },
          seg.p1,
          seg.p2
        );

        if (hit && hit.distance > 0.01 && hit.distance < closestDist) {
          closestDist = hit.distance;
          hitX = hit.x;
          hitY = hit.y;
        }
      }

      rayResults.push({
        x: hitX,
        y: hitY,
        angle: ang,
        relAngle: isCone ? angleDifference(ang, facingAngle) : normalizeAngle2PI(ang),
        distance: closestDist
      });
    }

    // 5. Sort intersection vertices radially
    if (isCone) {
      rayResults.sort((a, b) => a.relAngle - b.relAngle);
      // Closed polygon includes the light origin point
      return [{ x: lightX, y: lightY }, ...rayResults.map(r => ({ x: r.x, y: r.y }))];
    } else {
      rayResults.sort((a, b) => a.relAngle - b.relAngle);
      return rayResults.map(r => ({ x: r.x, y: r.y }));
    }
  }

  /**
   * Renders the complete dynamic lighting pass and shadow mask composite.
   * 
   * @param {CanvasRenderingContext2D} ctx Main destination canvas context
   * @param {Object} player Player entity instance
   * @param {Object} enemy NEXUS-9 entity instance
   * @param {Object} level LevelManager instance
   * @param {Object} camera Camera instance
   */
  render(ctx, player, enemy, level, camera) {
    if (!level || !camera) return;

    // 1. Clear offscreen darkness mask to atmospheric ambient station darkness
    this.darknessCtx.save();
    this.darknessCtx.setTransform(1, 0, 0, 1, 0, 0);
    this.darknessCtx.globalCompositeOperation = 'source-over';
    this.darknessCtx.fillStyle = 'rgba(2, 6, 12, 0.55)';
    this.darknessCtx.fillRect(0, 0, this.width, this.height);

    // Apply camera viewport transformation to darkness canvas
    camera.apply(this.darknessCtx);

    // 2. Fetch active wall segments for occlusion raycasting
    const wallSegments = level.getWallSegments ? level.getWallSegments() : [];

    // Switch darkness mask to 'destination-out' to carve out light polygons
    this.darknessCtx.globalCompositeOperation = 'destination-out';

    // -------------------------------------------------------------
    // PASS A: STATION AMBIENT & EMERGENCY LIGHT SOURCES
    // -------------------------------------------------------------
    const stationLights = level.getLightSources ? level.getLightSources() : [];
    const allLights = [...stationLights, ...this.dynamicLights];

    for (let i = 0; i < allLights.length; i++) {
      const light = allLights[i];

      // Viewport culling
      if (!camera.isCircleInView(light.x, light.y, light.radius)) {
        continue;
      }

      // Calculate dynamic intensity
      let intensity = light.intensity !== undefined ? light.intensity : 0.85;

      if (light.flicker) {
        const fSpeed = light.flickerSpeed || 4.0;
        const noise = Math.sin(this.time * fSpeed * 6) * Math.cos(this.time * fSpeed * 11);
        if (Math.random() < 0.08) {
          intensity *= 0.2; // Random stutter
        } else {
          intensity *= (0.75 + 0.25 * noise);
        }
      }

      if (light.pulse) {
        const pSpeed = light.pulseSpeed || 1.5;
        intensity *= (0.7 + 0.3 * Math.sin(this.time * pSpeed * Math.PI));
      }

      intensity = clamp(intensity, 0, 1.0);
      if (intensity <= 0.01) continue;

      // Compute 360-degree visibility polygon
      const poly = this.computeVisibilityPolygon(
        light.x,
        light.y,
        light.radius,
        wallSegments,
        { isCone: false }
      );

      if (poly.length >= 3) {
        this.darknessCtx.save();
        this.darknessCtx.beginPath();
        this.darknessCtx.moveTo(poly[0].x, poly[0].y);
        for (let p = 1; p < poly.length; p++) {
          this.darknessCtx.lineTo(poly[p].x, poly[p].y);
        }
        this.darknessCtx.closePath();

        // Soft radial light falloff
        const grad = this.darknessCtx.createRadialGradient(
          light.x, light.y, 0,
          light.x, light.y, light.radius
        );
        grad.addColorStop(0, `rgba(0, 0, 0, ${intensity * 0.95})`);
        grad.addColorStop(0.5, `rgba(0, 0, 0, ${intensity * 0.7})`);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.darknessCtx.fillStyle = grad;
        this.darknessCtx.fill();
        this.darknessCtx.restore();
      }
    }

    // -------------------------------------------------------------
    // PASS B: NEXUS-9 AURA LIGHT (Menacing Pulsating Field)
    // -------------------------------------------------------------
    if (enemy && enemy.active && camera.isCircleInView(enemy.x, enemy.y, 220)) {
      const auraRadius = 180 + Math.sin(this.time * 6) * 20;
      const auraPoly = this.computeVisibilityPolygon(
        enemy.x,
        enemy.y,
        auraRadius,
        wallSegments,
        { isCone: false }
      );

      if (auraPoly.length >= 3) {
        this.darknessCtx.save();
        this.darknessCtx.beginPath();
        this.darknessCtx.moveTo(auraPoly[0].x, auraPoly[0].y);
        for (let p = 1; p < auraPoly.length; p++) {
          this.darknessCtx.lineTo(auraPoly[p].x, auraPoly[p].y);
        }
        this.darknessCtx.closePath();

        const auraGrad = this.darknessCtx.createRadialGradient(
          enemy.x, enemy.y, 0,
          enemy.x, enemy.y, auraRadius
        );
        auraGrad.addColorStop(0, 'rgba(0, 0, 0, 0.9)');
        auraGrad.addColorStop(0.6, 'rgba(0, 0, 0, 0.5)');
        auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.darknessCtx.fillStyle = auraGrad;
        this.darknessCtx.fill();
        this.darknessCtx.restore();
      }
    }

    // -------------------------------------------------------------
    // PASS C: PLAYER FLASHLIGHT (Directional Cone & Ambient Halo)
    // -------------------------------------------------------------
    if (player) {
      // 1. Ambient 360-degree Halo (Dr. Vance's suit glow / low light) - Expanded room awareness
      const haloRadius = 120;
      const haloPoly = this.computeVisibilityPolygon(
        player.x,
        player.y,
        haloRadius,
        wallSegments,
        { isCone: false }
      );

      if (haloPoly.length >= 3) {
        this.darknessCtx.save();
        this.darknessCtx.beginPath();
        this.darknessCtx.moveTo(haloPoly[0].x, haloPoly[0].y);
        for (let p = 1; p < haloPoly.length; p++) {
          this.darknessCtx.lineTo(haloPoly[p].x, haloPoly[p].y);
        }
        this.darknessCtx.closePath();

        const haloGrad = this.darknessCtx.createRadialGradient(
          player.x, player.y, 0,
          player.x, player.y, haloRadius
        );
        haloGrad.addColorStop(0, 'rgba(0, 0, 0, 0.95)');
        haloGrad.addColorStop(0.5, 'rgba(0, 0, 0, 0.60)');
        haloGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.darknessCtx.fillStyle = haloGrad;
        this.darknessCtx.fill();
        this.darknessCtx.restore();
      }

      // 2. Directional Flashlight Beam
      const isFlashlightOn = player.isFlashlightOn !== undefined ? player.isFlashlightOn : (player.flashlightOn !== undefined ? player.flashlightOn : true);
      const battery = player.battery !== undefined ? player.battery : (player.gameState ? player.gameState.flashlightBattery : 100);

      if (isFlashlightOn && battery > 0) {
        let beamIntensity = 1.0;

        // Battery Low Flicker
        if (battery <= FLASHLIGHT_CRITICAL_BATTERY) {
          beamIntensity = Math.random() < 0.2 ? 0.1 : (0.4 + Math.random() * 0.4);
        } else if (battery <= FLASHLIGHT_LOW_BATTERY) {
          if (Math.random() < 0.08) {
            beamIntensity = 0.35 + Math.random() * 0.4;
          }
        }

        // Entity Proximity Interference
        if (enemy && enemy.active) {
          const distToEnemy = distance(player.x, player.y, enemy.x, enemy.y);
          if (distToEnemy < ENEMY_AURA_NEAR_DIST) {
            const interference = 1 - (distToEnemy / ENEMY_AURA_NEAR_DIST);
            if (Math.random() < interference * 0.4) {
              beamIntensity *= (0.2 + Math.random() * 0.3);
            }
          }
        }

        if (beamIntensity > 0.05) {
          const beamReach = FLASHLIGHT_DISTANCE || 380;
          const aimAngle = player.angle !== undefined ? player.angle : 0;
          const coneAngle = FLASHLIGHT_CONE_ANGLE || (65 * Math.PI / 180);

          const conePoly = this.computeVisibilityPolygon(
            player.x,
            player.y,
            beamReach,
            wallSegments,
            {
              isCone: true,
              facingAngle: aimAngle,
              fovAngle: coneAngle
            }
          );

          if (conePoly.length >= 3) {
            this.darknessCtx.save();
            this.darknessCtx.beginPath();
            this.darknessCtx.moveTo(conePoly[0].x, conePoly[0].y);
            for (let p = 1; p < conePoly.length; p++) {
              this.darknessCtx.lineTo(conePoly[p].x, conePoly[p].y);
            }
            this.darknessCtx.closePath();

            // Multi-stop flashlight beam gradient
            const beamGrad = this.darknessCtx.createRadialGradient(
              player.x, player.y, 0,
              player.x, player.y, beamReach
            );
            beamGrad.addColorStop(0, `rgba(0, 0, 0, ${beamIntensity * 0.98})`);
            beamGrad.addColorStop(0.35, `rgba(0, 0, 0, ${beamIntensity * 0.92})`);
            beamGrad.addColorStop(0.7, `rgba(0, 0, 0, ${beamIntensity * 0.6})`);
            beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

            this.darknessCtx.fillStyle = beamGrad;
            this.darknessCtx.fill();
            this.darknessCtx.restore();
          }
        }
      }
    }

    // Restore darkness canvas transform
    camera.restore(this.darknessCtx);
    this.darknessCtx.restore();

    // -------------------------------------------------------------
    // 3. COMPOSITE DARKNESS MASK ONTO MAIN SCREEN CANVAS
    // -------------------------------------------------------------
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.darknessCanvas, 0, 0);

    // -------------------------------------------------------------
    // 4. ADDITIVE LIGHT BLOOM PASS (For vibrant neon glows & beacons)
    // -------------------------------------------------------------
    ctx.globalCompositeOperation = 'lighter';
    camera.apply(ctx);

    // Additive beacon glows
    for (let i = 0; i < allLights.length; i++) {
      const light = allLights[i];
      if (!camera.isCircleInView(light.x, light.y, light.radius * 0.5)) continue;

      const bloomRadius = Math.min(light.radius * 0.45, 90);
      const bloomGrad = ctx.createRadialGradient(
        light.x, light.y, 0,
        light.x, light.y, bloomRadius
      );
      bloomGrad.addColorStop(0, light.color || '#38bdf8');
      bloomGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = bloomGrad;
      ctx.beginPath();
      ctx.arc(light.x, light.y, bloomRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Additive NEXUS-9 Menacing Red Core Bloom
    if (enemy && enemy.active && camera.isCircleInView(enemy.x, enemy.y, 100)) {
      const enemyBloom = ctx.createRadialGradient(
        enemy.x, enemy.y, 0,
        enemy.x, enemy.y, 50
      );
      enemyBloom.addColorStop(0, 'rgba(255, 0, 50, 0.4)');
      enemyBloom.addColorStop(0.7, 'rgba(168, 85, 247, 0.2)');
      enemyBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');

      ctx.fillStyle = enemyBloom;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 50, 0, Math.PI * 2);
      ctx.fill();
    }

    camera.restore(ctx);
    ctx.restore();
  }
}
