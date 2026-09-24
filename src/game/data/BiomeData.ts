import { TileType } from '../MapGenerator';

export interface SpawnerConfig {
    type: string; // e.g. "wolf", "cow"
    maxCount: number;
    spawnChance: number; // probability to spawn per tick
    allowedTiles: TileType[];
}

export interface BiomeConfig {
    id: string;
    name: string;
    primaryTile: TileType;
    spawners: SpawnerConfig[];
}

export const BiomeData: Record<string, BiomeConfig> = {
    
    'beach': {
        id: 'beach',
        name: 'Beach',
        primaryTile: TileType.SAND,
        spawners: [
            { type: 'turtle', maxCount: 15, spawnChance: 0.1, allowedTiles: [TileType.SAND, TileType.WATER] }
        ]
    },
    'mountain': {
        id: 'mountain',
        name: 'Mountain',
        primaryTile: TileType.MOUNTAIN,
        spawners: [
            { type: 'wolf', maxCount: 5, spawnChance: 0.05, allowedTiles: [TileType.SNOW, TileType.GRASS] }
        ]
    },
    'river_bank': {
        id: 'river_bank',
        name: 'River Bank',
        primaryTile: TileType.RIVER_BANK,
        spawners: [
            { type: 'frog', maxCount: 10, spawnChance: 0.1, allowedTiles: [TileType.RIVER_BANK, TileType.FRESHWATER, TileType.SWAMP] },
            { type: 'crocodile', maxCount: 3, spawnChance: 0.02, allowedTiles: [TileType.RIVER_BANK, TileType.FRESHWATER, TileType.SWAMP] }
        ]
    },
    'grassland': {
        id: 'grassland',
        name: 'Grassland',
        primaryTile: TileType.GRASS,
        spawners: [
            { type: 'cow', maxCount: 10, spawnChance: 0.05, allowedTiles: [TileType.GRASS, TileType.SAND] },
            { type: 'dog', maxCount: 5, spawnChance: 0.02, allowedTiles: [TileType.GRASS] },
            { type: 'fox', maxCount: 5, spawnChance: 0.03, allowedTiles: [TileType.GRASS] },
        ]
    },
    'forest': {
        id: 'forest',
        name: 'Forest',
        primaryTile: TileType.FOREST,
        spawners: [
            { type: 'wolf', maxCount: 8, spawnChance: 0.04, allowedTiles: [TileType.FOREST, TileType.GRASS] },
            { type: 'fox', maxCount: 8, spawnChance: 0.05, allowedTiles: [TileType.FOREST] },
        ]
    },
    'ocean': {
        id: 'ocean',
        name: 'Ocean',
        primaryTile: TileType.WATER,
        spawners: [
            { type: 'shark', maxCount: 6, spawnChance: 0.03, allowedTiles: [TileType.WATER] },
            { type: 'dolphin', maxCount: 6, spawnChance: 0.04, allowedTiles: [TileType.WATER] },
            { type: 'tuna', maxCount: 15, spawnChance: 0.1, allowedTiles: [TileType.WATER] },
        ]
    },
    'snow': {
        id: 'snow',
        name: 'Snow',
        primaryTile: TileType.SNOW,
        spawners: [
            { type: 'penguin', maxCount: 15, spawnChance: 0.1, allowedTiles: [TileType.SNOW, TileType.WATER] },
            { type: 'polar_bear', maxCount: 4, spawnChance: 0.02, allowedTiles: [TileType.SNOW] },
        ]
    },
    'swamp': {
        id: 'swamp',
        name: 'Swamp',
        primaryTile: TileType.SWAMP,
        spawners: [
            { type: 'frog', maxCount: 15, spawnChance: 0.1, allowedTiles: [TileType.SWAMP, TileType.WATER] },
            { type: 'crocodile', maxCount: 5, spawnChance: 0.03, allowedTiles: [TileType.SWAMP, TileType.WATER] },
        ]

    },
    'deep_desert': {
        id: 'deep_desert',
        name: 'Deep Desert',
        primaryTile: TileType.DEEP_DESERT,
        spawners: [
            { type: 'camel', maxCount: 10, spawnChance: 0.05, allowedTiles: [TileType.DEEP_DESERT, TileType.SAND] },
            { type: 'scorpion', maxCount: 8, spawnChance: 0.04, allowedTiles: [TileType.DEEP_DESERT, TileType.SAND] },
            { type: 'sandworm', maxCount: 2, spawnChance: 0.01, allowedTiles: [TileType.DEEP_DESERT] },
        ]
    },
    'freshwater': {
        id: 'freshwater',
        name: 'Freshwater River',
        primaryTile: TileType.FRESHWATER,
        spawners: [
            { type: 'freshwater_fish', maxCount: 20, spawnChance: 0.15, allowedTiles: [TileType.FRESHWATER] },
            { type: 'turtle', maxCount: 10, spawnChance: 0.05, allowedTiles: [TileType.RIVER_BANK, TileType.FRESHWATER, TileType.GRASS] },
        ]
    },
    'cursed_land': {
        id: 'cursed_land',
        name: 'Cursed Land',
        primaryTile: TileType.CURSED_LAND,
        spawners: [
            
            { type: 'corrupted_beast', maxCount: 4, spawnChance: 0.02, allowedTiles: [TileType.CURSED_LAND] },
        ]

    },
    'glacier': {
        id: 'glacier',
        name: 'Glacier',
        primaryTile: TileType.GLACIER,
        spawners: [
            { type: 'polar_bear', maxCount: 2, spawnChance: 0.01, allowedTiles: [TileType.SNOW] }
        ]
    },
    'dune': {
        id: 'dune',
        name: 'Dunes',
        primaryTile: TileType.DUNE,
        spawners: [
            { type: 'sandworm', maxCount: 3, spawnChance: 0.02, allowedTiles: [TileType.DEEP_DESERT, TileType.SAND] },
            { type: 'scorpion', maxCount: 10, spawnChance: 0.05, allowedTiles: [TileType.DEEP_DESERT, TileType.SAND] }
        ]
    },
    'magic_forest': {
        id: 'magic_forest',
        name: 'Magic Forest',
        primaryTile: TileType.MAGIC_FOREST,
        spawners: [
            { type: 'bunny', maxCount: 20, spawnChance: 0.1, allowedTiles: [TileType.MAGIC_FOREST] },
            { type: 'butterfly', maxCount: 30, spawnChance: 0.2, allowedTiles: [TileType.MAGIC_FOREST] }
        ]
    },
    'oasis': {
        id: 'oasis',
        name: 'Oasis',
        primaryTile: TileType.OASIS,
        spawners: [
            { type: 'camel', maxCount: 5, spawnChance: 0.05, allowedTiles: [TileType.OASIS, TileType.DEEP_DESERT] },
            { type: 'turtle', maxCount: 5, spawnChance: 0.05, allowedTiles: [TileType.OASIS] }
        ]
    },
    'cave': {
        id: 'cave',
        name: 'Deep Cave',
        primaryTile: TileType.CAVE_FLOOR,
        spawners: [
            { type: 'cave_bat', maxCount: 15, spawnChance: 0.1, allowedTiles: [TileType.CAVE_FLOOR, TileType.DUNGEON_ENTRANCE] },
            { type: 'cave_rat', maxCount: 15, spawnChance: 0.1, allowedTiles: [TileType.CAVE_FLOOR, TileType.DUNGEON_ENTRANCE] },
            { type: 'goblin', maxCount: 10, spawnChance: 0.05, allowedTiles: [TileType.CAVE_FLOOR] },
            { type: 'hobgoblin', maxCount: 4, spawnChance: 0.02, allowedTiles: [TileType.CAVE_FLOOR] },
            
        ]
    }
};

export class BiomeSystem {
    // Determine the biome for a given tile type
    public static getBiomeForTile(tile: TileType): BiomeConfig | undefined {
        for (const biome of Object.values(BiomeData)) {
            if (biome.primaryTile === tile) {
                return biome;
            }
        }
        return undefined;
    }
}
