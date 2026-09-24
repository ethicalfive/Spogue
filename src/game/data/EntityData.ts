import { Faction } from '../symmetries/Factions';

export interface EntityBehaviorConfig {
    speed: number;
    aggroRange: number;
    attackRange: number;
    damageToPlayer: number;
    damageToAnimal: number;
    fleeThreshold?: number; // health below which it flees
    canBeTamed?: boolean;
}

export interface EntityDef {
    id: string; // e.g., 'wolf', 'cow'
    baseHealth: number;
    faction: Faction;
    isAquatic: boolean;
    impassable?: boolean;
    behavior: EntityBehaviorConfig;
    // evolution
    evolvesTo?: string;
    evolutionKillsRequired?: number; // kills needed to evolve
}

export const EntityDatabase: Record<string, EntityDef> = {
    'pillar': {
        id: 'pillar',
        baseHealth: 9999,
        faction: Faction.NEUTRAL,
        isAquatic: false,
        impassable: true,
        behavior: { speed: 0, aggroRange: 0, attackRange: 0, damageToPlayer: 0, damageToAnimal: 0 }
    },
    'table': {
        id: 'table',
        baseHealth: 9999,
        faction: Faction.NEUTRAL,
        isAquatic: false,
        impassable: true,
        behavior: { speed: 0, aggroRange: 0, attackRange: 0, damageToPlayer: 0, damageToAnimal: 0 }
    },
    'chest': {
        id: 'chest',
        baseHealth: 100,
        faction: Faction.NEUTRAL,
        isAquatic: false,
        impassable: true,
        behavior: { speed: 0, aggroRange: 0, attackRange: 0, damageToPlayer: 0, damageToAnimal: 0 }
    },

    'cow': {
        id: 'cow',
        baseHealth: 50,
        faction: Faction.HERBIVORE,
        isAquatic: false,
        behavior: {
            speed: 60,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'wolf': {
        id: 'wolf',
        baseHealth: 150,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 120,
            aggroRange: 400,
            attackRange: 30,
            damageToPlayer: 5,
            damageToAnimal: 10,
        }
    },
    'fox': {
        id: 'fox',
        baseHealth: 80,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 130,
            aggroRange: 300,
            attackRange: 30,
            damageToPlayer: 2,
            damageToAnimal: 5,
            fleeThreshold: 30
        }
    },
    
    'alpha_dog': {
        id: 'alpha_dog',
        baseHealth: 300,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 160,
            aggroRange: 500,
            attackRange: 40,
            damageToPlayer: 15,
            damageToAnimal: 30,
            canBeTamed: true
        }
    },

    'dog': {
        id: 'dog',
        baseHealth: 100,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 130,
            aggroRange: 400,
            attackRange: 30,
            damageToPlayer: 6,
            damageToAnimal: 15,
            canBeTamed: true
        }
    },
    'shark': {
        id: 'shark',
        baseHealth: 150,
        faction: Faction.CARNIVORE,
        isAquatic: true,
        behavior: {
            speed: 140,
            aggroRange: 300,
            attackRange: 30,
            damageToPlayer: 15,
            damageToAnimal: 20,
        }
    },
    'dolphin': {
        id: 'dolphin',
        baseHealth: 80,
        faction: Faction.HERBIVORE,
        isAquatic: true,
        behavior: {
            speed: 140,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'tuna': {
        id: 'tuna',
        baseHealth: 50,
        faction: Faction.HERBIVORE,
        isAquatic: true,
        behavior: {
            speed: 150,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'penguin': {
        id: 'penguin',
        baseHealth: 60,
        faction: Faction.HERBIVORE,
        isAquatic: false,
        behavior: {
            speed: 50,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'polar_bear': {
        id: 'polar_bear',
        baseHealth: 200,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 100,
            aggroRange: 350,
            attackRange: 35,
            damageToPlayer: 12,
            damageToAnimal: 18,
        }
    },
    'frog': {
        id: 'frog',
        baseHealth: 30,
        faction: Faction.HERBIVORE,
        isAquatic: false,
        behavior: {
            speed: 40,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'crocodile': {
        id: 'crocodile',
        baseHealth: 160,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 90,
            aggroRange: 300,
            attackRange: 30,
            damageToPlayer: 14,
            damageToAnimal: 16,
        }

    },
    'camel': {
        id: 'camel',
        baseHealth: 150,
        faction: Faction.HERBIVORE,
        isAquatic: false,
        behavior: {
            speed: 45,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'scorpion': {
        id: 'scorpion',
        baseHealth: 60,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 70,
            aggroRange: 200,
            attackRange: 25,
            damageToPlayer: 15,
            damageToAnimal: 10,
        }
    },
    'sandworm': {
        id: 'sandworm',
        baseHealth: 500,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 130,
            aggroRange: 400,
            attackRange: 40,
            damageToPlayer: 35,
            damageToAnimal: 50,
        }
    },
    'freshwater_fish': {
        id: 'freshwater_fish',
        baseHealth: 20,
        faction: Faction.HERBIVORE,
        isAquatic: true,
        behavior: {
            speed: 60,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'turtle': {
        id: 'turtle',
        baseHealth: 100,
        faction: Faction.HERBIVORE,
        isAquatic: false,
        behavior: {
            speed: 25,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'skeleton': {
        id: 'skeleton',
        baseHealth: 80,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 65,
            aggroRange: 350,
            attackRange: 20,
            damageToPlayer: 12,
            damageToAnimal: 12,
        }
    },
    'corrupted_beast': {
        id: 'corrupted_beast',
        baseHealth: 300,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 100,
            aggroRange: 400,
            attackRange: 35,
            damageToPlayer: 25,
            damageToAnimal: 30,
        }

    },
    'bunny': {
        id: 'bunny',
        baseHealth: 20,
        faction: Faction.HERBIVORE,
        isAquatic: false,
        behavior: {
            speed: 60,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
            canBeTamed: true,
            fleeThreshold: 20,
        }
    },
    'butterfly': {
        id: 'butterfly',
        baseHealth: 5,
        faction: Faction.NEUTRAL,
        isAquatic: false,
        behavior: {
            speed: 40,
            aggroRange: 0,
            attackRange: 0,
            damageToPlayer: 0,
            damageToAnimal: 0,
        }
    },
    'cave_bat': {
        id: 'cave_bat',
        baseHealth: 30,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 160,
            aggroRange: 250,
            attackRange: 20,
            damageToPlayer: 5,
            damageToAnimal: 2,
        }
    },
    'cave_rat': {
        id: 'cave_rat',
        baseHealth: 40,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 120,
            aggroRange: 200,
            attackRange: 20,
            damageToPlayer: 8,
            damageToAnimal: 5,
        }
    },
    'goblin': {
        id: 'goblin',
        baseHealth: 90,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 110,
            aggroRange: 350,
            attackRange: 30,
            damageToPlayer: 12,
            damageToAnimal: 10,
        },
        evolvesTo: 'hobgoblin',
        evolutionKillsRequired: 2
    },
    'hobgoblin': {
        id: 'hobgoblin',
        baseHealth: 250,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 100,
            aggroRange: 400,
            attackRange: 35,
            damageToPlayer: 25,
            damageToAnimal: 20,
        }
    },
    'necromancer': {
        id: 'necromancer',
        baseHealth: 1000,
        faction: Faction.CARNIVORE,
        isAquatic: false,
        behavior: {
            speed: 80,
            aggroRange: 500,
            attackRange: 150, // Magic attack range
            damageToPlayer: 40,
            damageToAnimal: 40,
        }
    },

};
