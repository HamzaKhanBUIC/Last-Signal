/**
 * THE LAST SIGNAL — CANVAS & GRAPHICS UTILITIES
 * Cross-platform helper for creating offscreen canvases in both modern browsers and Node.js testing environments.
 */

/**
 * Creates a lightweight mock 2D rendering context for headless Node.js environments.
 * @param {number} width
 * @param {number} height
 * @param {Object} canvasRef
 * @returns {Object} Mock CanvasRenderingContext2D
 */
function createMockContext2D(width, height, canvasRef) {
  const gradientMock = {
    addColorStop: () => {}
  };

  const patternMock = {};

  const ctx = {
    canvas: canvasRef,
    width,
    height,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    miterLimit: 10,
    globalAlpha: 1.0,
    globalCompositeOperation: 'source-over',
    shadowBlur: 0,
    shadowColor: 'rgba(0,0,0,0)',
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '10px monospace',
    textAlign: 'start',
    textBaseline: 'alphabetic',
    imageSmoothingEnabled: false,

    // Transform methods
    save: () => {},
    restore: () => {},
    scale: () => {},
    rotate: () => {},
    translate: () => {},
    transform: () => {},
    setTransform: () => {},
    resetTransform: () => {},

    // Drawing methods
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    closePath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    bezierCurveTo: () => {},
    quadraticCurveTo: () => {},
    arc: () => {},
    arcTo: () => {},
    ellipse: () => {},
    rect: () => {},
    roundRect: () => {},
    fill: () => {},
    stroke: () => {},
    clip: () => {},
    drawImage: () => {},

    // Text methods
    fillText: () => {},
    strokeText: () => {},
    measureText: (text) => ({ width: (text || '').length * 8, height: 10 }),

    // Gradient & Pattern methods
    createLinearGradient: () => gradientMock,
    createRadialGradient: () => gradientMock,
    createPattern: () => patternMock,

    // Pixel data
    getImageData: (sx, sy, sw, sh) => ({
      data: new Uint8ClampedArray(sw * sh * 4),
      width: sw,
      height: sh
    }),
    putImageData: () => {},
    createImageData: (sw, sh) => ({
      data: new Uint8ClampedArray(sw * sh * 4),
      width: sw,
      height: sh
    })
  };

  return ctx;
}

/**
 * Creates an offscreen canvas of the specified dimensions.
 * Uses OffscreenCanvas in modern browsers, falls back to HTML5 <canvas>,
 * and uses a high-fidelity mock in Node.js test runners.
 * 
 * @param {number} width Canvas width in pixels
 * @param {number} height Canvas height in pixels
 * @returns {HTMLCanvasElement|OffscreenCanvas|Object}
 */
export function createOffscreenCanvas(width, height) {
  const w = Math.max(1, Math.floor(width));
  const h = Math.max(1, Math.floor(height));

  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      return new OffscreenCanvas(w, h);
    } catch {
      // Fallback if constructor fails
    }
  }

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    return canvas;
  }

  // Node.js Headless Testing Fallback
  const mockCanvas = {
    width: w,
    height: h,
    getContext: function(type) {
      if (type === '2d') {
        if (!this._ctx) {
          this._ctx = createMockContext2D(w, h, this);
        }
        return this._ctx;
      }
      return null;
    }
  };

  return mockCanvas;
}
