import { AnimalEntity, AnimalState } from '../entities/AnimalEntity';
import { PlayerEntity } from '../entities/PlayerEntity';
import { Server } from 'socket.io';
import { MapGenerator, TileType } from '../MapGenerator';
import { Faction, getRelation } from '../symmetries/Factions';
import { EntityDatabase } from '../data/EntityData';
import { PathfindingSystem } from './PathfindingSystem';

export class AISystem {
  private static paths = new WeakMap<any, any>();
  
  private static navigateTowards(a: any, targetX: number, targetY: number, speed: number, mapGen: any, impassableTiles: any) {
      const aTX = Math.floor(a.transform.x / mapGen.tileSize);
      const aTY = Math.floor(a.transform.y / mapGen.tileSize);
      const tTX = Math.floor(targetX / mapGen.tileSize);
      const tTY = Math.floor(targetY / mapGen.tileSize);
      
      const dist = Math.hypot(targetX - a.transform.x, targetY - a.transform.y);
      if (dist < mapGen.tileSize) {
          // just go direct
          a.transform.setVelocityFromAngle(Math.atan2(targetY - a.transform.y, targetX - a.transform.x), speed);
          return;
      }

      // Check if we already have a path
      let path = this.paths.get(a);
      if (!path || path.length === 0 || Math.random() < 0.05) { // repath occasionally
          path = PathfindingSystem.findPath(mapGen, aTX, aTY, tTX, tTY, 40, { impassableTiles });
          if (path && path.length > 0) {
              this.paths.set(a, path);
          } else {
              this.paths.set(a, []); // stuck
              a.transform.setVelocityFromAngle(Math.atan2(targetY - a.transform.y, targetX - a.transform.x), speed * 0.5); // try direct slowly
              return;
          }
      }

      if (path && path.length > 0) {
          const nextNode = path[0];
          const nx = nextNode.x * mapGen.tileSize + mapGen.tileSize / 2;
          const ny = nextNode.y * mapGen.tileSize + mapGen.tileSize / 2;
          const ndist = Math.hypot(nx - a.transform.x, ny - a.transform.y);
          if (ndist < 10) {
              path.shift(); // Reached node
          } else {
              a.transform.setVelocityFromAngle(Math.atan2(ny - a.transform.y, nx - a.transform.x), speed);
          }
      }
  }

  public static update(
    animals: Record<string, AnimalEntity>,
    players: Record<string, PlayerEntity>,
    mapGen: MapGenerator,
    io: Server,
    getSafeSpawn: (type: string, isPlayer?: boolean, nearX?: number, nearY?: number) => { x: number, y: number },
    items: Record<string, any>
  ) {
    const impassableTiles = new Set<string>();
    for (const aid in animals) {
        const a = animals[aid];
        const def = EntityDatabase[a.type];
        if (def && def.impassable && a.isAlive) {
            const tx = Math.floor(a.transform.x / mapGen.tileSize);
            const ty = Math.floor(a.transform.y / mapGen.tileSize);
            impassableTiles.add(`${tx},${ty}`);
        }
    }

    for (const id in animals) {
      const a = animals[id];
      if (!a.isAlive) continue;
      
      const def = EntityDatabase[a.type] || EntityDatabase['cow'];
      let packBehavior = 'guard';
      if (a.ownerId && players[a.ownerId]) {
          packBehavior = players[a.ownerId].packBehavior || 'guard';
      }
      const behavior = def.behavior;

      // Ensure entity stays in its allowed habitat
      const tileX = Math.floor(a.transform.x / mapGen.tileSize);
      const tileY = Math.floor(a.transform.y / mapGen.tileSize);
      const currentTile = mapGen.getTileAt(tileX, tileY);
      
      if (def.isAquatic && currentTile !== TileType.WATER) {
          if (a.transform.vx === 0 && a.transform.vy === 0) {
             a.transform.setVelocityFromAngle(a.transform.facing + Math.PI, behavior.speed);
          } else {
             a.transform.x -= a.transform.vx * 0.1;
             a.transform.y -= a.transform.vy * 0.1;
             a.transform.setVelocityFromAngle(a.transform.facing + Math.PI, behavior.speed);
          }
          a.state = AnimalState.WANDER;
          a.stateTimer = 1;
          continue;
      }  else if (!def.isAquatic && (currentTile === TileType.WATER || currentTile === TileType.MOUNTAIN || currentTile === TileType.CAVE_WALL || currentTile === TileType.VOID || currentTile === TileType.DUNGEON_DOOR)) {
          // Push back to land
          a.transform.x -= a.transform.vx * 0.05;
          a.transform.y -= a.transform.vy * 0.05;
          a.transform.setVelocityFromAngle(a.transform.facing + Math.PI, behavior.speed);
          continue;
      }

      if (a.stateTimer > 0 && a.state !== AnimalState.PURSUE && a.state !== AnimalState.EAT) {
          // Waiting or wandering
          continue;
      }

      let closestTargetDist = behavior.aggroRange;
      let closestTargetId = null;
      let targetX = 0, targetY = 0;
      let isPlayerTarget = false;

      // Find players if aggressive
      if (behavior.aggroRange > 0) {
          for (const pid in players) {
            const p = players[pid];
            if (!p.isAlive) continue;
            
            const dist = Math.hypot(p.transform.x - a.transform.x, p.transform.y - a.transform.y);
            
            // Dog taming and following logic
            if (behavior.canBeTamed) {
               if (!a.ownerId && dist < 100) {
                   a.ownerId = pid;
                   a.faction = Faction.PLAYER;
                   io.emit('animalBark', { id: a.id, type: a.type });
                   packBehavior = players[pid].packBehavior || 'guard';
               }
               if (a.ownerId === pid) {
                   if (dist > 80 && packBehavior !== 'stop_and_guard' && packBehavior !== 'stop_and_strike') {
                       closestTargetDist = dist;
                       closestTargetId = pid;
                       targetX = p.transform.x; targetY = p.transform.y;
                       isPlayerTarget = true;
                       break;
                   }
               }
            }
            
            if (behavior.canBeTamed && a.ownerId === pid) continue;
            if (behavior.canBeTamed && a.ownerId && p.faction === Faction.PLAYER) continue;

            const pTileX = Math.floor(p.transform.x / mapGen.tileSize);
            const pTileY = Math.floor(p.transform.y / mapGen.tileSize);
            const pTile = mapGen.getTileAt(pTileX, pTileY);
            
            if (def.isAquatic && pTile !== TileType.WATER) continue;
            if (!def.isAquatic && (pTile === TileType.WATER || pTile === TileType.MOUNTAIN || pTile === TileType.GLACIER || pTile === TileType.DUNE || pTile === TileType.CAVE_WALL || pTile === TileType.VOID || pTile === TileType.DUNGEON_DOOR)) continue;

            if (getRelation(a.faction, p.faction) === 'hostile') {
               if (dist < closestTargetDist) {
                 closestTargetDist = dist;
                 closestTargetId = pid;
                 targetX = p.transform.x; targetY = p.transform.y;
                 isPlayerTarget = true;
               }
            }
          }
      }

      // Find animals to attack
      if (!closestTargetId || (behavior.canBeTamed && a.ownerId)) {
          let ignoreAnimals = false;
          if (closestTargetId && behavior.canBeTamed && a.ownerId) {
              if (closestTargetDist > 150 && packBehavior !== 'strike_all' && packBehavior !== 'stop_and_strike') {
                 ignoreAnimals = true; // Break off combat and follow if player is leaving
              } else {
                 closestTargetId = null;
                 closestTargetDist = behavior.aggroRange;
                 if (packBehavior !== 'strike_all' && packBehavior !== 'stop_and_strike') {
                     ignoreAnimals = true; // Only attack if commanded to strike
                 }
              }
          }
          
          if (!ignoreAnimals && behavior.aggroRange > 0 && !(packBehavior === 'stop_and_guard')) {
            for (const aid in animals) {
               if (aid === id) continue;
               const other = animals[aid];
               if (!other.isAlive) continue;
                
               const pTileX = Math.floor(other.transform.x / mapGen.tileSize);
               const pTileY = Math.floor(other.transform.y / mapGen.tileSize);
               const pTile = mapGen.getTileAt(pTileX, pTileY);
               
               if (def.isAquatic && pTile !== TileType.WATER) continue;
               if (!def.isAquatic && (pTile === TileType.WATER || pTile === TileType.MOUNTAIN || pTile === TileType.GLACIER || pTile === TileType.DUNE || pTile === TileType.CAVE_WALL || pTile === TileType.VOID || pTile === TileType.DUNGEON_DOOR)) continue;
                
               let hostile = getRelation(a.faction, other.faction) === 'hostile';
               if (a.ownerId && other.ownerId) hostile = false;
               if (behavior.canBeTamed && a.ownerId && other.faction === Faction.CARNIVORE) hostile = true;
                
               if (hostile) {
                 const dist = Math.hypot(other.transform.x - a.transform.x, other.transform.y - a.transform.y);
                 if (dist < closestTargetDist) {
                   closestTargetDist = dist;
                   closestTargetId = aid;
                   targetX = other.transform.x; targetY = other.transform.y;
                   isPlayerTarget = false;
                 }
               }
            }
          }
      }
      
      
      // Handle eat_corpses
      if (behavior.canBeTamed && packBehavior === 'eat_corpses') {
           let closestCorpseDist = 500;
           let closestCorpseId = null;
           let cX = 0, cY = 0;
           for (const iid in items) {
               const it = items[iid];
               if (it.type === 'corpse' || it.type === 'meat' || (it.type === 'egg' && a.type !== 'turtle')) {
                   const dist = Math.hypot(it.x - a.transform.x, it.y - a.transform.y);
                   if (dist < closestCorpseDist) {
                       closestCorpseDist = dist;
                       closestCorpseId = iid;
                       cX = it.x; cY = it.y;
                   }
               }
           }
           if (closestCorpseId) {
               if (closestCorpseDist < 50) {
                   // Eat it
                   a.health.heal(50);
                   delete items[closestCorpseId];
               } else {
                   closestTargetDist = closestCorpseDist;
                   closestTargetId = "item_" + closestCorpseId; // dummy id to trigger pursue
                   targetX = cX; targetY = cY;
                   isPlayerTarget = false;
               }
           }
      }

      if (behavior.fleeThreshold && a.health.current < behavior.fleeThreshold && closestTargetId) {
           a.state = AnimalState.FLEE;
           a.transform.setVelocityFromAngle(Math.atan2(a.transform.y - targetY, a.transform.x - targetX), behavior.speed * 1.2);
           continue;
      }

      if (closestTargetId) {
          a.targetId = closestTargetId;
          const attackRange = (behavior.canBeTamed && isPlayerTarget && a.ownerId === closestTargetId) ? 100 : behavior.attackRange;
          
          if (behavior.canBeTamed && isPlayerTarget && a.ownerId === closestTargetId) {
              a.state = AnimalState.PURSUE;
              this.navigateTowards(a, targetX, targetY, behavior.speed, mapGen, impassableTiles);
              if (closestTargetDist < attackRange) {
                  a.state = AnimalState.IDLE;
                  a.transform.setVelocityFromAngle(a.transform.facing, 0);
              }
          } else {
             let isLunging = false;
             
             if (a.type === 'necromancer') {
                 // Necromancer specific logic
                 if (Math.random() < 0.05 && a.health.current < a.health.max) {
                     // Heal
                     a.health.heal(20);
                     io.emit('bossCast', { id: a.id, type: 'heal' });
                 } else if (Math.random() < 0.02) {
                     // Raise dead
                     let corpseFound = null;
                     for (const iid in items) {
                         if (items[iid].type === 'corpse') {
                             const dist = Math.hypot(items[iid].x - a.transform.x, items[iid].y - a.transform.y);
                             if (dist < 400) {
                                 corpseFound = iid; break;
                             }
                         }
                     }
                     if (corpseFound) {
                         const corpse = items[corpseFound];
                         delete items[corpseFound];
                         const skelId = `animal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                         const skeleton = new AnimalEntity(skelId, corpse.x, corpse.y, 'skeleton');
                         animals[skelId] = skeleton;
                         io.emit('bossCast', { id: a.id, type: 'raise_dead' });
                     }
                 } else if (Math.random() < 0.05 && closestTargetDist < attackRange) {
                     // Curse
                     if (isPlayerTarget) {
                         const p = players[closestTargetId];
                         if (p && p.isAlive) {
                             p.health.takeDamage(10);
                             p.mana = Math.max(0, p.mana - 10);
                             io.emit('bossCast', { id: a.id, type: 'curse', targetX: p.transform.x, targetY: p.transform.y });
                         }
                     }
                 }
             }

             if (a.type === 'wolf' || a.type === 'dog' || a.type === 'alpha_dog') {

                 let othersLunging = 0;
                 for (const aid in animals) {
                     if (aid !== a.id && animals[aid].type === a.type && animals[aid].targetId === closestTargetId && animals[aid].isAlive) {
                         if (animals[aid].state === AnimalState.LUNGE) othersLunging++;
                     }
                 }
                 
                 if (a.state !== AnimalState.LUNGE && a.lungeCooldown <= 0 && othersLunging < 2 && closestTargetDist < attackRange * 3) {
                     a.state = AnimalState.LUNGE;
                     a.lungeCooldown = 2 + Math.random() * 2; 
                     if (Math.random() < 0.15 && packBehavior !== 'quiet') io.emit('animalBark', { id: a.id, type: a.type });
                 }
                 
                 if (a.state === AnimalState.LUNGE) {
                     isLunging = true;
                     a.transform.setVelocityFromAngle(Math.atan2(targetY - a.transform.y, targetX - a.transform.x), behavior.speed * 1.8);
                 } else {
                     a.state = AnimalState.CIRCLE;
                     a.circleAngle += 0.05; 
                     const orbitDist = attackRange + 40;
                     const idealX = targetX + Math.cos(a.circleAngle) * orbitDist;
                     const idealY = targetY + Math.sin(a.circleAngle) * orbitDist;
                     const angle = Math.atan2(idealY - a.transform.y, idealX - a.transform.x);
                     a.transform.setVelocityFromAngle(angle, behavior.speed);
                 }
             } else {
                 a.state = AnimalState.PURSUE;
                 this.navigateTowards(a, targetX, targetY, behavior.speed, mapGen, impassableTiles);
             }
             
             if (closestTargetDist < attackRange) {
                 if (isLunging || (a.type !== 'wolf' && a.type !== 'dog')) {
                     a.state = AnimalState.EAT;
                     a.transform.setVelocityFromAngle(a.transform.facing, 0);
                     
                     if (isPlayerTarget && Math.random() < 0.1) {
                         const target = players[closestTargetId];
                         target.takeDamage(behavior.damageToPlayer);
                         if (!target.isAlive) {


                             a.kills = (a.kills || 0) + 1;
                             a.level = a.level || 1;
                             if (a.kills >= a.level * 2) {
                                 a.level++;
                                 a.health.max = Math.floor(a.health.max * 1.2); // +20% HP
                                 a.health.current = a.health.max;
                                 a.kills = 0;
                             }

                             a.level = a.level || 1;
                             if (a.kills >= a.level * 2) {
                                 a.level++;
                                 a.health.max = Math.floor(a.health.max * 1.2); // +20% HP
                                 a.health.current = a.health.max;
                                 a.kills = 0;
                             }

                             io.emit('playerDied', { id: closestTargetId, killerId: a.type });
                             setTimeout(() => {
                                 if (players[closestTargetId]) {
                                     if (players[closestTargetId].gameMode === 'permadeath') {
                                         // Do not auto-respawn
                                     } else {
                                         players[closestTargetId].health.heal(100);
                                         players[closestTargetId].isAlive = true;
                                         const loc = getSafeSpawn('player', true, 0, 0); // Respawn in overworld
                                         players[closestTargetId].transform.x = loc.x;
                                         players[closestTargetId].transform.y = loc.y;
                                         io.emit('playerRespawned', players[closestTargetId].toJSON());
                                     }
                                 }
                             }, 3000);
                         }
                     } else if (!isPlayerTarget && Math.random() < 0.1) {
                         const target = animals[closestTargetId];
                         target.takeDamage(behavior.damageToAnimal);
                         if (!target.isAlive) {
                             a.kills = (a.kills || 0) + 1;
                             if (def.evolutionKillsRequired && a.kills >= def.evolutionKillsRequired && def.evolvesTo) {
                                 a.evolveTo(def.evolvesTo);
                                 a.kills = 0;
                                 io.emit('animalEvolved', { id: a.id, newType: def.evolvesTo });
                             } else {
                                 a.level = a.level || 1;
                                 if (a.kills >= a.level * 2) {
                                     a.level++;
                                     a.health.max = Math.floor(a.health.max * 1.2);
                                     a.health.current = a.health.max;
                                     a.kills = 0;
                                 }
                             }
                             setTimeout(() => {
                                 if (animals[closestTargetId]) {
                                     delete animals[closestTargetId];
                                 }
                             }, 5000);
                         }
                     }
                     if (isLunging) {
                        a.state = AnimalState.CIRCLE; // Fall back after hitting
                     }
                 }
             }
          }
      } else {
          a.targetId = null;
          if (a.state === AnimalState.WANDER && a.wanderTarget) {
              this.navigateTowards(a, a.wanderTarget.x, a.wanderTarget.y, behavior.speed * 0.5, mapGen, impassableTiles);
          }
          if (a.state === AnimalState.PURSUE || a.state === AnimalState.EAT || a.state === AnimalState.FLEE || a.state === AnimalState.CIRCLE || a.state === AnimalState.LUNGE || a.stateTimer <= 0) {
             a.state = Math.random() > 0.4 ? AnimalState.WANDER : AnimalState.IDLE;
             a.stateTimer = Math.random() * 2 + 1;
             if (a.state === AnimalState.WANDER) {
                if (a.type === 'turtle' && Math.random() < 0.2) {
                    const tX = Math.floor(a.transform.x / mapGen.tileSize);
                    const tY = Math.floor(a.transform.y / mapGen.tileSize);
                    if (mapGen.getTileAt(tX, tY) === 1) { // 1 is TileType.SAND
                        const eggId = 'item_' + Date.now() + '_' + Math.floor(Math.random()*1000);
                        items[eggId] = {
                            id: eggId,
                            name: 'Turtle Egg',
                            type: 'egg',
                            slot: 'none',
                            color: '#fdf6e3',
                            stats: {},
                            x: a.transform.x,
                            y: a.transform.y,
                            hatchTimer: 300 // 5 minutes approx (300 seconds), actually let's say 30 seconds for gameplay testing
                        };
                        io.emit('itemDropped', items[eggId]);
                    }
                }
                const speed = behavior.speed * 0.5;
                const angle = Math.random() * Math.PI * 2;
                const dist = Math.random() * 200 + 100;
                const tx = a.transform.x + Math.cos(angle) * dist;
                const ty = a.transform.y + Math.sin(angle) * dist;
                // clear path so it repaths to the new target
                this.paths.set(a, []);
                a.wanderTarget = {x: tx, y: ty};
             } else {
                a.transform.setVelocityFromAngle(0, 0);
             }
          }
      }
    }
  }
}
