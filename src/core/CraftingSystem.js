/**
 * THE LAST SIGNAL — CDDA-INSPIRED FIELD CRAFTING & SYNTHESIS ENGINE
 * 
 * Enables salvage of station components (Scrap Metal, Copper Wire, Microchips, Chemical Reagents)
 * and field engineering of improvised EMP mines, sonic lures, batteries, and trauma patches.
 */

export const CRAFTING_MATERIALS = Object.freeze({
  SCRAP_METAL: 'scrap_metal',
  COPPER_WIRE: 'copper_wire',
  CHEMICAL_REAGENT: 'chemical_reagent',
  MICROCHIP: 'microchip'
});

export const RECIPES = Object.freeze([
  {
    id: 'craft_emp_mine',
    name: 'Improvised EMP Mine',
    description: 'High-voltage capacitor mine that stuns NEXUS-9 for 4.5s.',
    resultType: 'EMP_BURST',
    resultCount: 1,
    cost: {
      [CRAFTING_MATERIALS.SCRAP_METAL]: 2,
      [CRAFTING_MATERIALS.COPPER_WIRE]: 2
    }
  },
  {
    id: 'craft_sonic_decoy',
    name: 'Sonic Decoy Flare',
    description: 'Acoustic resonance lure that draws hostile AI to false sound location.',
    resultType: 'SONIC_DECOY',
    resultCount: 1,
    cost: {
      [CRAFTING_MATERIALS.SCRAP_METAL]: 1,
      [CRAFTING_MATERIALS.MICROCHIP]: 1
    }
  },
  {
    id: 'craft_hemostatic_patch',
    name: 'Hemostatic Trauma Patch',
    description: 'Stops acute arterial bleeding and seals hazmat suit pressure breaches.',
    resultType: 'HEMOSTATIC_PATCH',
    resultCount: 1,
    cost: {
      [CRAFTING_MATERIALS.CHEMICAL_REAGENT]: 2,
      [CRAFTING_MATERIALS.SCRAP_METAL]: 1
    }
  },
  {
    id: 'craft_battery_cell',
    name: 'Lithium Battery Cell',
    description: 'Recharges tactical flashlight capacitor and electronic terminals.',
    resultType: 'BATTERY_PACK',
    resultCount: 1,
    cost: {
      [CRAFTING_MATERIALS.SCRAP_METAL]: 1,
      [CRAFTING_MATERIALS.COPPER_WIRE]: 1,
      [CRAFTING_MATERIALS.CHEMICAL_REAGENT]: 1
    }
  }
]);

export class CraftingSystem {
  /**
   * @param {import('./EventBus.js').EventBus} [eventBus]
   */
  constructor(eventBus = null) {
    this.eventBus = eventBus;

    // Materials Inventory
    this.materials = {
      [CRAFTING_MATERIALS.SCRAP_METAL]: 3,
      [CRAFTING_MATERIALS.COPPER_WIRE]: 2,
      [CRAFTING_MATERIALS.CHEMICAL_REAGENT]: 2,
      [CRAFTING_MATERIALS.MICROCHIP]: 1
    };

    if (this.eventBus) {
      this.eventBus.on('MATERIAL_COLLECTED', (data) => {
        this.addMaterial(data.type, data.amount || 1);
      });
    }
  }

  /**
   * Adds material units to salvage stockpile.
   * @param {string} type
   * @param {number} [amount=1]
   */
  addMaterial(type, amount = 1) {
    if (this.materials[type] !== undefined) {
      this.materials[type] += amount;
      this.eventBus?.emit('TOAST_NOTIFICATION', {
        message: `SALVAGE: +${amount} ${type.replace('_', ' ').toUpperCase()}`,
        type: 'info'
      });
    }
  }

  /**
   * Checks if player has required components for a recipe.
   * @param {string} recipeId
   * @returns {boolean}
   */
  canCraft(recipeId) {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe) return false;

    for (const [mat, required] of Object.entries(recipe.cost)) {
      if ((this.materials[mat] || 0) < required) {
        return false;
      }
    }
    return true;
  }

  /**
   * Executes crafting synthesis of a schematic.
   * @param {string} recipeId
   * @param {import('./GameState.js').GameState} gameState
   * @returns {boolean} True if successfully crafted
   */
  craft(recipeId, gameState) {
    const recipe = RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.canCraft(recipeId)) return false;

    // Consume materials
    for (const [mat, required] of Object.entries(recipe.cost)) {
      this.materials[mat] -= required;
    }

    // Award result item to GameState
    if (gameState) {
      if (recipe.resultType === 'EMP_BURST') {
        gameState.inventory.empCharges = (gameState.inventory.empCharges || 0) + recipe.resultCount;
      } else if (recipe.resultType === 'SONIC_DECOY') {
        gameState.inventory.sonicDecoys = (gameState.inventory.sonicDecoys || 0) + recipe.resultCount;
      } else if (recipe.resultType === 'BATTERY_PACK') {
        gameState.inventory.batteries = (gameState.inventory.batteries || 0) + recipe.resultCount;
      } else if (recipe.resultType === 'HEMOSTATIC_PATCH') {
        this.eventBus?.emit('APPLY_HEMOSTATIC');
      }
    }

    this.eventBus?.emit('TOAST_NOTIFICATION', {
      message: `CRAFTED: ${recipe.name.toUpperCase()}`,
      type: 'success'
    });

    this.eventBus?.emit('AUDIO_TRIGGER', { type: 'pickup' });
    return true;
  }

  /**
   * Returns list of all crafting schematics.
   * @returns {Array<Object>}
   */
  getRecipes() {
    return RECIPES;
  }
}
