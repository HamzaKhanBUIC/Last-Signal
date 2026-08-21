/**
 * Unit Tests for MathUtils.js
 */

import {
  distance,
  distanceSq,
  angleTo,
  lerp,
  lerpAngle,
  clamp,
  normalizeAngle,
  normalizeAngle2PI,
  angleDifference,
  lineIntersection,
  raySegmentIntersection,
  pointInPolygon,
  circleRectCollision,
  circleAABBCollision,
  circleCircleCollision,
  rectRectCollision,
  pointInRect,
  pointInCircle,
  octileDistance,
  degToRad,
  radToDeg,
  smoothstep
} from '../src/utils/MathUtils.js';

export function runMathTests(describe, test, expect) {
  describe('MathUtils — Basic Geometry & Scalar Functions', () => {
    test('distance and distanceSq compute Euclidean distance correctly', () => {
      expect(distance(0, 0, 3, 4)).toBeCloseTo(5);
      expect(distanceSq(0, 0, 3, 4)).toBe(25);
      expect(distance(-2, -3, 1, 1)).toBeCloseTo(5);
      expect(distanceSq(-2, -3, 1, 1)).toBe(25);
    });

    test('octileDistance calculates 8-way diagonal distance', () => {
      expect(octileDistance(0, 0, 10, 0)).toBeCloseTo(10);
      expect(octileDistance(0, 0, 0, 10)).toBeCloseTo(10);
      expect(octileDistance(0, 0, 10, 10)).toBeCloseTo(10 * Math.SQRT2);
      expect(octileDistance(0, 0, 3, 7)).toBeCloseTo((7 - 3) + 3 * Math.SQRT2);
    });

    test('angleTo computes directional angle in radians', () => {
      expect(angleTo(0, 0, 10, 0)).toBeCloseTo(0);
      expect(angleTo(0, 0, 0, 10)).toBeCloseTo(Math.PI / 2);
      expect(angleTo(0, 0, -10, 0)).toBeCloseTo(Math.PI);
      expect(angleTo(0, 0, 0, -10)).toBeCloseTo(-Math.PI / 2);
    });

    test('lerp correctly interpolates values', () => {
      expect(lerp(0, 100, 0.5)).toBe(50);
      expect(lerp(10, 20, 0.1)).toBeCloseTo(11);
      expect(lerp(50, 100, 0)).toBe(50);
      expect(lerp(50, 100, 1)).toBe(100);
    });

    test('clamp restricts values to min and max boundaries', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
      expect(clamp(0, 0, 10)).toBe(0);
      expect(clamp(10, 0, 10)).toBe(10);
    });

    test('normalizeAngle restricts radians to [-PI, PI]', () => {
      expect(normalizeAngle(0)).toBeCloseTo(0);
      expect(normalizeAngle(Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI);
      expect(normalizeAngle(-3 * Math.PI)).toBeCloseTo(-Math.PI);
      expect(normalizeAngle(2.5 * Math.PI)).toBeCloseTo(0.5 * Math.PI);
    });

    test('normalizeAngle2PI restricts radians to [0, 2*PI)', () => {
      expect(normalizeAngle2PI(0)).toBeCloseTo(0);
      expect(normalizeAngle2PI(-Math.PI / 2)).toBeCloseTo(1.5 * Math.PI);
      expect(normalizeAngle2PI(3 * Math.PI)).toBeCloseTo(Math.PI);
    });

    test('angleDifference computes shortest signed angular difference', () => {
      expect(angleDifference(Math.PI / 2, 0)).toBeCloseTo(Math.PI / 2);
      expect(angleDifference(0, Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
      expect(angleDifference(-Math.PI * 0.9, Math.PI * 0.9)).toBeCloseTo(Math.PI * 0.2);
    });

    test('lerpAngle interpolates along shortest arc', () => {
      const interpolated = lerpAngle(Math.PI * 0.9, -Math.PI * 0.9, 0.5);
      expect(Math.abs(interpolated)).toBeCloseTo(Math.PI);
    });

    test('conversions: degToRad and radToDeg', () => {
      expect(degToRad(180)).toBeCloseTo(Math.PI);
      expect(radToDeg(Math.PI)).toBeCloseTo(180);
      expect(degToRad(90)).toBeCloseTo(Math.PI / 2);
    });

    test('smoothstep evaluates smooth Hermite interpolation', () => {
      expect(smoothstep(0, 10, 0)).toBe(0);
      expect(smoothstep(0, 10, 10)).toBe(1);
      expect(smoothstep(0, 10, 5)).toBeCloseTo(0.5);
      expect(smoothstep(0, 10, -5)).toBe(0);
      expect(smoothstep(0, 10, 15)).toBe(1);
    });
  });

  describe('MathUtils — 2D Intersection & Raycasting', () => {
    test('lineIntersection detects crossing segments', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 10 };
      const p3 = { x: 0, y: 10 };
      const p4 = { x: 10, y: 0 };

      const hit = lineIntersection(p1, p2, p3, p4);
      expect(hit).toBeTruthy();
      expect(hit.x).toBeCloseTo(5);
      expect(hit.y).toBeCloseTo(5);
      expect(hit.param).toBeCloseTo(0.5);
    });

    test('lineIntersection returns null for parallel or non-intersecting lines', () => {
      const p1 = { x: 0, y: 0 };
      const p2 = { x: 10, y: 0 };
      const p3 = { x: 0, y: 5 };
      const p4 = { x: 10, y: 5 };

      expect(lineIntersection(p1, p2, p3, p4)).toBeNull();

      const s1 = { x: 0, y: 0 };
      const s2 = { x: 5, y: 0 };
      const s3 = { x: 10, y: -5 };
      const s4 = { x: 10, y: 5 };
      expect(lineIntersection(s1, s2, s3, s4)).toBeNull();
    });

    test('raySegmentIntersection finds ray hits and distance', () => {
      const origin = { x: 0, y: 5 };
      const dir = { x: 1, y: 0 };
      const segA = { x: 20, y: 0 };
      const segB = { x: 20, y: 10 };

      const hit = raySegmentIntersection(origin, dir, segA, segB);
      expect(hit).toBeTruthy();
      expect(hit.x).toBeCloseTo(20);
      expect(hit.y).toBeCloseTo(5);
      expect(hit.distance).toBeCloseTo(20);
    });

    test('raySegmentIntersection returns null when ray misses segment', () => {
      const origin = { x: 0, y: 15 };
      const dir = { x: 1, y: 0 };
      const segA = { x: 20, y: 0 };
      const segB = { x: 20, y: 10 };

      expect(raySegmentIntersection(origin, dir, segA, segB)).toBeNull();
    });
  });

  describe('MathUtils — Polygon Inclusion & Collisions', () => {
    test('pointInPolygon checks point containment in square polygon', () => {
      const square = [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
        { x: 100, y: 100 },
        { x: 0, y: 100 }
      ];

      expect(pointInPolygon({ x: 50, y: 50 }, square)).toBeTruthy();
      expect(pointInPolygon({ x: 150, y: 50 }, square)).toBeFalsy();
      expect(pointInPolygon({ x: -10, y: -10 }, square)).toBeFalsy();
    });

    test('circleRectCollision detects overlapping circle and rectangle', () => {
      expect(circleRectCollision(5, 35, 10, 10, 10, 50, 50)).toBeTruthy();
      expect(circleRectCollision(30, 30, 5, 10, 10, 50, 50)).toBeTruthy();
      expect(circleRectCollision(65, 65, 10, 10, 10, 50, 50)).toBeTruthy();
      expect(circleRectCollision(100, 100, 5, 10, 10, 50, 50)).toBeFalsy();
    });

    test('circleAABBCollision calculates penetration and separation normal', () => {
      const res = circleAABBCollision(164, 176, 12, 128, 160, 32, 32);
      expect(res.collided).toBe(true);
      expect(res.penetration).toBeGreaterThan(0);
      expect(res.resolveX).toBeGreaterThan(0);
    });

    test('circleCircleCollision and rectRectCollision checks', () => {
      expect(circleCircleCollision(0, 0, 10, 15, 0, 10)).toBeTruthy();
      expect(circleCircleCollision(0, 0, 10, 25, 0, 10)).toBeFalsy();

      const r1 = { x: 0, y: 0, width: 20, height: 20 };
      const r2 = { x: 15, y: 15, width: 20, height: 20 };
      const r3 = { x: 50, y: 50, width: 10, height: 10 };

      expect(rectRectCollision(r1, r2)).toBeTruthy();
      expect(rectRectCollision(r1, r3)).toBeFalsy();

      expect(pointInRect(10, 10, 0, 0, 20, 20)).toBeTruthy();
      expect(pointInRect(30, 30, 0, 0, 20, 20)).toBeFalsy();

      expect(pointInCircle(5, 5, 0, 0, 10)).toBeTruthy();
      expect(pointInCircle(15, 15, 0, 0, 10)).toBeFalsy();
    });
  });
}
