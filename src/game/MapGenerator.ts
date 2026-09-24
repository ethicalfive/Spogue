import { createNoise2D } from 'simplex-noise';

export enum TileType {
  WATER = 0,
  SAND = 1,
  GRASS = 2,
  FOREST = 3,
  MOUNTAIN = 4,
  SNOW = 5,
  SWAMP = 6,
  FRESHWATER = 7,
  DEEP_DESERT = 8,
  CURSED_LAND = 9,
  RIVER_BANK = 10,
  GLACIER = 11,
  DUNE = 12,
  MAGIC_FOREST = 13,
  OASIS = 14,
  CAVE_FLOOR = 15,
  CAVE_WALL = 16,
  DUNGEON_ENTRANCE = 17,
  VOID = 18,
  DUNGEON_DOOR = 19,
  DUNGEON_STAIRS_DOWN = 20,
  DUNGEON_STAIRS_UP = 21,
  DUNGEON_DOOR_OPEN = 22,
}

export class MapGenerator {
  private noise2D: (x: number, y: number) => number;
  private noise2D_moisture: (x: number, y: number) => number;
  private noise2D_cursed: (x: number, y: number) => number;
  private noise2D_river: (x: number, y: number) => number;
  private noise2D_roughness: (x: number, y: number) => number;
  private noise2D_magic: (x: number, y: number) => number;
  private noise2D_cave: (x: number, y: number) => number;
  private seed: string;
  public tileSize: number = 64;
  private modifiedTiles: Record<string, TileType> = {}; // for level editor / save data
  
  private textures: Map<TileType, HTMLCanvasElement> = new Map();

  constructor(seed: string = 'default_seed') {
    this.seed = seed;
    // Simple seeded PRNG for simplex noise (not perfectly uniform, but works for terrain)
    let s = 1337;
    for(let i=0; i<seed.length; i++) s = Math.imul(s ^ seed.charCodeAt(i), 2654435761);
    const prng = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822519);
      s = Math.imul(s ^ (s >>> 13), 3266489917);
      s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
  
     }
;
    this.noise2D = createNoise2D(prng);
    const prng2 = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822519);
      s = Math.imul(s ^ (s >>> 13), 3266489917);
      s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
    };
    this.noise2D_moisture = createNoise2D(prng2);
    const prng3 = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822519);
      s = Math.imul(s ^ (s >>> 13), 3266489917);
      s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
    };
    this.noise2D_cursed = createNoise2D(prng3);
    const prng4 = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822519);
      s = Math.imul(s ^ (s >>> 13), 3266489917);
      s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
    };
    this.noise2D_river = createNoise2D(prng4);
    const prng5 = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822519);
      s = Math.imul(s ^ (s >>> 13), 3266489917);
      s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
    };
    this.noise2D_roughness = createNoise2D(prng5);
    const prng6 = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822519);
      s = Math.imul(s ^ (s >>> 13), 3266489917);
      s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
    };
    this.noise2D_magic = createNoise2D(prng6);
    const prng7 = () => {
      s = Math.imul(s ^ (s >>> 15), 2246822519);
      s = Math.imul(s ^ (s >>> 13), 3266489917);
      s ^= s >>> 16;
      return (s >>> 0) / 4294967296;
    };
    this.noise2D_cave = createNoise2D(prng7);
    
    if (typeof document !== 'undefined') {
      this.generateTextures();
    }
  }
  
  private generateTextures() {
     const tSize = this.tileSize;
     
     // Helper to create a texture canvas
     const createTex = (type: TileType, baseColor: string, detailColor: string, drawDetails: (ctx: CanvasRenderingContext2D) => void) => {
        const canvas = document.createElement('canvas');
        canvas.width = tSize;
        canvas.height = tSize;
        const ctx = canvas.getContext('2d')!;
        
        ctx.fillStyle = baseColor;
        ctx.fillRect(0, 0, tSize, tSize);
        
        ctx.fillStyle = detailColor;
        ctx.strokeStyle = detailColor;
        drawDetails(ctx);
        
        this.textures.set(type, canvas);
     };

     // WATER
     createTex(TileType.WATER, '#2563eb', '#3b82f6', (ctx) => {
        for (let i = 0; i < 5; i++) {
           ctx.beginPath();
           const cx = Math.random() * tSize;
           const cy = Math.random() * tSize;
           ctx.arc(cx, cy, Math.random() * 8 + 4, 0, Math.PI * 2);
           ctx.fill();
        }
     });

     // SAND
     createTex(TileType.SAND, '#fcd34d', '#f59e0b', (ctx) => {
        for (let i = 0; i < 20; i++) {
           ctx.beginPath();
           ctx.arc(Math.random() * tSize, Math.random() * tSize, Math.random() * 2, 0, Math.PI * 2);
           ctx.fill();
        }
     });

     // GRASS
     createTex(TileType.GRASS, '#4ade80', '#22c55e', (ctx) => {
        ctx.lineWidth = 2;
        for (let i = 0; i < 15; i++) {
           const x = Math.random() * tSize;
           const y = Math.random() * tSize;
           ctx.beginPath();
           ctx.moveTo(x, y);
           ctx.lineTo(x - 4, y - 8);
           ctx.moveTo(x, y);
           ctx.lineTo(x + 2, y - 10);
           ctx.stroke();
        }
     });

     // FOREST
     createTex(TileType.FOREST, '#166534', '#14532d', (ctx) => {
        for (let i = 0; i < 8; i++) {
           const x = Math.random() * tSize;
           const y = Math.random() * tSize;
           ctx.beginPath();
           ctx.arc(x, y, 12, 0, Math.PI * 2);
           ctx.fill();
           ctx.fillStyle = '#166534';
           ctx.beginPath();
           ctx.arc(x, y - 4, 10, 0, Math.PI * 2);
           ctx.fill();
           ctx.fillStyle = '#14532d'; // reset
        }
     });

     // MOUNTAIN
     createTex(TileType.MOUNTAIN, '#78716c', '#57534e', (ctx) => {
        ctx.lineWidth = 3;
        for (let i = 0; i < 4; i++) {
           const x = Math.random() * tSize;
           const y = Math.random() * tSize;
           ctx.beginPath();
           ctx.moveTo(x, y);
           ctx.lineTo(x + 8, y - 12);
           ctx.lineTo(x + 16, y);
           ctx.stroke();
        }
     });
// SNOW
     createTex(TileType.SNOW, '#f8fafc', '#e2e8f0', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 20; i++) {
           ctx.beginPath();
           ctx.arc(Math.random() * tSize, Math.random() * tSize, Math.random() * 2, 0, Math.PI * 2);
           ctx.fillStyle = '#cbd5e1';
           ctx.fill();
        }
     });
     // SWAMP
     createTex(TileType.SWAMP, '#3f6212', '#4d7c0f', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 15; i++) {
           const x = Math.random() * tSize;
           const y = Math.random() * tSize;
           ctx.beginPath();
           ctx.arc(x, y, 6, 0, Math.PI * 2);
           ctx.fillStyle = '#365314';
           ctx.fill();
        }
     });
     // FRESHWATER
     createTex(TileType.FRESHWATER, '#38bdf8', '#7dd3fc', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 8; i++) {
           ctx.beginPath();
           ctx.arc(Math.random() * tSize, Math.random() * tSize, Math.random() * 4 + 2, 0, Math.PI * 2);
           ctx.fillStyle = '#0ea5e9';
           ctx.fill();
        }
     });
     // DEEP_DESERT
     createTex(TileType.DEEP_DESERT, '#ca8a04', '#eab308', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 25; i++) {
           ctx.beginPath();
           ctx.arc(Math.random() * tSize, Math.random() * tSize, Math.random() * 3, 0, Math.PI * 2);
           ctx.fillStyle = '#a16207';
           ctx.fill();
        }
     });
     // CURSED_LAND
     createTex(TileType.CURSED_LAND, '#4c1d95', '#5b21b6', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 12; i++) {
           const x = Math.random() * tSize;
           const y = Math.random() * tSize;
           ctx.fillStyle = '#7c3aed';
           ctx.fillRect(x, y, 4, 4);
        }
     });
     // RIVER_BANK
     createTex(TileType.RIVER_BANK, '#78350f', '#92400e', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 10; i++) {
           ctx.fillStyle = '#b45309';
           ctx.fillRect(Math.random() * tSize, Math.random() * tSize, 6, 3);
        }
     });
     // GLACIER
     createTex(TileType.GLACIER, '#e0f2fe', '#bae6fd', (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#7dd3fc';
        for (let i = 0; i < 5; i++) {
           ctx.beginPath();
           ctx.moveTo(Math.random() * tSize, Math.random() * tSize);
           ctx.lineTo(Math.random() * tSize, Math.random() * tSize);
           ctx.lineTo(Math.random() * tSize, Math.random() * tSize);
           ctx.fill();
        }
     });
     // DUNE
     createTex(TileType.DUNE, '#d97706', '#b45309', (ctx: CanvasRenderingContext2D) => {
        ctx.strokeStyle = '#92400e';
        ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
           ctx.beginPath();
           ctx.moveTo(0, Math.random() * tSize);
           ctx.quadraticCurveTo(tSize/2, Math.random() * tSize, tSize, Math.random() * tSize);
           ctx.stroke();
        }
     });
     // MAGIC_FOREST
     createTex(TileType.MAGIC_FOREST, '#fce7f3', '#fbcfe8', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 12; i++) {
           const x = Math.random() * tSize;
           const y = Math.random() * tSize;
           ctx.beginPath();
           ctx.arc(x, y, 10, 0, Math.PI * 2);
           ctx.fillStyle = '#f472b6';
           ctx.fill();
           ctx.fillStyle = '#db2777';
           ctx.fillRect(x - 2, y + 2, 4, 8);
        }
     });
     // OASIS
     createTex(TileType.OASIS, '#2dd4bf', '#14b8a6', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 6; i++) {
           ctx.beginPath();
           ctx.arc(Math.random() * tSize, Math.random() * tSize, Math.random() * 5 + 3, 0, Math.PI * 2);
           ctx.fillStyle = '#0f766e';
           ctx.fill();
        }
     });

     // CAVES
     createTex(TileType.CAVE_FLOOR, '#44403c', '#292524', (ctx: CanvasRenderingContext2D) => {
        for (let i = 0; i < 15; i++) {
           ctx.fillStyle = '#1c1917';
           ctx.fillRect(Math.random() * tSize, Math.random() * tSize, 3, 3);
        }
     });

     createTex(TileType.VOID, '#000000', '#000000', () => {});
     
     createTex(TileType.DUNGEON_DOOR_OPEN, '#57301c', '#3e2013', (ctx: CanvasRenderingContext2D) => { ctx.fillStyle = '#000'; ctx.fillRect(4, 0, 12, 16); });
    createTex(TileType.DUNGEON_DOOR, '#3e2013', '#57301c', (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(tSize/2 - 2, 0, 4, tSize); // crack
        ctx.fillStyle = '#78716c'; // metal hinges
        ctx.fillRect(0, 10, tSize, 4);
        ctx.fillRect(0, tSize - 14, tSize, 4);
     });

     createTex(TileType.DUNGEON_STAIRS_DOWN, '#111111', '#000000', (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#292524';
      ctx.fillRect(2, 2, 12, 12);
      ctx.fillStyle = '#000';
      ctx.fillRect(4, 4, 8, 8);
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(2, 2, 4, 12);
      ctx.fillRect(2, 2, 12, 4);
    });

     createTex(TileType.DUNGEON_STAIRS_UP, '#57534e', '#44403c', (ctx: CanvasRenderingContext2D) => {
      ctx.fillStyle = '#78716c';
      ctx.fillRect(2, 10, 12, 4);
      ctx.fillStyle = '#a8a29e';
      ctx.fillRect(2, 6, 12, 4);
      ctx.fillStyle = '#d6d3d1';
      ctx.fillRect(2, 2, 12, 4);
    });

     createTex(TileType.CAVE_WALL, '#292524', '#1c1917', (ctx: CanvasRenderingContext2D) => {
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0c0a09';
        for (let i = 0; i < 5; i++) {
           ctx.beginPath();
           ctx.moveTo(Math.random() * tSize, Math.random() * tSize);
           ctx.lineTo(Math.random() * tSize, Math.random() * tSize);
           ctx.stroke();
        }
     });

     createTex(TileType.DUNGEON_ENTRANCE, '#292524', '#000000', (ctx: CanvasRenderingContext2D) => {
        ctx.fillStyle = '#1c1917'; // dark arch
        ctx.beginPath();
        ctx.arc(tSize/2, tSize/2, tSize/2 - 2, Math.PI, 0);
        ctx.fillRect(2, tSize/2, tSize - 4, tSize/2);
        ctx.fill();
        
        ctx.fillStyle = '#000000'; // black void
        ctx.beginPath();
        ctx.arc(tSize/2, tSize/2 + 2, tSize/2 - 6, Math.PI, 0);
        ctx.fillRect(6, tSize/2 + 2, tSize - 12, tSize/2);
        ctx.fill();
        
        ctx.fillStyle = '#f87171'; // red glowing eyes?
        ctx.beginPath();
        ctx.arc(tSize/2 - 6, tSize/2 + 6, 2, 0, Math.PI * 2);
        ctx.arc(tSize/2 + 6, tSize/2 + 6, 2, 0, Math.PI * 2);
        ctx.fill();
     });
  }

  public getTileAt(gx: number, gy: number): TileType {
    const key = `${gx},${gy}`;
    if (this.modifiedTiles[key] !== undefined) {
      return this.modifiedTiles[key];
    }
    
    if (this.seed.startsWith('dungeon') || gx > 5000 || gy > 5000 || gx < -5000 || gy < -5000) {
       // Everything outside modified dungeon tiles is just void
       return TileType.VOID;
    }
    
    // Scale for noise
    // Scales for noise - much smaller to make biomes huge
    const macroScale = 0.003; 
    const microScale = 0.05; // For local structures like mazes, dunes, etc.
    
    // Get noise value between -1 and 1
    const elevation = this.noise2D(gx * macroScale, gy * macroScale);
    const moisture = this.noise2D_moisture(gx * macroScale, gy * macroScale);
    const curse = this.noise2D_cursed(gx * macroScale, gy * macroScale);
    const magic = this.noise2D_magic(gx * macroScale, gy * macroScale);
    const river = this.noise2D_river(gx * macroScale * 2, gy * macroScale * 2);
    const roughness = this.noise2D_roughness(gx * microScale, gy * microScale);
    const caveNoise = this.noise2D_cave(gx * microScale, gy * microScale);
    
    // Mountains
    if (elevation > 0.6) {
        // Carve caves into mountains
        if (caveNoise > 0.4) {
            // A cave system inside the mountain
            if (roughness > 0.3) return TileType.CAVE_WALL; // impassable walls inside
            return TileType.CAVE_FLOOR;
        } else if (caveNoise > 0.35) {
             return TileType.DUNGEON_ENTRANCE; // The rim of the cave system
        }
        
        if (moisture > 0.3) return TileType.SNOW;
        return TileType.MOUNTAIN; // Large mountain ranges
    }
    
    if (curse > 0.6) {
        // High stakes / malevolent region
        if (roughness > 0.4) return TileType.MOUNTAIN; // impassable walls
        return TileType.CURSED_LAND;
    }
    
    if (magic > 0.6) {
        // Adorable / safe sub-biome
        if (roughness > 0.5) return TileType.MOUNTAIN;
        return TileType.MAGIC_FOREST;
    }
    
    // Rivers carve through land
    if (Math.abs(river) < 0.03 && elevation > -0.2 && elevation < 0.5) {
        return TileType.FRESHWATER;
    }
    if (Math.abs(river) < 0.05 && Math.abs(river) >= 0.03 && elevation > -0.2 && elevation < 0.5) {
        return TileType.RIVER_BANK;
    }
    
    // Oceans
    if (elevation < -0.4) {
        if (moisture > 0.5 && roughness > 0.3) return TileType.GLACIER; // Icebergs in ocean
        return TileType.WATER; 
    }
    // Ocean Bank/Beach
    if (elevation < -0.3) {
        return TileType.SAND;
    }
    
    // Biomes based on moisture
    if (moisture > 0.4) {
        if (roughness > 0.5) return TileType.FRESHWATER; // swamp puddles
        return TileType.SWAMP;
    }
    
    // Deep Desert
    if (moisture < -0.6) {
        if (elevation < -0.2 && roughness < -0.3 && Math.abs(river) > 0.1) return TileType.OASIS;
        if (roughness > 0.3) return TileType.DUNE; // impassable dunes
        return TileType.DEEP_DESERT;
    }
    // Standard desert
    if (moisture < -0.3) {
        if (roughness > 0.6) return TileType.DUNE;
        return TileType.SAND; 
    }
    
    // Snow regions
    if (elevation > 0.3 && moisture > 0.1) {
        if (roughness > 0.5) return TileType.GLACIER;
        return TileType.SNOW;
    }
    
    // Forest and Grass
    if (elevation > 0.1) {
        if (roughness > 0.6) return TileType.MOUNTAIN; // Rock formations in forest
        return TileType.FOREST;
    }
    
    if (roughness > 0.6) return TileType.MOUNTAIN; // random rock formations
    return TileType.GRASS;
  }

  public setTileAt(gx: number, gy: number, type: TileType) {
    this.modifiedTiles[`${gx},${gy}`] = type;
  }

  public getModifiedTiles() {
    return this.modifiedTiles;
  }

  public loadModifiedTiles(data: Record<string, TileType>) {
    this.modifiedTiles = data;
  }

  public getTileColor(type: TileType): string {
    switch (type) {
      case TileType.VOID: return '#000000';
      case TileType.DUNGEON_DOOR: return '#57301c';
      case TileType.DUNGEON_DOOR_OPEN: return '#3e2013';
      case TileType.DUNGEON_STAIRS_DOWN: return '#111111'; // hole
      case TileType.DUNGEON_STAIRS_UP: return '#cccccc'; // steps
      case TileType.WATER: return '#3b82f6';
      case TileType.SAND: return '#fcd34d';
      case TileType.GRASS: return '#4ade80';
      case TileType.FOREST: return '#166534';
      case TileType.MOUNTAIN: return '#78716c';
      case TileType.SNOW: return '#f8fafc';
      case TileType.SWAMP: return '#3f6212';
      case TileType.FRESHWATER: return '#38bdf8';
      case TileType.DEEP_DESERT: return '#ca8a04';
      case TileType.CURSED_LAND: return '#4c1d95';
      case TileType.RIVER_BANK: return '#78350f';
      case TileType.GLACIER: return '#e0f2fe';
      case TileType.DUNE: return '#d97706';
      case TileType.MAGIC_FOREST: return '#fce7f3';
      case TileType.OASIS: return '#2dd4bf';
      case TileType.CAVE_FLOOR: return '#44403c';
      case TileType.CAVE_WALL: return '#292524';
      case TileType.DUNGEON_ENTRANCE: return '#1c1917';
      default: return '#000000';
    }
  }
  
  public getTileTexture(type: TileType): HTMLCanvasElement | undefined {
    return this.textures.get(type);
  }
}
