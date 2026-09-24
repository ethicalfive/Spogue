import { ItemSlot, ItemData } from '../Entities';

export interface LootEntry {
    chance: number;
    itemIdPattern?: string; // e.g. "weapon", "armor"
    generateFunc?: (id: string, x: number, y: number, tier: number, isLegendary: boolean, isRoyal?: boolean) => ItemData;
}

export interface LootTable {
    dropChance: number;
    tier: number;
    entries: LootEntry[];
}

export const EntityLootTables: Record<string, LootTable> = {
    'wolf': {
        dropChance: 0.7,
        tier: 2,
        entries: [
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Wolf Fang Blade',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#9ca3af',
                    stats: { damage: tier * 10 + Math.floor(Math.random() * 5) + (isLegendary ? 20 : 0) }
                })
            },
            {
                chance: 0.25, // cumulative 0.5
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Wolf Pelt Armor',
                    type: 'armor',
                    slot: ItemSlot.BODY,
                    color: '#4b5563',
                    stats: { defense: tier * 5 + Math.floor(Math.random() * 3) + (isLegendary ? 10 : 0) }
                })
            },
            {
                chance: 0.25, // cumulative 0.75
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Wolf Cowl',
                    type: 'helmet',
                    slot: ItemSlot.HEAD,
                    color: '#374151',
                    stats: { defense: tier * 3 + Math.floor(Math.random() * 2) + (isLegendary ? 5 : 0) }
                })
            },
            {
                chance: 0.25, // cumulative 1.0
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Wolf Tooth Amulet',
                    type: 'amulet',
                    slot: ItemSlot.NECK,
                    color: '#e2e8f0',
                    stats: { defense: tier * 2, damage: tier * 2 + (isLegendary ? 10 : 0) }
                })
            }
        ]
    },
    'shark': {
        dropChance: 0.9,
        tier: 3,
        entries: [
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Abyssal Trident',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#0284c7',
                    stats: { damage: tier * 10 + Math.floor(Math.random() * 5) + (isLegendary ? 20 : 0) }
                })
            },
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Shark Skin Tunic',
                    type: 'armor',
                    slot: ItemSlot.BODY,
                    color: '#334155',
                    stats: { defense: tier * 5 + Math.floor(Math.random() * 3) + (isLegendary ? 10 : 0) }
                })
            },
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Jaws Helm',
                    type: 'helmet',
                    slot: ItemSlot.HEAD,
                    color: '#94a3b8',
                    stats: { defense: tier * 3 + Math.floor(Math.random() * 2) + (isLegendary ? 5 : 0) }
                })
            },
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Pearl Necklace',
                    type: 'amulet',
                    slot: ItemSlot.NECK,
                    color: '#f8fafc',
                    stats: { defense: tier * 2, damage: tier * 2 + (isLegendary ? 10 : 0) }
                })
            }
        ]
    },
    'cow': {
        dropChance: 0.4,
        tier: 1,
        entries: [
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Bone Club',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#d1d5db',
                    stats: { damage: tier * 10 + Math.floor(Math.random() * 5) + (isLegendary ? 20 : 0) }
                })
            },
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Leather Vest',
                    type: 'armor',
                    slot: ItemSlot.BODY,
                    color: '#a16207',
                    stats: { defense: tier * 5 + Math.floor(Math.random() * 3) + (isLegendary ? 10 : 0) }
                })
            },
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Hide Cap',
                    type: 'helmet',
                    slot: ItemSlot.HEAD,
                    color: '#ca8a04',
                    stats: { defense: tier * 3 + Math.floor(Math.random() * 2) + (isLegendary ? 5 : 0) }
                })
            },
            {
                chance: 0.25,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Twine Choker',
                    type: 'amulet',
                    slot: ItemSlot.NECK,
                    color: '#d97706',
                    stats: { defense: tier * 2, damage: tier * 2 + (isLegendary ? 10 : 0) }
                })
            }
        ]
    },
    
    'polar_bear': {
        dropChance: 0.8,
        tier: 3,
        entries: [
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Bear Claw',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#e2e8f0',
                    stats: { damage: tier * 12 + (isLegendary ? 15 : 0) }
                })
            },
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Thick Fur Coat',
                    type: 'armor',
                    slot: ItemSlot.BODY,
                    color: '#f8fafc',
                    stats: { defense: tier * 6 + (isLegendary ? 8 : 0) }
                })
            }
        ]
    },
    'crocodile': {
        dropChance: 0.8,
        tier: 3,
        entries: [
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Croc Tooth Dagger',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#84cc16',
                    stats: { damage: tier * 11 + (isLegendary ? 12 : 0) }
                })
            },
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Scale Mail',
                    type: 'armor',
                    slot: ItemSlot.BODY,
                    color: '#4d7c0f',
                    stats: { defense: tier * 7 + (isLegendary ? 10 : 0) }
                })
            }
        ]

    },
    'sandworm': {
        dropChance: 1.0,
        tier: 4,
        entries: [
            {
                chance: 1.0,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Worm Fang',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#eab308',
                    stats: { damage: tier * 20 + 20 }
                })
            }
        ]
    },
    'cave_bat': {
        dropChance: 0.3,
        tier: 1,
        entries: [
            {
                chance: 1.0,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Bat Wing Ring',
                    type: 'ring',
                    slot: ItemSlot.RING_1,
                    color: '#1e293b',
                    effectTags: ['vampiric'],
                    stats: { magic: tier * 5 + (isLegendary ? 10 : 0) }
                })
            }
        ]
    },
    'cave_rat': {
        dropChance: 0.3,
        tier: 1,
        entries: [
            {
                chance: 1.0,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Rat Tail Belt',
                    type: 'armor',
                    slot: ItemSlot.BODY,
                    color: '#713f12',
                    stats: { defense: tier * 3 }
                })
            }
        ]
    },
    'goblin': {
        dropChance: 0.6,
        tier: 2,
        entries: [
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Goblin Dagger',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#4ade80',
                    effectTags: ['poisonous'],
                    stats: { damage: tier * 10 + (isLegendary ? 15 : 0) }
                })
            },
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Thief Ring',
                    type: 'ring',
                    slot: Math.random() > 0.5 ? ItemSlot.RING_1 : ItemSlot.RING_2,
                    color: '#eab308',
                    stats: { defense: tier * 2, magic: tier * 5 }
                })
            }
        ]
    },
    'hobgoblin': {
        dropChance: 0.9,
        tier: 4,
        entries: [
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary, isRoyal) => ({
                    id, x, y,
                    name: isRoyal ? 'Royal Hobgoblin Crown' : 'Hobgoblin Crown',
                    type: 'helmet',
                    slot: ItemSlot.HEAD,
                    color: isRoyal ? '#fbbf24' : '#b45309',
                    quality: isRoyal ? 'royal' : (isLegendary ? 'legendary' : 'epic'),
                    effectTags: ['leadership', 'strength'],
                    stats: { defense: tier * 8, damage: tier * 5 + (isRoyal ? 20 : 0) }
                })
            },
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary, isRoyal) => ({
                    id, x, y,
                    name: 'Signet Ring of the Depths',
                    type: 'ring',
                    slot: ItemSlot.RING_1,
                    color: '#c084fc',
                    quality: isRoyal ? 'royal' : (isLegendary ? 'legendary' : 'rare'),
                    effectTags: ['magic_boost', 'appraisal'],
                    stats: { magic: tier * 15 + (isRoyal ? 25 : 0) }
                })
            }
        ]
    },
    'skeleton': {
        dropChance: 0.5,
        tier: 2,
        entries: [
            {
                chance: 0.5,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Bone Sword',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#f3f4f6',
                    stats: { damage: tier * 8 }
                })
            }
        ]
    },
    'corrupted_beast': {
        dropChance: 0.9,
        tier: 4,
        entries: [
            {
                chance: 1.0,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Cursed Hide',
                    type: 'armor',
                    slot: ItemSlot.BODY,
                    color: '#5b21b6',
                    stats: { defense: tier * 15 + 15 }
                })
            }
        ]
    },
        'turtle': {
        dropChance: 0.6,
        tier: 1,
        entries: [
            {
                chance: 1.0,
                generateFunc: (id, x, y, tier, isLegendary, isRoyal) => ({
                    id, x, y,
                    name: 'Turtle Egg',
                    type: 'egg',
                    slot: ItemSlot.NONE,
                    color: '#e2e8f0',
                    stats: { heal: 20 }
                })
            }
        ]
    },
    'default': {
        dropChance: 0.1,
        tier: 1,
        entries: [
            {
                chance: 1.0,
                generateFunc: (id, x, y, tier, isLegendary) => ({
                    id, x, y,
                    name: 'Bone Club',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#d1d5db',
                    stats: { damage: tier * 10 + Math.floor(Math.random() * 5) + (isLegendary ? 20 : 0) }
                })
            }
        ]
    },
    'necromancer': {
        dropChance: 1.0,
        tier: 5,
        entries: [
            {
                chance: 1.0,
                generateFunc: (id, x, y, tier, isLegendary, isRoyal) => ({
                    id, x, y,
                    name: 'Staff of the Undying',
                    type: 'weapon',
                    slot: ItemSlot.RIGHT_HAND,
                    color: '#6b21a8',
                    quality: 'legendary',
                    effectTags: ['necromancy', 'curse'],
                    stats: { damage: 50, magic: 50 }
                })
            }
        ]
    },

};

export class LootSystem {
    public static generateDrop(animalType: string, x: number, y: number, nextItemId: () => string, isRoyalSource?: boolean): ItemData | null {
        const table = EntityLootTables[animalType] || EntityLootTables['default'];
        
        if (Math.random() > table.dropChance) return null;

        const isLegendary = Math.random() < 0.1;
        const isRoyal = isRoyalSource || (Math.random() < 0.05); // 5% chance of royal item or guaranteed if from royal source
        const rand = Math.random();
        
        let cumulative = 0;
        let selectedEntry = table.entries[table.entries.length - 1]; // Default to last
        
        for (const entry of table.entries) {
            cumulative += entry.chance;
            if (rand < cumulative) {
                selectedEntry = entry;
                break;
            }
        }

        if (selectedEntry.generateFunc) {
            const item = selectedEntry.generateFunc(nextItemId(), x, y, table.tier, isLegendary, isRoyal);
            if (!item.quality) {
                if (isRoyal) item.quality = 'royal';
                else if (isLegendary) item.quality = 'legendary';
                else item.quality = 'common';
            }
            if (item.quality === 'royal' && !item.name.includes('Royal')) {
                 item.name = `Royal ${item.name}`;
                 item.color = '#fbbf24';
            } else if (item.quality === 'legendary' && !item.name.includes('Legendary')) {
                item.name = `Legendary ${item.name}`;
                item.color = '#fbbf24';
            }
            return item;
        }
        return null;
    }
}
