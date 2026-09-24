export const DungeonConfig = {
    name: "The Crypt of the Undying",
    type: "crypt",
    maxDepth: 3,
    roomsPerLevel: { min: 4, max: 8 },
    roomSize: { min: 4, max: 8 },
    corridorLength: { min: 2, max: 5 },
    decorations: [
        { type: "pillar", chance: 0.1 },
        { type: "table", chance: 0.05 },
        { type: "skeleton", chance: 0.05 },
        { type: "chest", chance: 0.02 }
    ],
    mobs: [
        { type: "skeleton", chance: 0.4 },
        { type: "spider", chance: 0.3 }
    ],
    bosses: [
        { type: "necromancer", name: "The Undying Lord", level: 1, health: 1000 }
    ]
};
