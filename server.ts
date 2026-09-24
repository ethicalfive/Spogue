import * as fs from 'fs';
import express from 'express';
import path from 'path';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { AnimalEntity } from './src/game/entities/AnimalEntity';
import { PlayerEntity } from './src/game/entities/PlayerEntity';
import { AISystem } from './src/game/systems/AISystem';
import { WorldRecipes } from './src/game/worldbuilding/Recipes';
import { DungeonConfig } from './src/game/data/DungeonConfig';
import { MapGenerator, TileType } from './src/game/MapGenerator';

export class Zone {
    id: string;
    seed: string;
    mapGen: MapGenerator;
    animals: Record<string, AnimalEntity> = {};
    boats: Record<string, BoatData> = {};
    items: Record<string, ItemData> = {};
    nextItemId = 0;
    nextAnimalId = 0;
    constructor(id: string, seed: string) {
        this.id = id;
        this.seed = seed;
        this.mapGen = new MapGenerator(seed);
    }
}
const zones: Record<string, Zone> = { 'overworld': new Zone('overworld', 'default_seed') };
function getZ(zoneId?: string) { return zones[zoneId || 'overworld'] || zones['overworld']; }

import { BoatData, ItemData, ItemSlot, AnimalState } from './src/game/Entities';
import { Faction } from './src/game/symmetries/Factions';
import { LootSystem } from './src/game/data/LootTables';
import { BiomeSystem, BiomeData } from './src/game/data/BiomeData';
import { EntityDatabase } from './src/game/data/EntityData';

async function startServer() {
  const app = express();
  const PORT = 3000;
  
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: '*', // Allow all origins for dev
      methods: ['GET', 'POST']
    }
  });

  // Map Generator
  const mapGen = new MapGenerator('default_seed');



  // Generate a procedural dungeon at a fixed offset
  let dungeonStartX = 10000;
  let dungeonStartY = 10000;
  
  
  
  const generateDungeon = () => {
     for (let level = 0; level < DungeonConfig.maxDepth; level++) {
         let levelX = dungeonStartX + (level * 2000);
         let levelY = dungeonStartY;
         
         const rooms = [];
         const numRooms = Math.floor(Math.random() * (DungeonConfig.roomsPerLevel.max - DungeonConfig.roomsPerLevel.min + 1)) + DungeonConfig.roomsPerLevel.min;
         
         // Randomly place rooms
         for (let i = 0; i < numRooms * 3 && rooms.length < numRooms; i++) {
             let w = Math.floor(Math.random() * (DungeonConfig.roomSize.max - DungeonConfig.roomSize.min + 1)) + DungeonConfig.roomSize.min;
             let h = Math.floor(Math.random() * (DungeonConfig.roomSize.max - DungeonConfig.roomSize.min + 1)) + DungeonConfig.roomSize.min;
             let cx = levelX + Math.floor(Math.random() * 40) + 10;
             let cy = levelY + Math.floor(Math.random() * 40) + 10;
             
             let overlap = false;
             for (const r of rooms) {
                 if (Math.abs(cx - r.cx) < (w + r.w)/2 + 2 && Math.abs(cy - r.cy) < (h + r.h)/2 + 2) {
                     overlap = true;
                     break;
                 }
             }
             if (!overlap) {
                 rooms.push({ cx, cy, w, h });
             }
         }
         
         if (rooms.length === 0) continue;
         
         // Carve rooms
         for (const r of rooms) {
             for (let ix = -Math.floor(r.w/2) - 1; ix <= Math.floor(r.w/2) + 1; ix++) {
                 for (let iy = -Math.floor(r.h/2) - 1; iy <= Math.floor(r.h/2) + 1; iy++) {
                     let isWall = (ix === -Math.floor(r.w/2) - 1 || ix === Math.floor(r.w/2) + 1 || iy === -Math.floor(r.h/2) - 1 || iy === Math.floor(r.h/2) + 1);
                     if (isWall) {
                         if (mapGen.getTileAt(r.cx + ix, r.cy + iy) !== TileType.CAVE_FLOOR && mapGen.getTileAt(r.cx + ix, r.cy + iy) !== TileType.DUNGEON_DOOR) {
                             mapGen.setTileAt(r.cx + ix, r.cy + iy, TileType.CAVE_WALL);
                         }
                     } else {
                         mapGen.setTileAt(r.cx + ix, r.cy + iy, TileType.CAVE_FLOOR);
                         // Decorations & Mobs
                         if (Math.random() < 0.1 && (ix !== 0 || iy !== 0)) {
                             const rand = Math.random();
                             let cum = 0, placed = false;
                             for (const dec of DungeonConfig.decorations) {
                                 cum += dec.chance;
                                 if (rand < cum && !placed) {
                                     if (dec.type === 'chest') {
                                         const id = `item_${nextItemId++}`;
                                         items[id] = { id, name: `Level ${level + 1} Chest`, type: 'chest', slot: ItemSlot.NONE, color: '#f59e0b', stats: { level: level + 1 }, x: (r.cx + ix)*mapGen.tileSize + mapGen.tileSize/2, y: (r.cy + iy)*mapGen.tileSize + mapGen.tileSize/2 };
                                     } else {
                                         const id = `animal_${nextAnimalId++}`;
                                         const a = new AnimalEntity(id, (r.cx+ix)*mapGen.tileSize + mapGen.tileSize/2, (r.cy+iy)*mapGen.tileSize + mapGen.tileSize/2, dec.type);
                                         a.state = AnimalState.IDLE;
                                         a.faction = Faction.NEUTRAL;
                                         a.health.max = 50 * (level + 1); a.health.current = a.health.max;
                                         animals[id] = a;
                                     }
                                     placed = true;
                                 }
                             }
                             if (!placed) {
                                 const mRand = Math.random();
                                 let mCum = 0;
                                 for (const mob of DungeonConfig.mobs) {
                                     mCum += mob.chance;
                                     if (mRand < mCum && !placed) {
                                         const id = `animal_${nextAnimalId++}`;
                                         const m = new AnimalEntity(id, (r.cx+ix)*mapGen.tileSize + mapGen.tileSize/2, (r.cy+iy)*mapGen.tileSize + mapGen.tileSize/2, mob.type);
                                         m.level = level + 1;
                                         m.health.max = 30 * (level + 1);
                                         m.health.current = m.health.max;
                                         m.damageMultiplier = (level + 1) * 1.5;
                                         animals[id] = m;
                                         placed = true;
                                     }
                                 }
                             }
                         }
                     }
                 }
             }
         }
         
         // Connect rooms via spanning tree
         const connected = [rooms[0]];
         const unconnected = rooms.slice(1);
         
         while (unconnected.length > 0) {
             let bestDist = Infinity;
             let bestA = null;
             let bestB = null;
             let bestIndex = -1;
             
             for (const a of connected) {
                 for (let i = 0; i < unconnected.length; i++) {
                     const b = unconnected[i];
                     const dist = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy);
                     if (dist < bestDist) {
                         bestDist = dist;
                         bestA = a;
                         bestB = b;
                         bestIndex = i;
                     }
                 }
             }
             
             if (bestA && bestB) {
                 connected.push(bestB);
                 unconnected.splice(bestIndex, 1);
                 
                 // Carve L-shaped corridor
                 let x = bestA.cx;
                 let y = bestA.cy;
                 
                 let dx1 = (bestB.cx > x) ? 1 : (bestB.cx < x ? -1 : 0);
                 
                 // Door logic: Put a door just outside the wall of Room A (if we're moving along X first)
                 let doorAX = x + (Math.floor(bestA.w/2) + 1) * dx1;
                 
                 while (x !== bestB.cx) {
                     if (x === doorAX && dx1 !== 0) {
                        mapGen.setTileAt(x, y, TileType.DUNGEON_DOOR);
                     } else {
                        if (mapGen.getTileAt(x, y) !== TileType.DUNGEON_DOOR) mapGen.setTileAt(x, y, TileType.CAVE_FLOOR);
                     }
                     if (mapGen.getTileAt(x, y-1) !== TileType.CAVE_FLOOR && mapGen.getTileAt(x, y-1) !== TileType.DUNGEON_DOOR) mapGen.setTileAt(x, y-1, TileType.CAVE_WALL);
                     if (mapGen.getTileAt(x, y+1) !== TileType.CAVE_FLOOR && mapGen.getTileAt(x, y+1) !== TileType.DUNGEON_DOOR) mapGen.setTileAt(x, y+1, TileType.CAVE_WALL);
                     x += dx1;
                 }
                 
                 let dy1 = (bestB.cy > y) ? 1 : (bestB.cy < y ? -1 : 0);
                 let doorBY = bestB.cy - (Math.floor(bestB.h/2) + 1) * dy1;
                 let doorBX = bestB.cx - (Math.floor(bestB.w/2) + 1) * dx1;

                 while (y !== bestB.cy) {
                     if (y === doorBY && dy1 !== 0) {
                        mapGen.setTileAt(x, y, TileType.DUNGEON_DOOR);
                     } else {
                        if (mapGen.getTileAt(x, y) !== TileType.DUNGEON_DOOR) mapGen.setTileAt(x, y, TileType.CAVE_FLOOR);
                     }
                     if (mapGen.getTileAt(x-1, y) !== TileType.CAVE_FLOOR && mapGen.getTileAt(x-1, y) !== TileType.DUNGEON_DOOR) mapGen.setTileAt(x-1, y, TileType.CAVE_WALL);
                     if (mapGen.getTileAt(x+1, y) !== TileType.CAVE_FLOOR && mapGen.getTileAt(x+1, y) !== TileType.DUNGEON_DOOR) mapGen.setTileAt(x+1, y, TileType.CAVE_WALL);
                     y += dy1;
                 }
                 
                 // If we didn't place the door on the Y axis because dy1 was 0, but dx1 was not 0, place the entry door on X axis for Room B
                 if (dy1 === 0 && dx1 !== 0) {
                     mapGen.setTileAt(doorBX, bestB.cy, TileType.DUNGEON_DOOR);
                 }
             }
         }
         
         // Start & End stairs
         const startRoom = rooms[0];
         const endRoom = rooms[rooms.length - 1];
         
         if (level > 0) {
             mapGen.setTileAt(startRoom.cx, startRoom.cy, TileType.DUNGEON_STAIRS_UP);
         }
         
         if (level === DungeonConfig.maxDepth - 1) {
             const bossId = `animal_${nextAnimalId++}`;
             const bossConfig = DungeonConfig.bosses[0];
             const boss = new AnimalEntity(bossId, endRoom.cx * mapGen.tileSize + mapGen.tileSize/2, endRoom.cy * mapGen.tileSize + mapGen.tileSize/2, bossConfig.type);
             boss.name = bossConfig.name;
             boss.level = bossConfig.level + level;
             boss.health.max = bossConfig.health + (level * 500); boss.health.current = boss.health.max;
             animals[bossId] = boss;
             
             const chestId = `item_${nextItemId++}`;
             items[chestId] = { id: chestId, name: 'Royal Chest', type: 'chest', slot: ItemSlot.NONE, color: '#f59e0b', stats: { level: 99 }, x: (endRoom.cx+1)*mapGen.tileSize + mapGen.tileSize/2, y: endRoom.cy*mapGen.tileSize + mapGen.tileSize/2 };
         } else {
             mapGen.setTileAt(endRoom.cx, endRoom.cy, TileType.DUNGEON_STAIRS_DOWN);
         }
     }
     
     // Entrance
     mapGen.setTileAt(dungeonStartX - 1, dungeonStartY + 2, TileType.DUNGEON_ENTRANCE);
     
     let placed = false;
     for (let ix = -10; ix <= 10; ix++) {
        for (let iy = -10; iy <= 10; iy++) {
           if (!placed && mapGen.getTileAt(ix, iy) === TileType.MOUNTAIN) {
               mapGen.setTileAt(ix, iy, TileType.DUNGEON_ENTRANCE);
               placed = true;
           }
        }
     }
     if (!placed) mapGen.setTileAt(5, 5, TileType.DUNGEON_ENTRANCE);
  };
// Game State
  let players: Record<string, PlayerEntity> = {};
const registeredUsers: { [username: string]: { password?: string, pid: string } } = {};
let nextGuestId = 1;
  let animals: Record<string, AnimalEntity> = {};
  let boats: Record<string, BoatData> = {};
  let items: Record<string, ItemData> = {};

  let nextItemId = 0;
  let nextAnimalId = 0;

  generateDungeon();

  const generateDrop = (animalType: string, x: number, y: number, isRoyalSource?: boolean) => {
      const item = LootSystem.generateDrop(animalType, x, y, () => `item_${nextItemId++}`, isRoyalSource);
      if (item) {
          items[item.id] = item;
          io.emit('itemDropped', item);
      }
  };

  const getSafeSpawn = (type: string, isPlayer = false, nearX = 0, nearY = 0) => {
     let x = 0, y = 0;
     let isAquatic = false;
     let allowedTiles: TileType[] | null = null;
     
     if (!isPlayer) {
         const def = EntityDatabase[type];
         if (def) {
             isAquatic = def.isAquatic;
             for (const b of Object.values(BiomeData)) {
                 for (const spawner of b.spawners) {
                     if (spawner.type === type) {
                         allowedTiles = spawner.allowedTiles;
                         break;
                     }
                 }
                 if (allowedTiles) break;
             }
         }
     }

     for (let i = 0; i < 200; i++) {
        x = nearX + (Math.random() * 2000 - 1000);
        y = nearY + (Math.random() * 2000 - 1000);
        const tX = Math.floor(x / mapGen.tileSize);
        const tY = Math.floor(y / mapGen.tileSize);
        const tile = mapGen.getTileAt(tX, tY);
        
        if (isPlayer) {
            if (tile === TileType.GRASS || tile === TileType.SAND || tile === TileType.FOREST || tile === TileType.MAGIC_FOREST || tile === TileType.OASIS) return {x, y};
        } else {
            if (allowedTiles && allowedTiles.includes(tile)) {
                return {x, y};
            } else if (!allowedTiles) {
                if (isAquatic && tile === TileType.WATER) return {x, y};
                if (!isAquatic && tile !== TileType.WATER && tile !== TileType.MOUNTAIN && tile !== TileType.GLACIER && tile !== TileType.DUNE) return {x, y};
            }
        }
     }
     
     for (let tx = -20; tx < 20; tx++) {
        for (let ty = -20; ty < 20; ty++) {
           const cx = nearX / mapGen.tileSize + tx;
           const cy = nearY / mapGen.tileSize + ty;
           const tile = mapGen.getTileAt(Math.floor(cx), Math.floor(cy));
           let valid = false;
           if (isPlayer) {
               valid = tile === TileType.GRASS || tile === TileType.SAND || tile === TileType.FOREST || tile === TileType.MAGIC_FOREST || tile === TileType.OASIS;
           } else {
               if (allowedTiles && allowedTiles.includes(tile)) valid = true;
               else if (!allowedTiles && isAquatic && tile === TileType.WATER) valid = true;
               else if (!allowedTiles && !isAquatic && tile !== TileType.WATER && tile !== TileType.MOUNTAIN && tile !== TileType.GLACIER && tile !== TileType.DUNE) valid = true;
           }
           if (valid) {
               return {x: Math.floor(cx) * mapGen.tileSize + mapGen.tileSize/2, y: Math.floor(cy) * mapGen.tileSize + mapGen.tileSize/2};
           }
        }
     }
     return {x: nearX, y: nearY};
  };

  const spawnAnimalNearPlayers = () => {
     const playerIds = Object.keys(players);
     if (playerIds.length === 0) return;
     
     const pId = playerIds[Math.floor(Math.random() * playerIds.length)];
     const p = players[pId];
     
     let x = p.transform.x + (Math.random() * 2000 - 1000);
     let y = p.transform.y + (Math.random() * 2000 - 1000);
     
     if (Math.hypot(x - p.transform.x, y - p.transform.y) < 500) return;

     const tX = Math.floor(x / mapGen.tileSize);
     const tY = Math.floor(y / mapGen.tileSize);
     const tile = mapGen.getTileAt(tX, tY);

     const biome = BiomeSystem.getBiomeForTile(tile);
     if (!biome || biome.spawners.length === 0) return;

     // Randomly pick a spawner based on chance
     const spawner = biome.spawners[Math.floor(Math.random() * biome.spawners.length)];
     if (Math.random() > spawner.spawnChance) return;
     
     if (!spawner.allowedTiles.includes(tile)) return;

     // Check limit
     let count = 0;
     for (const id in animals) {
         if (animals[id].type === spawner.type) count++;
     }
     if (count >= spawner.maxCount) return;

     const id = `animal_${nextAnimalId++}`;
     const animal = new AnimalEntity(id, x, y, spawner.type);
     animals[id] = animal;
     io.emit('animalSpawned', animal.toJSON());
  };

  // Spawn initial boats
  for (let i = 0; i < 3; i++) {
    let x = 0, y = 0;
    for (let attempts = 0; attempts < 500; attempts++) {
       x = Math.random() * 4000 - 2000; // Search wider
       y = Math.random() * 4000 - 2000;
       const tX = Math.floor(x / mapGen.tileSize);
       const tY = Math.floor(y / mapGen.tileSize);
       if (mapGen.getTileAt(tX, tY) === TileType.WATER) {
          boats[`boat_${i}`] = { id: `boat_${i}`, x, y };
          break;
       }
    }
  }

  let lastTime = Date.now();
  setInterval(() => {
    try {
    const now = Date.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;
    
    const playerIds = Object.keys(players);
    if (playerIds.length > 0) {
        for (const id in animals) {
            const a = animals[id];
            let isNearAnyPlayer = false;
            for (const pid of playerIds) {
               const p = players[pid];
               if (Math.hypot(a.transform.x - p.transform.x, a.transform.y - p.transform.y) < 2500) {
                   isNearAnyPlayer = true;
                   break;
               }
            }
            if (!isNearAnyPlayer) {
               delete animals[id];
            }
        }
        
        let spawnAttempts = 0;
        while (Object.keys(animals).length < 50 && spawnAttempts < 25) {
            try { spawnAnimalNearPlayers(); } catch (e) { fs.appendFileSync('spawn_error.log', e.stack + '\n'); }
            spawnAttempts++;
        }
    }

    try { AISystem.update(animals, players, mapGen, io, getSafeSpawn, items); } catch (e) { fs.appendFileSync('ai_error.log', e.stack + '\n'); }
    
    // Check for alpha dog evolution
    for (const pid in players) {
        let dogsOwned = [];
        let alphaExists = false;
        for (const aid in animals) {
            if (animals[aid].ownerId === pid) {
                if (animals[aid].type === 'dog') dogsOwned.push(animals[aid]);
                if (animals[aid].type === 'alpha_dog') alphaExists = true;
            }
        }
        if (!alphaExists && dogsOwned.length >= 2) {
            // Evolve the first dog
            dogsOwned[0].evolveTo('alpha_dog');
            dogsOwned[0].name = "Alpha";
            dogsOwned[0].health.max = 300;
            dogsOwned[0].health.current = 300;
            io.emit('animalEvolved', { id: dogsOwned[0].id, newType: 'alpha_dog' });
        }
    }

    for (const id in animals) {
       animals[id].update(dt, null);
       if (Math.random() < 0.01) console.log(id, animals[id].transform.x, animals[id].transform.vx, dt);
    }
    
    const playersJSON: any = {};
    for (const id in players) playersJSON[id] = players[id].toJSON();
    const animalsJSON: any = {};
    for (const id in animals) animalsJSON[id] = animals[id].toJSON();

    io.volatile.emit('gameState', { players: playersJSON, animals: animalsJSON, boats, items });
    } catch (e) { fs.appendFileSync('loop_error.log', e.stack + '\n'); }
  }, 1000 / 30); // 30 FPS tick

  io.on('connection', (socket: Socket) => {
    let pid = socket.handshake.query.sessionId as string || socket.id;
    console.log(`Player connected: ${pid}`);
    
    if (!players[pid]) { players[pid] = WorldRecipes.spawnPlayer(
      pid,
      `hsl(${Math.random() * 360}, 70%, 50%)`
    );

    const startLoc = getSafeSpawn('player', true, 0, 0);
    players[pid].transform.x = startLoc.x;
    players[pid].transform.y = startLoc.y;
    } else {
        players[pid].isAlive = true;
    }

    const playersJSON: any = {};
    for (const id in players) playersJSON[id] = players[id].toJSON();
    const animalsJSON: any = {};
    for (const id in animals) animalsJSON[id] = animals[id].toJSON();
    
    socket.emit('init', { id: pid, players: playersJSON, animals: animalsJSON, boats, items, mapEdits: mapGen.getModifiedTiles() });
    socket.broadcast.emit('playerJoined', players[pid].toJSON());

    socket.on('devResetServer', () => {
       console.log("Dev reset server triggered");
       players = {};
       animals = {};
       items = {};
       boats = {};
       Object.assign(mapGen, new MapGenerator("default_seed")); // Hacky reset
       io.emit('serverReset'); // Clients should reload
    });
    
    socket.on('joinGame', (data: { gameMode: string, playerClass: string, username?: string, password?: string }) => {
        let finalUsername = data.username || `Guest${nextGuestId++}`;
        
        // Handle auth
        if (registeredUsers[finalUsername]) {
            if (registeredUsers[finalUsername].password && registeredUsers[finalUsername].password !== data.password) {
                socket.emit('authError', 'Incorrect password for this username.');
                return;
            }
            
            const savedPid = registeredUsers[finalUsername].pid;
            if (pid !== savedPid) {
               delete players[pid];
               io.emit('playerLeft', pid);
               pid = savedPid; // Update the closure variable
            }
        } else {
            registeredUsers[finalUsername] = { password: data.password, pid: pid };
        }
        
        // Ensure player exists
        if (!players[pid]) {
             players[pid] = WorldRecipes.spawnPlayer(pid, `hsl(${Math.random() * 360}, 70%, 50%)`);
             const startLoc = getSafeSpawn('player', true, 0, 0);
             players[pid].transform.x = startLoc.x;
             players[pid].transform.y = startLoc.y;
        } else if (players[pid].health.current <= 0) {
             // Reset player if they were dead or if they chose permadeath (restarting)
             players[pid] = WorldRecipes.spawnPlayer(pid, players[pid].color || `hsl(${Math.random() * 360}, 70%, 50%)`);
             const startLoc = getSafeSpawn('player', true, 0, 0);
             players[pid].transform.x = startLoc.x;
             players[pid].transform.y = startLoc.y;
        }
        
        // Update player data
        players[pid].name = finalUsername;
        players[pid].gameMode = (data.gameMode as 'respawn' | 'permadeath') || 'respawn';
        players[pid].playerClass = data.playerClass || 'warrior';
        players[pid].isAlive = true;
        
        socket.emit('authSuccess', { id: pid, username: finalUsername });
        io.emit('playerJoined', players[pid].toJSON());
    });


    socket.on('move', (pos: {x: number, y: number}) => {
      if (players[pid] && players[pid].isAlive) {
        const p = players[pid];
        const checkCollision = (cx: number, cy: number) => {
           for (const pt of [{x: cx - 5, y: cy - 5}, {x: cx + 5, y: cy - 5}, {x: cx - 5, y: cy + 5}, {x: cx + 5, y: cy + 5}]) {
              const tile = mapGen.getTileAt(Math.floor(pt.x / mapGen.tileSize), Math.floor(pt.y / mapGen.tileSize));
              if (tile === TileType.MOUNTAIN || tile === TileType.GLACIER || tile === TileType.DUNE || tile === TileType.CAVE_WALL || tile === TileType.VOID || tile === TileType.DUNGEON_DOOR) return true;
              if (tile === TileType.WATER && !p.isRidingBoat) return true;
              if (tile !== TileType.WATER && p.isRidingBoat) return true;
           }
           return false;
        };
        
        if (!checkCollision(pos.x, pos.y)) {
           console.log("Move accepted");
           p.transform.x = pos.x;
           p.transform.y = pos.y;
           
           if (p.isRidingBoat) {
              const tX = Math.floor(pos.x / mapGen.tileSize);
              const tY = Math.floor(pos.y / mapGen.tileSize);
              if (mapGen.getTileAt(tX, tY) === TileType.WATER) {
                  // Keep boat under player
              } else {
                  // Wait, collision handles this
              }
           }
        }
      }
    });

    socket.on('editMap', (data: {x: number, y: number, type: TileType}) => {
       mapGen.setTileAt(data.x, data.y, data.type);
       io.emit('mapEdited', data);
    });

    socket.on('pickupItem', (data: any) => {
       const itemId = typeof data === 'string' ? data : data.id;
       const p = players[pid];
       if (!p || !p.isAlive) return;
       const item = items[itemId];
       if (item && item.x !== undefined && item.y !== undefined) {
           const dist = Math.hypot(item.x - p.transform.x, item.y - p.transform.y);
           if (dist < 80) {
               p.inventory.push(item);
               delete items[itemId];
           }
       }
    });


    socket.on('processItem', (data: any) => {
       const itemId = typeof data === 'string' ? data : data.id;
       const p = players[pid];
       if (!p || !p.isAlive) return;
       const item = items[itemId];
       if (item && item.type === 'corpse') {
           const dist = Math.hypot(item.x - p.transform.x, item.y - p.transform.y);
           if (dist < 80) {
               delete items[itemId];
               // Generate meat
               const meatId = `item_${nextItemId++}`;
               const meat = {
                   id: meatId,
                   name: 'Fresh Meat',
                   type: 'meat',
                   slot: ItemSlot.NONE,
                   color: '#b91c1c',
                   stats: { heal: 30 },
                   x: p.transform.x,
                   y: p.transform.y
               };
               items[meatId] = meat;
               io.emit('itemDropped', meat);
           }
       }
    });

    
    socket.on('setPackBehavior', (behavior: string) => {
        const p = players[pid];
        if (!p || !p.isAlive) return;
        
        // Ensure whistle is equipped
        const hasWhistle = Object.values(p.equipment || {}).some((i: any) => i && i.type === 'whistle');
        if (hasWhistle) {
            p.packBehavior = behavior;
            io.emit('stateUpdate', { players: { [pid]: p.toJSON() } });
            io.emit('whistleBlown', { id: pid, behavior });
        }
    });

    socket.on('useItem', (data: any) => {
       const itemId = typeof data === 'string' ? data : data.id;
       const p = players[pid];
       if (!p || !p.isAlive) return;
       
       let invIdx = p.inventory.findIndex(i => i.id === itemId);
       let item = p.inventory[invIdx];
       let fromGround = false;
       
       if (!item) {
           item = items[itemId];
           if (item && item.x !== undefined && item.y !== undefined) {
               const dist = Math.hypot(item.x - p.transform.x, item.y - p.transform.y);
               if (dist < 80) {
                   fromGround = true;
               } else {
                   item = null;
               }
           } else {
               item = null;
           }
       }

       if (item) {
           if (item.type === 'meat' || item.type === 'egg') {
               p.health.heal(item.stats.heal || 30);
               if (fromGround) {
                   delete items[itemId];
               } else {
                   p.inventory.splice(invIdx, 1);
               }
               io.emit('stateUpdate', { players: { [pid]: p.toJSON() } });
           } else if (item.type === 'whistle') {
               // Not used to cycle anymore
           }
       }
    });

    socket.on('equipItem', (data: any) => {
       const itemId = typeof data === 'string' ? data : data.id;
       // We ignore hand for now as the server assigns slot based on item.slot
       const p = players[pid];
       if (!p || !p.isAlive) return;
       
       let item = items[itemId];
       if (item && item.x !== undefined && item.y !== undefined) {
           const dist = Math.hypot(item.x - p.transform.x, item.y - p.transform.y);
           if (dist < 80) {
               delete items[itemId];
               if (p.equipment[item.slot]) {
                   p.inventory.push(p.equipment[item.slot] as any);
               }
               p.equipment[item.slot] = item;
               return;
           }
       }
       
       const invIdx = p.inventory.findIndex(i => i.id === itemId);
       if (invIdx >= 0) {
           item = p.inventory.splice(invIdx, 1)[0];
           if (p.equipment[item.slot]) {
               p.inventory.push(p.equipment[item.slot] as any);
           }
           p.equipment[item.slot] = item;
       }
    });


    socket.on('interact', () => {
       const p = players[pid];
       if (!p || !p.isAlive) return;
       
       const tX = Math.floor(p.transform.x / mapGen.tileSize);
       const tY = Math.floor(p.transform.y / mapGen.tileSize);
       
       // Check for Dungeon Entrance
       
       // Check for Dungeon Entrance, Stairs, and Doors
       
       // Check for Dungeon Entrance, Stairs, and Doors
       let onEntrance = false;
       let onStairsDown = false;
       let onStairsUp = false;
       let clickedDoor = null;
       
       for (const pos of [{x: tX, y: tY}, {x: tX+1, y: tY}, {x: tX-1, y: tY}, {x: tX, y: tY+1}, {x: tX, y: tY-1}]) {
           const tile = mapGen.getTileAt(pos.x, pos.y);
           if (tile === TileType.DUNGEON_ENTRANCE) onEntrance = true;
           if (tile === TileType.DUNGEON_STAIRS_DOWN) onStairsDown = true;
           if (tile === TileType.DUNGEON_STAIRS_UP) onStairsUp = true;
           if (tile === TileType.DUNGEON_DOOR && (pos.x !== tX || pos.y !== tY)) clickedDoor = pos;
       }
       
       if (clickedDoor) {
           if (Math.random() < 0.2) {
               // failed to open
               io.emit('playSound', { name: 'door_fail', x: p.transform.x, y: p.transform.y });
           } else {
               mapGen.setTileAt(clickedDoor.x, clickedDoor.y, TileType.DUNGEON_DOOR_OPEN);
               io.emit('mapEdited', {x: clickedDoor.x, y: clickedDoor.y, type: TileType.DUNGEON_DOOR_OPEN});
               io.emit('playSound', { name: 'door_open', x: p.transform.x, y: p.transform.y });
           }
           return;
       }
       
       if (onEntrance) {
           if (tX > 5000) {
               const safe = getSafeSpawn('player', true, 0, 0);
               p.transform.x = safe.x;
               p.transform.y = safe.y;
           } else {
               // Teleport to first room of dungeon
               let spawnX = dungeonStartX + 10;
               let spawnY = dungeonStartY + 10;
               for (let i = 0; i < 100; i++) {
                   for (let j = 0; j < 100; j++) {
                       if (mapGen.getTileAt(dungeonStartX + i, dungeonStartY + j) === TileType.CAVE_FLOOR) {
                           spawnX = dungeonStartX + i; spawnY = dungeonStartY + j; break;
                       }
                   }
                   if (spawnX !== dungeonStartX + 10) break;
               }
               p.transform.x = spawnX * mapGen.tileSize + mapGen.tileSize / 2;
               p.transform.y = spawnY * mapGen.tileSize + mapGen.tileSize / 2;
           }
           io.emit('stateUpdate', { players: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.toJSON()])) });
           return;
       }
       
       if (onStairsDown) {
           // Move to startRoom of NEXT level
           let currentLevel = Math.floor((tX - dungeonStartX) / 2000);
           let nextLevelX = dungeonStartX + (currentLevel + 1) * 2000;
           let spawnX = nextLevelX + 10;
           let spawnY = dungeonStartY + 10;
           for (let i = 0; i < 100; i++) {
               for (let j = 0; j < 100; j++) {
                   if (mapGen.getTileAt(nextLevelX + i, dungeonStartY + j) === TileType.DUNGEON_STAIRS_UP || mapGen.getTileAt(nextLevelX + i, dungeonStartY + j) === TileType.CAVE_FLOOR) {
                       spawnX = nextLevelX + i; spawnY = dungeonStartY + j; break;
                   }
               }
               if (spawnX !== nextLevelX + 10) break;
           }
           p.transform.x = spawnX * mapGen.tileSize + mapGen.tileSize / 2;
           p.transform.y = spawnY * mapGen.tileSize + mapGen.tileSize / 2;
           io.emit('stateUpdate', { players: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.toJSON()])) });
           return;
       }
       
       if (onStairsUp) {
           let currentLevel = Math.floor((tX - dungeonStartX) / 2000);
           if (currentLevel > 0) {
               // We need to find the endRoom of the PREVIOUS level. 
               // Actually, it's easier to just teleport to the startRoom of the prev level for now, 
               // but wait! If we do that, we skip the level. 
               // Since we didn't save endRoom locations, we can't easily find it without scanning.
               // Let's just scan for DUNGEON_STAIRS_DOWN on the previous level!
               let prevLevelX = dungeonStartX + (currentLevel - 1) * 2000;
               let found = false;
               for(let x = prevLevelX; x < prevLevelX + 2000; x++) {
                   for(let y = dungeonStartY; y < dungeonStartY + 2000; y++) {
                       if (mapGen.getTileAt(x, y) === TileType.DUNGEON_STAIRS_DOWN) {
                           p.transform.x = x * mapGen.tileSize + mapGen.tileSize / 2;
                           p.transform.y = y * mapGen.tileSize + mapGen.tileSize / 2;
                           found = true;
                           break;
                       }
                   }
                   if (found) break;
               }
               if (!found) { // fallback
                   p.transform.x -= 2000 * mapGen.tileSize;
               }
           } else {
               // Go back to overworld entrance
               const safe = getSafeSpawn('player', true, 0, 0);
               p.transform.x = safe.x;
               p.transform.y = safe.y;
           }
           io.emit('stateUpdate', { players: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.toJSON()])) });
           return;
       }

       



       if (p.isRidingBoat) {

          const tX = Math.floor(p.transform.x / mapGen.tileSize);
          const tY = Math.floor(p.transform.y / mapGen.tileSize);
          let safeSpot = null;
          for (const pos of [{x: tX+1, y: tY}, {x: tX-1, y: tY}, {x: tX, y: tY+1}, {x: tX, y: tY-1}]) {
             const cTile = mapGen.getTileAt(pos.x, pos.y); if (cTile !== TileType.WATER && cTile !== TileType.MOUNTAIN && cTile !== TileType.GLACIER && cTile !== TileType.DUNE) {
                safeSpot = pos; break;
             }
          }
          if (safeSpot) {
             p.isRidingBoat = false;
             boats[`boat_${Date.now()}`] = { id: `boat_${Date.now()}`, x: p.transform.x, y: p.transform.y };
             p.transform.x = safeSpot.x * mapGen.tileSize + mapGen.tileSize/2;
             p.transform.y = safeSpot.y * mapGen.tileSize + mapGen.tileSize/2;
          }
          return;
       }
       
       for (const bId in boats) {
           const b = boats[bId];
           const dist = Math.hypot(b.x - p.transform.x, b.y - p.transform.y);
           if (dist < 60) {
               p.isRidingBoat = true;
               p.transform.x = b.x;
               p.transform.y = b.y;
               delete boats[bId];
               return;
           }
       }
    });

    socket.on('attack', (data: {targetId: string}) => {
      const p = players[pid];
      if (!p || !p.isAlive) return;
      const damage = p.TotalDamage;

      if (players[data.targetId] && players[data.targetId].isAlive) {
         players[data.targetId].takeDamage(damage);
         if (!players[data.targetId].isAlive) {
            if (players[pid]) players[pid].score += 10;
            io.emit('playerDied', { id: data.targetId, killerId: pid });
            setTimeout(() => {
               if (players[data.targetId]) {
                 if (players[data.targetId].gameMode === 'permadeath') {
                     // Do not auto-respawn. The client must restart the character.
                 } else {
                     players[data.targetId].health.heal(100);
                     players[data.targetId].isAlive = true;
                     const loc = getSafeSpawn('player', true);
                     players[data.targetId].transform.x = loc.x;
                     players[data.targetId].transform.y = loc.y;
                     io.emit('playerRespawned', players[data.targetId].toJSON());
                 }
               }
            }, 3000);
         }
      } else {
        const animal = animals[data.targetId];
        if (animal && animal.isAlive) {
          // Prevent hitting tamed dogs
          if (animal.ownerId) {
              // Either don't let anyone hit any tamed dog, or just owner
              // "u dont want to accidentally hit pet dogs" -> Prevent anyone from hitting it?
              // Let's prevent owner from hitting it.
              if (animal.ownerId === pid) return;
              if (animal.type === 'dog') return; // protect all pet dogs
          }
          animal.takeDamage(damage);
          if (!animal.isAlive) {
             if (players[pid]) players[pid].score += 1;
             
             // Check if it was a named/royal monster
             const isRoyal = animal.name !== undefined && animal.name.length > 0;
             generateDrop(animal.type, animal.transform.x, animal.transform.y, isRoyal);
             
             setTimeout(() => {
                if (animals[data.targetId]) {
                   delete animals[data.targetId];
                }
             }, 5000); // remove corpse after 5s
          }
        }
      }
    });

    socket.on('nameMonster', (data: {targetId: string, name: string}) => {
       const p = players[pid];
       if (!p || !p.isAlive) return;
       const animal = animals[data.targetId];
       if (!animal || !animal.isAlive) return;
       
       if (p.mana >= 50) {
           p.mana -= 50;
           animal.name = data.name;
           if (!animal.level) animal.level = 1;
           animal.level += 1;
           animal.health.heal(100);
           
           // Notify everyone
           io.emit('stateUpdate', {
             players: Object.fromEntries(Object.entries(players).map(([id, p]) => [id, p.toJSON()])),
             animals: Object.fromEntries(Object.entries(animals).map(([id, a]) => [id, a.toJSON()])),
             items,
             boats
           });
       }
    });

    socket.on('disconnect', () => {
      console.log(`Player disconnected: ${pid}`);
      if (players[pid]) {
          // just leave them in memory for now so they don't lose progress on reload
          players[pid].isAlive = false;
          io.emit('playerLeft', pid);
      }
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', players: Object.keys(players).length });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(console.error);
