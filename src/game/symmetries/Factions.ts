export enum Faction {
  NEUTRAL = 0,
  HERBIVORE = 1,
  CARNIVORE = 2,
  PLAYER = 3,
}

export type Relation = 'hostile' | 'neutral' | 'friendly';

export const FactionRelations: Record<Faction, Record<Faction, Relation>> = {
  [Faction.NEUTRAL]: {
    [Faction.NEUTRAL]: 'neutral',
    [Faction.HERBIVORE]: 'neutral',
    [Faction.CARNIVORE]: 'neutral',
    [Faction.PLAYER]: 'neutral',
  },
  [Faction.HERBIVORE]: {
    [Faction.NEUTRAL]: 'neutral',
    [Faction.HERBIVORE]: 'friendly',
    [Faction.CARNIVORE]: 'hostile', // Flee
    [Faction.PLAYER]: 'neutral', // Neutral until attacked
  },
  [Faction.CARNIVORE]: {
    [Faction.NEUTRAL]: 'neutral',
    [Faction.HERBIVORE]: 'hostile', // Hunt
    [Faction.CARNIVORE]: 'neutral',
    [Faction.PLAYER]: 'hostile', // Hunt
  },
  [Faction.PLAYER]: {
    [Faction.NEUTRAL]: 'neutral',
    [Faction.HERBIVORE]: 'neutral',
    [Faction.CARNIVORE]: 'hostile',
    [Faction.PLAYER]: 'hostile', // PvP
  },
};

export function getRelation(a: Faction, b: Faction): Relation {
  return FactionRelations[a][b];
}
