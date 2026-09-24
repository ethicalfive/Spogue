export enum AnimalState {
  IDLE = 0,
  WANDER = 1,
  FLEE = 2,
  PURSUE = 3,
  EAT = 4,
  DEAD = 5,
  CIRCLE = 6,
  LUNGE = 7
}

export interface BoatData {
  id: string;
  x: number;
  y: number;
}

export enum ItemSlot {
  NONE = 'none',
  HEAD = 'head',
  NECK = 'neck',
  BODY = 'body',
  LEFT_HAND = 'left_hand',
  RIGHT_HAND = 'right_hand',
  RING_1 = 'ring_1',
  RING_2 = 'ring_2'
}

export interface ItemData {
  id: string;
  name: string;
  type: string;
  slot: ItemSlot;
  color: string;
  quality?: 'common' | 'rare' | 'epic' | 'legendary' | 'royal';
  effectTags?: string[];
  quantity?: number; // magic and appraisal systems hook
  stats: {
    damage?: number;
    defense?: number;
    heal?: number;
    magic?: number;
    speed?: number;
    support?: number;
  };
  x?: number;
  y?: number;
  hatchTimer?: number;
}

export interface PlayerData {
  id: string;
  x: number;
  y: number;
  color: string;
  health: number;
  mana?: number;
  maxMana?: number;
  isAlive: boolean;
  score: number;
  isRidingBoat?: boolean;
  packBehavior?: string;
  inventory: ItemData[];
  equipment: Partial<Record<ItemSlot, ItemData>>;
  gameMode?: 'respawn' | 'permadeath';
  playerClass?: string;
  baseStats?: { speed: number; attack: number; defense: number; gatherYield: number; maxHealth: number };
  foodPreservation?: number;
}

export interface AnimalData {
  id: string;
  x: number;
  y: number;
  type: string;
  name?: string; // For named hobgoblins etc.
  level?: number; // For level ups
  state: AnimalState;
  ownerId?: string | null;
  vx: number;
  vy: number;
  health: number;
  maxHealth?: number;
  facing: number;
}

export interface GameStateData {
  players: Record<string, PlayerData>;
  animals: Record<string, AnimalData>;
  boats: Record<string, BoatData>;
  items: Record<string, ItemData>;
}

export class GameEntity {
  x: number;
  y: number;
  width: number;
  height: number;
  
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  // AABB collision
  collidesWith(other: GameEntity): boolean {
    return (
      this.x < other.x + other.width &&
      this.x + this.width > other.x &&
      this.y < other.y + other.height &&
      this.y + this.height > other.y
    );
  }
}
