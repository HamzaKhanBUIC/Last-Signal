/**
 * THE LAST SIGNAL — MATH & GEOMETRY UTILITIES
 * High-performance 2D math, vector calculations, collision tests, and raycast intersection helpers.
 */

/**
 * Calculates Euclidean distance between two 2D points.
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number} Distance
 */
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

/**
 * Calculates squared Euclidean distance between two 2D points (avoids Math.sqrt).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number} Squared distance
 */
export function distanceSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

/**
 * Calculates 8-directional octile distance (standard for 2D grid pathfinding with diagonal moves).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number} Octile distance
 */
export function octileDistance(x1, y1, x2, y2) {
  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);
  return dx > dy ? (dx - dy) + Math.SQRT2 * dy : (dy - dx) + Math.SQRT2 * dx;
}

/**
 * Calculates angle in radians from point 1 to point 2 (in range [-PI, PI]).
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number} Angle in radians
 */
export function angleTo(x1, y1, x2, y2) {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * Linear interpolation between a and b by factor t.
 * @param {number} a
 * @param {number} b
 * @param {number} t Factor [0, 1]
 * @returns {number} Interpolated value
 */
export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/**
 * Smoothly interpolates an angle from 'a' to 'b' taking the shortest path.
 * @param {number} a Source angle in radians
 * @param {number} b Target angle in radians
 * @param {number} t Interpolation factor [0, 1]
 * @returns {number} Interpolated angle in [-PI, PI]
 */
export function lerpAngle(a, b, t) {
  const diff = angleDifference(b, a);
  return normalizeAngle(a + diff * t);
}

/**
 * Clamps a number between min and max bounds.
 * @param {number} val
 * @param {number} min
 * @param {number} max
 * @returns {number} Clamped value
 */
export function clamp(val, min, max) {
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

/**
 * Normalizes an angle into the range [-PI, PI].
 * @param {number} angle In radians
 * @returns {number} Normalized angle
 */
export function normalizeAngle(angle) {
  let a = angle % (Math.PI * 2);
  if (a > Math.PI) a -= Math.PI * 2;
  else if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Normalizes an angle into the range [0, 2*PI).
 * @param {number} angle In radians
 * @returns {number} Normalized angle
 */
export function normalizeAngle2PI(angle) {
  let a = angle % (Math.PI * 2);
  if (a < 0) a += Math.PI * 2;
  return a;
}

/**
 * Calculates the shortest signed angular difference (b - a) in range [-PI, PI].
 * @param {number} targetAngle Target angle in radians
 * @param {number} sourceAngle Source angle in radians
 * @returns {number} Signed difference in radians
 */
export function angleDifference(targetAngle, sourceAngle) {
  let diff = (targetAngle - sourceAngle) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  else if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

/**
 * Line segment to line segment intersection.
 * Evaluates whether segment p1->p2 intersects segment p3->p4.
 * @param {{x: number, y: number}} p1 Segment 1 start
 * @param {{x: number, y: number}} p2 Segment 1 end
 * @param {{x: number, y: number}} p3 Segment 2 start
 * @param {{x: number, y: number}} p4 Segment 2 end
 * @returns {{x: number, y: number, param: number}|null} Intersection point and t-parameter or null
 */
export function lineIntersection(p1, p2, p3, p4) {
  const x1 = p1.x;
  const y1 = p1.y;
  const x2 = p2.x;
  const y2 = p2.y;
  const x3 = p3.x;
  const y3 = p3.y;
  const x4 = p4.x;
  const y4 = p4.y;

  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-8) {
    return null; // Lines are parallel or collinear
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
      param: t
    };
  }

  return null;
}

/**
 * Ray to line segment intersection.
 * Ray originates at rayOrigin and extends infinitely along rayDir.
 * @param {{x: number, y: number}} rayOrigin Ray starting point
 * @param {{x: number, y: number}} rayDir Ray direction vector
 * @param {{x: number, y: number}} segA Segment endpoint A
 * @param {{x: number, y: number}} segB Segment endpoint B
 * @returns {{x: number, y: number, distance: number, param: number}|null} Intersection data or null
 */
export function raySegmentIntersection(rayOrigin, rayDir, segA, segB) {
  const rpx = rayOrigin.x;
  const rpy = rayOrigin.y;
  const rdx = rayDir.x;
  const rdy = rayDir.y;

  const spx = segA.x;
  const spy = segA.y;
  const sdx = segB.x - segA.x;
  const sdy = segB.y - segA.y;

  const den = rdx * sdy - rdy * sdx;
  if (Math.abs(den) < 1e-8) {
    return null; // Parallel
  }

  const t = ((spx - rpx) * sdy - (spy - rpy) * sdx) / den;
  const u = ((spx - rpx) * rdy - (spy - rpy) * rdx) / den;

  if (t >= 0 && u >= 0 && u <= 1) {
    const ix = rpx + t * rdx;
    const iy = rpy + t * rdy;
    return {
      x: ix,
      y: iy,
      distance: Math.hypot(ix - rpx, iy - rpy),
      param: t
    };
  }

  return null;
}

/**
 * Checks if a point is inside a polygon using ray-casting (even-odd rule).
 * @param {{x: number, y: number}} point
 * @param {Array<{x: number, y: number}>} polygon Array of polygon vertices
 * @returns {boolean} True if point is inside
 */
export function pointInPolygon(point, polygon) {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  const x = point.x;
  const y = point.y;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;

    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Circle to Axis-Aligned Bounding Box (AABB) collision test.
 * @param {number} cx Circle center X
 * @param {number} cy Circle center Y
 * @param {number} r Circle radius
 * @param {number} rx Rectangle X (top-left)
 * @param {number} ry Rectangle Y (top-left)
 * @param {number} rw Rectangle width
 * @param {number} rh Rectangle height
 * @returns {boolean} True if circle collides with rectangle
 */
export function circleRectCollision(cx, cy, r, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);

  const dx = cx - closestX;
  const dy = cy - closestY;

  return dx * dx + dy * dy <= r * r;
}

/**
 * Resolves circle vs Axis-Aligned Bounding Box (AABB) collision with penetration and separation vector.
 * @param {number} cx Circle center X
 * @param {number} cy Circle center Y
 * @param {number} radius Circle radius
 * @param {number} rx Box X (top-left)
 * @param {number} ry Box Y (top-left)
 * @param {number} rw Box width
 * @param {number} rh Box height
 * @returns {{ collided: boolean, resolveX: number, resolveY: number, penetration: number }}
 */
export function circleAABBCollision(cx, cy, radius, rx, ry, rw, rh) {
  const closestX = clamp(cx, rx, rx + rw);
  const closestY = clamp(cy, ry, ry + rh);

  let distX = cx - closestX;
  let distY = cy - closestY;
  const distSq = distX * distX + distY * distY;

  if (distSq < radius * radius && distSq > 1e-8) {
    const dist = Math.sqrt(distSq);
    const penetration = radius - dist;
    const nx = distX / dist;
    const ny = distY / dist;

    return {
      collided: true,
      resolveX: nx * penetration,
      resolveY: ny * penetration,
      penetration
    };
  } else if (distSq <= 1e-8) {
    const overlapLeft = cx - rx;
    const overlapRight = (rx + rw) - cx;
    const overlapTop = cy - ry;
    const overlapBottom = (ry + rh) - cy;

    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
    let resolveX = 0;
    let resolveY = 0;

    if (minOverlap === overlapLeft) resolveX = -(radius + overlapLeft);
    else if (minOverlap === overlapRight) resolveX = (radius + overlapRight);
    else if (minOverlap === overlapTop) resolveY = -(radius + overlapTop);
    else resolveY = (radius + overlapBottom);

    return {
      collided: true,
      resolveX,
      resolveY,
      penetration: radius
    };
  }

  return {
    collided: false,
    resolveX: 0,
    resolveY: 0,
    penetration: 0
  };
}

/**
 * Circle to Circle collision test.
 * @param {number} c1x
 * @param {number} c1y
 * @param {number} r1
 * @param {number} c2x
 * @param {number} c2y
 * @param {number} r2
 * @returns {boolean}
 */
export function circleCircleCollision(c1x, c1y, r1, c2x, c2y, r2) {
  const rSum = r1 + r2;
  return distanceSq(c1x, c1y, c2x, c2y) <= rSum * rSum;
}

/**
 * Rectangle to Rectangle AABB collision test.
 * @param {{x: number, y: number, width: number, height: number}} r1
 * @param {{x: number, y: number, width: number, height: number}} r2
 * @returns {boolean}
 */
export function rectRectCollision(r1, r2) {
  return (
    r1.x < r2.x + r2.width &&
    r1.x + r1.width > r2.x &&
    r1.y < r2.y + r2.height &&
    r1.y + r1.height > r2.y
  );
}

/**
 * Checks if a point is inside a rectangle.
 * @param {number} px
 * @param {number} py
 * @param {number} rx
 * @param {number} ry
 * @param {number} rw
 * @param {number} rh
 * @returns {boolean}
 */
export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh;
}

/**
 * Checks if a point is inside a circle.
 * @param {number} px
 * @param {number} py
 * @param {number} cx
 * @param {number} cy
 * @param {number} r
 * @returns {boolean}
 */
export function pointInCircle(px, py, cx, cy, r) {
  return distanceSq(px, py, cx, cy) <= r * r;
}

/**
 * Converts degrees to radians.
 * @param {number} degrees
 * @returns {number} Radians
 */
export function degToRad(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Converts radians to degrees.
 * @param {number} radians
 * @returns {number} Degrees
 */
export function radToDeg(radians) {
  return (radians * 180) / Math.PI;
}

/**
 * Generates a random float in range [min, max).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Generates a random integer in range [min, max] (inclusive).
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
export function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

/**
 * Selects a random element from an array.
 * @template T
 * @param {T[]} array
 * @returns {T}
 */
export function randomChoice(array) {
  if (!array || array.length === 0) return null;
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Smooth Hermite interpolation between 0 and 1.
 * @param {number} min
 * @param {number} max
 * @param {number} x
 * @returns {number}
 */
export function smoothstep(min, max, x) {
  const t = clamp((x - min) / (max - min), 0, 1);
  return t * t * (3 - 2 * t);
}
