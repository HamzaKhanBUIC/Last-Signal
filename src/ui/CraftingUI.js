/**
 * THE LAST SIGNAL — RETRO SCI-FI CRAFTING & FIELD ENGINEERING UI
 * 
 * Interactive CRT interface for crafting improvised EMP mines,
 * sonic lures, hemostatic patches, and battery cells from salvaged materials.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, COLORS } from '../utils/Constants.js';

export class CraftingUI {
  /**
   * @param {import('../core/EventBus.js').EventBus} eventBus
   * @param {import('../core/CraftingSystem.js').CraftingSystem} craftingSystem
   */
  constructor(eventBus, craftingSystem) {
    this.eventBus = eventBus;
    this.craftingSystem = craftingSystem;

    this.isOpen = false;
    this.selectedIndex = 0;
    this.animTime = 0;

    if (this.eventBus) {
      this.eventBus.on('CRAFTING_TOGGLED', () => {
        this.toggle();
      });
    }
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.eventBus?.emit('AUDIO_TRIGGER', { type: 'terminal_boot' });
    }
  }

  open() {
    this.isOpen = true;
  }

  close() {
    this.isOpen = false;
  }

  /**
   * Handles keyboard navigation inside Crafting UI.
   * @param {string} code Key code
   * @param {import('../core/GameState.js').GameState} gameState
   * @returns {boolean} True if input was consumed
   */
  handleInput(code, gameState) {
    if (!this.isOpen) return false;

    const recipes = this.craftingSystem.getRecipes();

    if (code === 'KeyW' || code === 'ArrowUp') {
      this.selectedIndex = (this.selectedIndex - 1 + recipes.length) % recipes.length;
      return true;
    }

    if (code === 'KeyS' || code === 'ArrowDown') {
      this.selectedIndex = (this.selectedIndex + 1) % recipes.length;
      return true;
    }

    if (code === 'Enter' || code === 'Space' || code === 'KeyE') {
      const recipe = recipes[this.selectedIndex];
      if (recipe) {
        this.craftingSystem.craft(recipe.id, gameState);
      }
      return true;
    }

    if (code === 'Escape' || code === 'KeyC') {
      this.close();
      return true;
    }

    return true;
  }

  /**
   * Renders the retro sci-fi crafting terminal modal.
   * @param {CanvasRenderingContext2D} ctx
   * @param {import('../core/GameState.js').GameState} gameState
   */
  render(ctx, gameState) {
    if (!this.isOpen) return;

    this.animTime += 0.016;

    const w = 780;
    const h = 480;
    const x = (CANVAS_WIDTH - w) / 2;
    const y = (CANVAS_HEIGHT - h) / 2;

    // 1. Dark Glass CRT Backdrop
    ctx.fillStyle = 'rgba(4, 9, 16, 0.94)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = COLORS.CYAN_BRIGHT;
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Corner Brackets
    this.drawCornerBrackets(ctx, x, y, w, h, COLORS.CYAN_BRIGHT, 12);

    // 2. Terminal Header Banner
    ctx.fillStyle = COLORS.CYAN_DARK;
    ctx.fillRect(x + 12, y + 12, w - 24, 32);

    ctx.font = 'bold 13px "Share Tech Mono", monospace';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('⚙️ FIELD ENGINEERING & SALVAGE SYNTHESIS BENCH', x + 24, y + 33);

    ctx.font = '11px "Share Tech Mono", monospace';
    ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
    ctx.fillText('[NAV: W/S]  [CRAFT: ENTER/E]  [EXIT: C/ESC]', x + w - 280, y + 33);

    // 3. Left Panel: Recipe List
    const leftW = 340;
    const leftX = x + 16;
    const leftY = y + 54;
    const recipes = this.craftingSystem.getRecipes();

    recipes.forEach((rec, idx) => {
      const itemY = leftY + idx * 72;
      const isSelected = idx === this.selectedIndex;
      const canCraft = this.craftingSystem.canCraft(rec.id);

      // Recipe Item Box
      ctx.fillStyle = isSelected ? 'rgba(0, 240, 255, 0.15)' : 'rgba(10, 20, 32, 0.6)';
      ctx.fillRect(leftX, itemY, leftW, 64);

      ctx.strokeStyle = isSelected ? COLORS.CYAN_BRIGHT : (canCraft ? 'rgba(100, 160, 220, 0.4)' : 'rgba(80, 80, 80, 0.3)');
      ctx.lineWidth = isSelected ? 1.8 : 1;
      ctx.strokeRect(leftX, itemY, leftW, 64);

      // Recipe Name
      ctx.font = isSelected ? 'bold 13px "Share Tech Mono", monospace' : '12px "Share Tech Mono", monospace';
      ctx.fillStyle = canCraft ? '#ffffff' : '#64748b';
      ctx.fillText(rec.name, leftX + 16, itemY + 24);

      // Availability Tag
      ctx.font = '10px "Share Tech Mono", monospace';
      if (canCraft) {
        ctx.fillStyle = COLORS.CRT_GREEN_BRIGHT;
        ctx.fillText('● READY TO SYNTHESIZE', leftX + 16, itemY + 46);
      } else {
        ctx.fillStyle = COLORS.ALERT_RED_BRIGHT;
        ctx.fillText('✕ INSUFFICIENT MATERIALS', leftX + 16, itemY + 46);
      }
    });

    // 4. Right Panel: Blueprint Details & Salvage Stockpile
    const rightX = x + leftW + 32;
    const rightY = y + 54;
    const rightW = w - leftW - 48;

    const selectedRecipe = recipes[this.selectedIndex];
    if (selectedRecipe) {
      // Blueprint Header
      ctx.fillStyle = COLORS.AMBER_BRIGHT;
      ctx.font = 'bold 14px "Share Tech Mono", monospace';
      ctx.fillText(`SCHEMATIC: ${selectedRecipe.name.toUpperCase()}`, rightX, rightY + 20);

      // Description
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillText(selectedRecipe.description, rightX, rightY + 44);

      // Required Materials List
      ctx.fillStyle = COLORS.CYAN_BRIGHT;
      ctx.font = 'bold 11px "Share Tech Mono", monospace';
      ctx.fillText('REQUIRED COMPONENTS:', rightX, rightY + 80);

      let costY = rightY + 104;
      for (const [mat, required] of Object.entries(selectedRecipe.cost)) {
        const available = this.craftingSystem.materials[mat] || 0;
        const hasEnough = available >= required;

        ctx.fillStyle = hasEnough ? COLORS.CRT_GREEN_BRIGHT : COLORS.ALERT_RED_BRIGHT;
        ctx.font = '11px "Share Tech Mono", monospace';
        ctx.fillText(
          `• ${mat.replace('_', ' ').toUpperCase()}: ${available} / ${required}`,
          rightX + 12,
          costY
        );
        costY += 24;
      }
    }

    // 5. Bottom Right: Stockpile Inventory Readout
    const stockY = y + h - 110;
    ctx.strokeStyle = COLORS.CYAN_DARK;
    ctx.strokeRect(rightX, stockY, rightW, 90);

    ctx.fillStyle = COLORS.CYAN_BRIGHT;
    ctx.font = 'bold 11px "Share Tech Mono", monospace';
    ctx.fillText('SALVAGE RECOVERY STOCKPILE', rightX + 12, stockY + 20);

    const mats = Object.entries(this.craftingSystem.materials);
    mats.forEach(([mat, qty], idx) => {
      const col = idx % 2;
      const row = Math.floor(idx / 2);
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px "Share Tech Mono", monospace';
      ctx.fillText(
        `${mat.replace('_', ' ').toUpperCase()}: [ ${qty} ]`,
        rightX + 12 + col * 180,
        stockY + 44 + row * 24
      );
    });
  }

  drawCornerBrackets(ctx, x, y, width, height, color, size = 8) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(x, y + size); ctx.lineTo(x, y); ctx.lineTo(x + size, y);
    ctx.moveTo(x + width - size, y); ctx.lineTo(x + width, y); ctx.lineTo(x + width, y + size);
    ctx.moveTo(x, y + height - size); ctx.lineTo(x, y + height); ctx.lineTo(x + size, y + height);
    ctx.moveTo(x + width - size, y + height); ctx.lineTo(x + width, y + height); ctx.lineTo(x + width, y + height - size);
    ctx.stroke();
  }
}
