import { io, Socket } from 'socket.io-client';
import { MapGenerator, TileType } from './MapGenerator';
import { GameStateData, PlayerData, AnimalData, ItemData } from './Entities';

import { SoundEngine } from './SoundEngine';
import { PathfindingSystem } from './systems/PathfindingSystem';

export class GameEngine {
  public autoLootTarget: string | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private mapGen: MapGenerator;
  private mapPatterns?: Map<TileType, CanvasPattern>;
  private socket: Socket;
  private soundEngine = new SoundEngine();
  
  // Camera state
  private camera = { x: 0, y: 0, zoom: 1 };
  
  // Game state
  private gameState: GameStateData = { players: {}, animals: {}, boats: {}, items: {} };
  private myId: string | null = null;
  private previousAnimalStates: Record<string, number> = {};
  
  // Input state
  private keys: Record<string, boolean> = {};
  
  // Click-to-move path
  private targetPath: {x: number, y: number}[] = [];
  private autoAttackTargetId: string | null = null;
  
  // Callbacks for UI
  public onStateUpdate?: (state: GameStateData, myId: string | null) => void;
  public onDeath?: (killerId: string) => void;
  public onRespawn?: () => void;
  public onSelfClicked?: () => void;
  public onLootClicked?: () => void;

  private isRunning = false;
  
  // For interaction/attack
  private lastAttackTime = 0;

  // Editor state
  public isEditorMode = false;
  public currentEditorBrush = TileType.WATER;
  public visitedTiles: Set<string> = new Set();
  public visibleTiles: Set<string> = new Set();
  public perception: number = 8;

  constructor(canvas: HTMLCanvasElement, seed: string = 'default_seed') {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.mapGen = new MapGenerator(seed);
    this.loadMapState();
    
    // Connect socket
        // Connect socket
    let sessionId = localStorage.getItem('playerSessionId');
    if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2, 15);
        localStorage.setItem('playerSessionId', sessionId);
    }
    this.socket = io({ query: { sessionId } });

    this.setupSocket();
    this.setupInputs();
  }

  public initSound() {
    this.soundEngine.init();
  }

  private setupSocket() {
    
    this.socket.on('zoneTransition', (data: any) => {
        // Re-init map
        this.mapGen = new MapGenerator(data.seed);
        if (data.mapEdits) {
            this.mapGen.loadModifiedTiles(data.mapEdits);
            this.saveMapState();
        }
        this.gameState.players = data.players;
        this.gameState.animals = data.animals;
        this.gameState.items = data.items || {};
        
        
        if (this.onStateUpdate) this.onStateUpdate(this.gameState, this.myId);
    });

    this.socket.on('init', (data: { id: string, players: any, animals: any, boats: any, items: any, mapEdits?: any }) => {
      this.myId = data.id;
      this.gameState.players = data.players;
      this.gameState.animals = data.animals;
      this.gameState.items = data.items || {};
      if (data.mapEdits) {
          this.mapGen.loadModifiedTiles(data.mapEdits);
          this.saveMapState();
      }
      if (this.onStateUpdate) this.onStateUpdate(this.gameState, this.myId);
    });

    this.socket.on('itemDropped', (item: any) => {
       this.gameState.items[item.id] = item;
    });

    this.socket.on('mapEdited', (data: { x: number, y: number, type: number }) => {
       this.mapGen.setTileAt(data.x, data.y, data.type);
       this.saveMapState();
    });

    this.socket.on('gameState', (data: GameStateData) => {
      // Save local player position to avoid jitter from server updates
      let myLocalX, myLocalY, oldRidingBoat;
      if (this.myId && this.gameState.players[this.myId]) {
         myLocalX = this.gameState.players[this.myId].x;
         myLocalY = this.gameState.players[this.myId].y;
         oldRidingBoat = this.gameState.players[this.myId].isRidingBoat;
      }
      
      this.gameState = data;
      
      // Check for animal state changes
      for (const [id, a] of Object.entries(this.gameState.animals)) {
         if (this.previousAnimalStates[id] !== undefined) {
            const oldState = this.previousAnimalStates[id];
            if (oldState !== a.state) {
               // If transitioned to PURSUE (3) or EAT (4)
               if ((a.state === 3 || a.state === 4) && oldState !== 3 && oldState !== 4) {
                  // Only play if close to us
                  if (this.myId && this.gameState.players[this.myId]) {
                     const me = this.gameState.players[this.myId];
                     const dist = Math.hypot(a.x - me.x, a.y - me.y);
                     if (dist < 400) {
                        if (a.type === 'wolf') this.soundEngine.playWolfGrowl();
                        if (a.type === 'fox') this.soundEngine.playFoxBark();
                        if (a.type === 'cow') this.soundEngine.playCowMoo();
                        // No auto dog bark on pursue, they pursue the owner constantly.
                     }
                  }
               }
            }
         }
         this.previousAnimalStates[id] = a.state;
      }
      
      if (this.myId && this.gameState.players[this.myId] && myLocalX !== undefined && myLocalY !== undefined) {
         const serverX = this.gameState.players[this.myId].x;
         const serverY = this.gameState.players[this.myId].y;
         const newRidingBoat = this.gameState.players[this.myId].isRidingBoat;
         if (Math.hypot(serverX - myLocalX, serverY - myLocalY) > 150 || oldRidingBoat !== newRidingBoat) {
            // Trust server (e.g. after teleport or dismount)
            this.targetPath = []; // Cancel any movement queue
         } else {
            this.gameState.players[this.myId].x = myLocalX;
            this.gameState.players[this.myId].y = myLocalY;
         }
      }
      
      if (this.onStateUpdate) this.onStateUpdate(this.gameState, this.myId);
    });

    this.socket.on('playerDied', (data: { id: string, killerId: string }) => {
      if (data.id === this.myId) {
        if (this.onDeath) this.onDeath(data.killerId);
      }
    });
    
    this.socket.on('playerRespawned', (data: any) => {
      if (data.id === this.myId) {
        if (this.onRespawn) this.onRespawn();
      }
    });

    this.socket.on('playSound', (data: { type: string, x: number, y: number }) => {
      if (!this.myId || !this.gameState.players[this.myId]) return;
      const me = this.gameState.players[this.myId];
      if (Math.hypot(data.x - me.x, data.y - me.y) < 600) {
          if (data.type === 'door_open') this.soundEngine.playDoorOpen();
          if (data.type === 'door_stuck') this.soundEngine.playDoorStuck();
      }
    });
    
    this.socket.on('animalBark', (data: { id: string, type: string }) => {
      if (!this.myId || !this.gameState.players[this.myId]) return;
      const me = this.gameState.players[this.myId];
      const a = this.gameState.animals[data.id];
      if (a && Math.hypot(a.x - me.x, a.y - me.y) < 600) {
          if (data.type === 'wolf') this.soundEngine.playWolfGrowl();
          if (data.type === 'fox') this.soundEngine.playFoxBark();
          if (data.type === 'cow') this.soundEngine.playCowMoo();
          if (data.type === 'dog' || data.type === 'alpha_dog') this.soundEngine.playDogBark();
      }
    });
    
    
    this.socket.on('whistleBlown', (data: any) => {
        if (!this.myId || !this.gameState.players[this.myId]) return;
        const me = this.gameState.players[this.myId];
        const p = this.gameState.players[data.id];
        if (p && Math.hypot(p.x - me.x, p.y - me.y) < 1000) {
            this.soundEngine.playWhistle(data.behavior);
        }
        
        // Visual effect
        if (p) {
             for (let i = 0; i < 15; i++) {
                 
             }
        }
    });

    this.socket.on('bossCast', (data: any) => {
        // Visual effect
        const boss = this.gameState.animals[data.id];
        if (boss) {
             let color = '#fff';
             if (data.type === 'heal') color = '#22c55e';
             else if (data.type === 'raise_dead') color = '#9333ea';
             else if (data.type === 'curse') color = '#ef4444';
             
             for (let i = 0; i < 20; i++) {
                 
             }
        }
        
        if (data.type === 'curse' && data.targetX) {
             for (let i = 0; i < 30; i++) {
                 
             }
        }
    });
  }

  private setupInputs() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
      if (e.key === ' ') {
        this.attemptAttack();
      }
      if (e.key.toLowerCase() === 'e') {
        this.socket.emit('interact');
      }
      if (e.key.toLowerCase() === 'n') {
        this.attemptNameMonster();
      }
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });

    // Zooming (mouse wheel)
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomAmount = e.deltaY * -0.001;
      this.camera.zoom = Math.min(Math.max(0.5, this.camera.zoom + zoomAmount), 3);
    });
    
    // Pinch zoom and panning for touch
    let initialPinchDist = 0;
    let initialZoom = 1;
    
    this.canvas.addEventListener('touchstart', (e) => {
      if (e.cancelable) e.preventDefault();

      if (e.touches.length === 2) {
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        initialZoom = this.camera.zoom;
      } else if (e.touches.length === 1) {
        const t = e.touches[0];
        if (this.isEditorMode) {
           this.handleEditorClick(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
        } else {
           this.handleTapToMove(t.clientX, t.clientY);
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();

      if (e.touches.length >= 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const scale = dist / initialPinchDist;
        this.camera.zoom = Math.min(Math.max(0.5, initialZoom * scale), 3);
      }
    }, { passive: false });
    
    // Mouse click to attack or edit
    this.canvas.addEventListener('mousedown', (e) => {
      if (this.isEditorMode) {
        this.handleEditorClick(e);
      } else {
        this.handleTapToMove(e.clientX, e.clientY);
      }
    });
    
    // Editor drag
    this.canvas.addEventListener('mousemove', (e) => {
       if (this.isEditorMode && e.buttons === 1) {
          this.handleEditorClick(e);
       }
    });
  }

  private handleTapToMove(clientX: number, clientY: number) {
    if (!this.myId || !this.gameState.players[this.myId]?.isAlive) return;
    
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = clientX - rect.left;
    const mouseY = clientY - rect.top;
    
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    const worldX = (mouseX - width/2) / this.camera.zoom + this.camera.x;
    const worldY = (mouseY - height/2) / this.camera.zoom + this.camera.y;
    
    // Check if clicked on an enemy
    const attackRange = 80;
    let targetEnemy = null;
    
    // Check if clicked an item
    for (const item of Object.values(this.gameState.items)) {
        if (!this.isEditorMode && !this.visibleTiles.has(`${Math.floor(item.x!/this.mapGen.tileSize)},${Math.floor(item.y!/this.mapGen.tileSize)}`)) continue;
        if (!this.isEditorMode && !this.visibleTiles.has(`${Math.floor(item.x!/this.mapGen.tileSize)},${Math.floor(item.y!/this.mapGen.tileSize)}`)) continue;
        if (!this.isEditorMode && !this.visibleTiles.has(`${Math.floor(item.x!/this.mapGen.tileSize)},${Math.floor(item.y!/this.mapGen.tileSize)}`)) continue;
       if (item.x !== undefined && item.y !== undefined) {
           if (Math.hypot(item.x - worldX, item.y - worldY) < 50) {
               const me = this.gameState.players[this.myId!];
               if (me && Math.hypot(item.x - me.x, item.y - me.y) < 75) {
                   if (this.onLootClicked) this.onLootClicked();
               } else {
                   this.autoLootTarget = item.id;
                   this.targetPath = [{x: item.x, y: item.y}];
               }
           }
       }
    }
    
    for (const [id, p] of Object.entries(this.gameState.players)) {
      if (id !== this.myId && p.isAlive && Math.hypot(p.x - worldX, p.y - worldY) < 30) {
        targetEnemy = id;
      }
    }
    for (const [id, a] of Object.entries(this.gameState.animals)) {
      if (a.state !== 5 && Math.hypot(a.x - worldX, a.y - worldY) < 30) {
        targetEnemy = id;
      }
    }
    
    const me = this.gameState.players[this.myId];
    if (me && Math.hypot(worldX - me.x, worldY - me.y) < 30) {
        this.interact();
        if (this.onSelfClicked) this.onSelfClicked();
        return;
    }
    
    const clickTx = Math.floor(worldX / this.mapGen.tileSize);
    const clickTy = Math.floor(worldY / this.mapGen.tileSize);
    if (this.mapGen.getTileAt(clickTx, clickTy) === 19) { // TileType.DUNGEON_DOOR is 19
        if (Math.hypot(worldX - me.x, worldY - me.y) < this.mapGen.tileSize * 2) {
            this.interact();
            return;
        }
    }
    
    if (targetEnemy) {
        this.autoAttackTargetId = targetEnemy;
        if (Math.hypot(worldX - me.x, worldY - me.y) < attackRange) {
           this.attemptAttack(targetEnemy);
        }
        return;
    }
    
    this.autoAttackTargetId = null;

    const startX = Math.floor(me.x / this.mapGen.tileSize);
    const startY = Math.floor(me.y / this.mapGen.tileSize);
    const endX = Math.floor(worldX / this.mapGen.tileSize);
    const endY = Math.floor(worldY / this.mapGen.tileSize);
    
    const path = PathfindingSystem.findPath(this.mapGen, startX, startY, endX, endY, 100, { isRidingBoat: me.isRidingBoat });
    if (path && path.length > 0) {
       if (path.length > 1 && path[0].x === startX && path[0].y === startY) {
           path.shift();
       }
       // Convert path to world coords
       this.targetPath = path.map(p => ({
         x: p.x * this.mapGen.tileSize + this.mapGen.tileSize/2,
         y: p.y * this.mapGen.tileSize + this.mapGen.tileSize/2
       }));
    } else {
       // Just line of sight or direct move if no path
       this.targetPath = [{x: worldX, y: worldY}];
    }
  }

  private handleEditorClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert screen coordinates to world coordinates
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    // Reverse the camera transform
    const worldX = (mouseX - width/2) / this.camera.zoom + this.camera.x;
    const worldY = (mouseY - height/2) / this.camera.zoom + this.camera.y;
    
    const tileX = Math.floor(worldX / this.mapGen.tileSize);
    const tileY = Math.floor(worldY / this.mapGen.tileSize);
    
    this.mapGen.setTileAt(tileX, tileY, this.currentEditorBrush);
    this.saveMapState();
    this.socket.emit('editMap', { tileX, tileY, tileType: this.currentEditorBrush });
  }

  private saveMapState() {
    try {
      localStorage.setItem('wildlands_map', JSON.stringify(this.mapGen.getModifiedTiles()));
    } catch (e) {
      console.warn("Could not save map");
    }
  }

  private loadMapState() {
    try {
      const data = localStorage.getItem('wildlands_map');
      if (data) {
        this.mapGen.loadModifiedTiles(JSON.parse(data));
      }
    } catch (e) {}
  }

  public interact() {
    this.socket.emit('interact');
  }

  public attemptNameMonster() {
    if (!this.myId || !this.gameState.players[this.myId]?.isAlive) return;
    const me = this.gameState.players[this.myId];
    if (me.mana < 50) return; // Client side check

    const interactRange = 100;
    
    // Find closest alive animal
    let closestId: string | null = null;
    let closestDist = interactRange;
    
    for (const [id, a] of Object.entries(this.gameState.animals)) {
      if (a.state === 5) continue; // DEAD
      const dist = Math.hypot(a.x - me.x, a.y - me.y);
      if (dist < closestDist) {
         closestDist = dist;
         closestId = id;
      }
    }
    
    if (closestId) {
       const newName = prompt("Name this monster to make it Royal (-50 Mana):", "Bob");
       if (newName) {
          this.socket.emit('nameMonster', { targetId: closestId, name: newName });
       }
    }
  }

  public attemptAttack(preferredTargetId?: string | null) {
    const now = Date.now();
    if (now - this.lastAttackTime < 500) return; // 500ms cooldown
    this.lastAttackTime = now;
    
    if (!this.myId || !this.gameState.players[this.myId]?.isAlive) return;
    const me = this.gameState.players[this.myId];
    
    const attackRange = 80;
    
    if (preferredTargetId) {
        let p = this.gameState.players[preferredTargetId];
        if (p && p.isAlive && Math.hypot(p.x - me.x, p.y - me.y) < attackRange) {
           this.socket.emit('attack', { targetId: preferredTargetId });
           this.soundEngine.playHit();
           return;
        }
        let a = this.gameState.animals[preferredTargetId];
        if (a && a.state !== 5 && Math.hypot(a.x - me.x, a.y - me.y) < attackRange) {
           if (a.type === 'chest') {
               this.socket.emit('interact');
               return;
           }
           this.socket.emit('attack', { targetId: preferredTargetId });
           this.soundEngine.playHit();
           return;
        }
    }
    
    // Check players
    for (const [id, p] of Object.entries(this.gameState.players)) {
      if (id !== this.myId && p.isAlive) {
        const dist = Math.hypot(p.x - me.x, p.y - me.y);
        if (dist < attackRange) {
          this.socket.emit('attack', { targetId: id });
          this.soundEngine.playHit();
          return; // Attack one target at a time
        }
      }
    }
    
    // Check animals
    for (const [id, a] of Object.entries(this.gameState.animals)) {
      if (a.state !== 5) { // not dead
        const dist = Math.hypot(a.x - me.x, a.y - me.y);
        if (dist < attackRange) {
          this.socket.emit('attack', { targetId: id });
          this.soundEngine.playHit();
          return; 
        }
      }
    }
  }

  public start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }
  
  public stop() {
    this.isRunning = false;
    this.socket.disconnect();
  }

  private updateVisibility() {
      if (!this.myId || !this.gameState.players[this.myId]) return;
      const myPlayer = this.gameState.players[this.myId];
      
      this.visibleTiles.clear();
      let px = Math.floor(myPlayer.x / this.mapGen.tileSize);
      let py = Math.floor(myPlayer.y / this.mapGen.tileSize);
      let radius = this.perception;
      
      for (let y = -radius; y <= radius; y++) {
         for (let x = -radius; x <= radius; x++) {
             if (x*x + y*y <= radius*radius) {
                 let lineOfSight = true;
                 let steps = Math.max(Math.abs(x), Math.abs(y));
                 if (steps > 0) {
                     let dx = x / steps;
                     let dy = y / steps;
                     for (let i = 1; i <= steps; i++) {
                         let cx = Math.floor(px + dx * i);
                         let cy = Math.floor(py + dy * i);
                         let t = this.mapGen.getTileAt(cx, cy);
                         if (t === 4 || t === 16 || t === 19) { // MOUNTAIN, CAVE_WALL, DUNGEON_DOOR
                             if (i < steps) {
                                 lineOfSight = false;
                                 break;
                             }
                         }
                     }
                 }
                 if (lineOfSight) {
                     let key = `${px+x},${py+y}`;
                     this.visibleTiles.add(key);
                     if (x===0 && y===0) window["_debug_fow"] = key;
                     this.visitedTiles.add(key);
                 }
             }
         }
      }
  }

  private update(dt: number) {
      if (this.myId && this.gameState.players[this.myId]) {
          this.updateVisibility();
      }

    if (!this.myId || !this.gameState.players[this.myId]?.isAlive) return;
    
    const me = this.gameState.players[this.myId];
    const speed = 200 * dt;
    let dx = 0;
    let dy = 0;

    if (this.keys['w'] || this.keys['arrowup']) dy -= speed;
    if (this.keys['s'] || this.keys['arrowdown']) dy += speed;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= speed;
    if (this.keys['d'] || this.keys['arrowright']) dx += speed;

    if (dx !== 0 || dy !== 0) {
       this.targetPath = []; // cancel auto-move if manual WASD
       this.autoAttackTargetId = null;
    } else if (!this.autoAttackTargetId && this.targetPath.length === 0) {
       // Auto-defense scan
       let closestThreatDist = 90;
       let closestThreatId = null;
       for (const [id, a] of Object.entries(this.gameState.animals)) {
           if (a.state !== 5 && Math.hypot(a.x - me.x, a.y - me.y) < closestThreatDist) {
               // Is it hostile or attacking us?
               // The client doesn't know faction easily but we can guess by type or state
               // We will just attack if they are in PURSUE, CIRCLE, or LUNGE state targeting us? Wait, client doesn't know targetId.
               // We can just attack any carnivore/monster in range. Or if it's not our pet.
               if (a.ownerId !== this.myId && (a.state === 3 || a.state === 4 || a.state === 6 || a.state === 7)) {
                   closestThreatId = id;
                   closestThreatDist = Math.hypot(a.x - me.x, a.y - me.y);
               }
           }
       }
       if (closestThreatId) {
           this.autoAttackTargetId = closestThreatId;
       }
    }
    
    if (this.autoAttackTargetId) {
       let targetX = 0, targetY = 0;
       let targetValid = false;
       if (this.gameState.players[this.autoAttackTargetId]?.isAlive) {
          targetX = this.gameState.players[this.autoAttackTargetId].x;
          targetY = this.gameState.players[this.autoAttackTargetId].y;
          targetValid = true;
       } else if (this.gameState.animals[this.autoAttackTargetId] && this.gameState.animals[this.autoAttackTargetId].state !== 5) {
          targetX = this.gameState.animals[this.autoAttackTargetId].x;
          targetY = this.gameState.animals[this.autoAttackTargetId].y;
          targetValid = true;
       } else {
          this.autoAttackTargetId = null;
       }
       
       if (targetValid) {
          const dist = Math.hypot(targetX - me.x, targetY - me.y);
          if (dist < 80) { // attack range
             this.attemptAttack(this.autoAttackTargetId);
          } else {
             const angle = Math.atan2(targetY - me.y, targetX - me.x);
             dx = Math.cos(angle) * speed;
             dy = Math.sin(angle) * speed;
          }
       } else {
          this.autoAttackTargetId = null;
       }
    } else if (this.targetPath.length > 0) {
       const target = this.targetPath[0];
       const diffX = target.x - me.x;
       const diffY = target.y - me.y;
       const dist = Math.hypot(diffX, diffY);
       
       if (dist < speed) {
          dx = diffX;
          dy = diffY;
          this.targetPath.shift();
       } else {
          dx = (diffX / dist) * speed;
          dy = (diffY / dist) * speed;
       }
    }

    if (dx !== 0 || dy !== 0) {
      // Normalize if speed is too high
      const len = Math.hypot(dx, dy);
      if (len > speed) {
        dx = (dx / len) * speed;
        dy = (dy / len) * speed;
      }
      
      const newX = me.x + dx;
      const newY = me.y + dy;
      
      const tsize = this.mapGen.tileSize;
      
      const checkCollision = (cx: number, cy: number) => {
         for (const pt of [{x: cx - 5, y: cy - 5}, {x: cx + 5, y: cy - 5}, {x: cx - 5, y: cy + 5}, {x: cx + 5, y: cy + 5}]) {
            const tile = this.mapGen.getTileAt(Math.floor(pt.x / tsize), Math.floor(pt.y / tsize));
            if (tile === TileType.MOUNTAIN || tile === TileType.GLACIER || tile === TileType.DUNE || tile === TileType.CAVE_WALL || tile === TileType.VOID || tile === TileType.DUNGEON_DOOR) return true;
            if (tile === TileType.WATER && !me.isRidingBoat) return true;
            if (tile !== TileType.WATER && me.isRidingBoat) return true;
         }
         return false;
      };
      
      let moved = false;
      if (!checkCollision(newX, me.y)) {
         me.x = newX;
         moved = true;
      }
      if (!checkCollision(me.x, newY)) {
         me.y = newY;
         moved = true;
      }
      
      if (moved) {
         // Emit to server
         this.socket.emit('move', { x: me.x, y: me.y });
      } else if (this.targetPath.length > 0) {
         const finalTarget = this.targetPath[this.targetPath.length - 1];
         if (finalTarget) {
            const finalDist = Math.hypot(finalTarget.x - me.x, finalTarget.y - me.y);
            if (finalDist < this.mapGen.tileSize * 2.5) {
                const tX = Math.floor(finalTarget.x / this.mapGen.tileSize);
                const tY = Math.floor(finalTarget.y / this.mapGen.tileSize);
                if (this.mapGen.getTileAt(tX, tY) === 19) {
                    this.interact();
                }
            }
         }
         this.targetPath = []; // Cancel path if stuck
      }
    }
    
    // Update camera to follow player smoothly
    if (Math.hypot(me.x - this.camera.x, me.y - this.camera.y) > 2000) {
        this.camera.x = me.x;
        this.camera.y = me.y;
    } else {
        this.camera.x += (me.x - this.camera.x) * 0.1;
        this.camera.y += (me.y - this.camera.y) * 0.1;
    }
  }

  private draw() {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    // Center camera
    ctx.translate(width / 2, height / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    // Draw Map
    const tileSize = this.mapGen.tileSize;
    // Calculate visible bounds
    const viewWidth = width / this.camera.zoom;
    const viewHeight = height / this.camera.zoom;
    const startX = Math.floor((this.camera.x - viewWidth / 2) / tileSize) - 1;
    const endX = Math.floor((this.camera.x + viewWidth / 2) / tileSize) + 1;
    const startY = Math.floor((this.camera.y - viewHeight / 2) / tileSize) - 1;
    const endY = Math.floor((this.camera.y + viewHeight / 2) / tileSize) + 1;

    // Cache patterns to avoid recreating them
    if (!this.mapPatterns) {
      this.mapPatterns = new Map();
      (Object.values(TileType).filter(t => typeof t === 'number') as TileType[]).forEach((type: any) => {
         const tex = this.mapGen.getTileTexture(type);
         if (tex) {
            this.mapPatterns!.set(type, ctx.createPattern(tex, 'repeat')!);
         }
      });
    }

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        let tileType = this.mapGen.getTileAt(x, y);
        const key = `${x},${y}`;
        const isVisible = this.isEditorMode || this.visibleTiles.has(key);
        const isVisited = this.isEditorMode || this.visitedTiles.has(key);
        
        // if (!isVisited) tileType = 18; // VOID tile
        if (x===Math.floor(this.camera.x/tileSize) && y===Math.floor(this.camera.y/tileSize)) {
           window["_debug_fow"] = { key, isVisible, isVisited, px: Math.floor((this.gameState.players[this.myId]?.x || 0)/tileSize), py: Math.floor((this.gameState.players[this.myId]?.y || 0)/tileSize) };
        }
        
        const pattern = this.mapPatterns!.get(tileType);
        
        ctx.save();
        ctx.translate(x * tileSize, y * tileSize);
        if (pattern) {
           ctx.fillStyle = pattern;
        } else {
           ctx.fillStyle = this.mapGen.getTileColor(tileType);
        }
        ctx.fillRect(0, 0, tileSize + 0.5, tileSize + 0.5);
        
        if (false) {
           ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
           ctx.fillRect(0, 0, tileSize + 0.5, tileSize + 0.5);
        }
        ctx.restore();
      }
    }

    // Draw Boats
    for (const b of Object.values(this.gameState.boats || {})) {
      ctx.save();
      ctx.translate(b.x, b.y);
      const bob = Math.sin(Date.now() / 300 + b.x) * 2;
      ctx.translate(0, bob);
      
      // Draw simple wood boat
      ctx.fillStyle = '#8B4513';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.fillStyle = '#A0522D';
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }

    // Draw Items
    for (const item of (Object.values(this.gameState.items || {}) as ItemData[])) {
      if (item.x === undefined || item.y === undefined) continue;
      ctx.save();
      ctx.translate(item.x, item.y);
      const bob = item.type === 'egg' || item.type === 'corpse' ? 0 : Math.sin(Date.now() / 200 + item.x) * 4;
      ctx.translate(0, bob);
      
      // Draw item
      ctx.fillStyle = item.color;
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 10;
      
      
        if (item.type === 'corpse') {
            ctx.fillStyle = '#7f1d1d'; // dark blood
            ctx.beginPath();
            ctx.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fca5a5'; // bone
            ctx.fillRect(-8, -2, 4, 4);
            ctx.fillRect(4, -2, 4, 4);
        } else if (item.type === 'chest') {
            ctx.fillStyle = '#92400e';
            ctx.fillRect(-8, -6, 16, 12);
            ctx.fillStyle = '#fbbf24'; // gold band
            ctx.fillRect(-8, -2, 16, 2);
            ctx.fillRect(-2, -2, 4, 4); // lock
        } else if (item.type === 'egg') {
            ctx.fillStyle = item.color || '#fdf6e3';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
            ctx.fill();
            // Speckles
            ctx.fillStyle = '#d6d3d1';
            ctx.fillRect(-2, -3, 2, 2);
            ctx.fillRect(1, 2, 1, 1);
            ctx.fillRect(-3, 1, 1, 2);
        } else if (item.type === 'meat') {
            ctx.fillStyle = '#b91c1c';
            ctx.beginPath();
            ctx.ellipse(0, 0, 8, 6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(-2, -1, 4, 2);
        } else if (item.type === 'whistle') {
            ctx.fillStyle = '#fbbf24';
            ctx.beginPath();
            ctx.moveTo(-6, 2);
            ctx.lineTo(6, 2);
            ctx.lineTo(8, -2);
            ctx.lineTo(-8, -2);
            ctx.fill();
            ctx.fillStyle = '#78350f';
            ctx.fillRect(-2, -2, 4, 2);
        } else if (item.type === 'weapon') {
         ctx.fillRect(-2, -10, 4, 20); // simple sword/stick
      } else if (item.type === 'armor') {
         ctx.fillRect(-8, -8, 16, 16);
      } else if (item.type === 'helmet') {
         ctx.beginPath();
         ctx.arc(0, 0, 8, Math.PI, 0);
         ctx.fill();
      }
      
      ctx.shadowBlur = 0;
      ctx.restore();
    }

    // Draw Animals
    for (const a of Object.values(this.gameState.animals)) {
      if (a.state === 5) continue; // DEAD
      ctx.save();
      ctx.translate(a.x, a.y);
      if (a.name === 'Baby Turtle') {
          ctx.scale(0.5, 0.5);
      }
      
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(0, 16, Math.abs(Math.cos(a.facing))*14 + 10, 8, 0, 0, Math.PI * 2);
      ctx.fill();

      // Bounce effect for walking
      const isMoving = Math.abs(a.vx) > 0.1 || Math.abs(a.vy) > 0.1;
      const bounce = isMoving ? Math.sin(Date.now() / 100) * 3 : 0;
      ctx.translate(0, bounce);

      // Facing
      const flip = a.facing > Math.PI / 2 || a.facing < -Math.PI / 2 ? -1 : 1;
      ctx.scale(flip, 1);

      
      if (a.type === 'pillar') {
          ctx.fillStyle = '#78716c';
          ctx.beginPath(); ctx.arc(0, 0, 20, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#57534e';
          ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      } else if (a.type === 'table') {
          ctx.fillStyle = '#78350f';
          ctx.fillRect(-20, -15, 40, 30);
          ctx.fillStyle = '#92400e';
          ctx.fillRect(-18, -13, 36, 26);
      } else if (a.type === 'chest') {
          ctx.fillStyle = '#b45309';
          ctx.fillRect(-15, -10, 30, 20);
          ctx.fillStyle = '#f59e0b';
          ctx.fillRect(-4, -12, 8, 4);
      } else if (a.type === 'cow') {
        // Body
        ctx.fillStyle = '#fff';
        ctx.fillRect(-12, -10, 24, 16);
        ctx.fillStyle = '#000'; // spots
        ctx.fillRect(-6, -6, 6, 6);
        ctx.fillRect(4, 0, 4, 4);
        
        // Head
        ctx.fillStyle = '#fff';
        ctx.fillRect(8, -16, 12, 12);
        ctx.fillStyle = '#fca5a5'; // snout
        ctx.fillRect(16, -10, 6, 6);
        if ((a as any).sex === 'M') { // Bull horns
           ctx.fillStyle = '#e5e7eb';
           ctx.fillRect(10, -22, 2, 6);
           ctx.fillRect(16, -22, 2, 6);
        }
        
        // Legs
        ctx.fillStyle = '#000';
        const legSwing = isMoving ? Math.sin(Date.now() / 80) * 4 : 0;
        ctx.fillRect(-10 + legSwing, 6, 4, 8);
        ctx.fillRect(-4 - legSwing, 6, 4, 8);
        ctx.fillRect(6 + legSwing, 6, 4, 8);
        ctx.fillRect(12 - legSwing, 6, 4, 8);
        
      } else if (a.type === 'dog' || a.type === 'alpha_dog') {
        if (a.type === 'alpha_dog') {
            ctx.scale(1.3, 1.3);
            ctx.fillStyle = '#fbbf24'; // Alpha collar or aura
            ctx.beginPath();
            ctx.ellipse(0, 0, 16, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
        }
        if ((a as any).sex === 'F') ctx.scale(0.85, 0.85);
        // Body (golden retriever color)
        ctx.fillStyle = '#f6e05e'; 
        ctx.fillRect(-12, -7, 24, 10);
        
        // Head
        ctx.fillRect(8, -12, 10, 8);
        // Snout
        ctx.fillStyle = '#eab308';
        ctx.fillRect(16, -8, 6, 4);
        // Ear (floppy)
        ctx.fillStyle = '#ca8a04';
        ctx.fillRect(8, -10, 4, 6);
        
        // Tail
        ctx.fillStyle = '#f6e05e';
        const tailWag = isMoving ? Math.sin(Date.now() / 40) * 1.0 : Math.sin(Date.now() / 150) * 0.5; // Always wagging a bit
        ctx.save();
        ctx.translate(-12, -5);
        ctx.rotate(-0.2 + tailWag);
        ctx.fillRect(-8, -2, 8, 4);
        ctx.restore();

        // Legs
        ctx.fillStyle = '#eab308';
        const legSwing = isMoving ? Math.sin(Date.now() / 60) * 5 : 0;
        ctx.fillRect(-10 + legSwing, 3, 3, 7);
        ctx.fillRect(-5 - legSwing, 3, 3, 7);
        ctx.fillRect(5 + legSwing, 3, 3, 7);
        ctx.fillRect(10 - legSwing, 3, 3, 7);
      } else if (a.type === 'wolf') {
        if ((a as any).sex === 'F') ctx.scale(0.85, 0.85);
        // Body
        ctx.fillStyle = '#4b5563'; // gray-600
        ctx.fillRect(-14, -8, 28, 12);
        
        // Head
        ctx.fillRect(10, -14, 12, 10);
        // Snout
        ctx.fillStyle = '#374151'; 
        ctx.fillRect(20, -10, 8, 6);
        // Ear
        ctx.beginPath();
        ctx.moveTo(12, -14);
        ctx.lineTo(16, -20);
        ctx.lineTo(18, -14);
        ctx.fill();
        
        // Tail
        ctx.fillStyle = '#4b5563';
        const tailWag = isMoving ? Math.sin(Date.now() / 60) * 0.5 : 0;
        ctx.save();
        ctx.translate(-14, -6);
        ctx.rotate(-0.5 + tailWag);
        ctx.fillRect(-10, -2, 10, 4);
        ctx.restore();

        // Legs
        ctx.fillStyle = '#1f2937';
        const legSwing = isMoving ? Math.sin(Date.now() / 60) * 6 : 0;
        ctx.fillRect(-12 + legSwing, 4, 3, 8);
        ctx.fillRect(-6 - legSwing, 4, 3, 8);
        ctx.fillRect(8 + legSwing, 4, 3, 8);
        ctx.fillRect(14 - legSwing, 4, 3, 8);

      } else if (a.type === 'penguin') {
          // Body
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 15, 0, 0, Math.PI * 2);
          ctx.fill();
          // Belly
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(2, 2, 7, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          // Beak
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.moveTo(8, -8);
          ctx.lineTo(16, -6);
          ctx.lineTo(8, -4);
          ctx.fill();
          // Eye
          ctx.fillStyle = '#000';
          ctx.fillRect(4, -10, 3, 3);
      } else if (a.type === 'polar_bear') {
        if ((a as any).sex === 'F') ctx.scale(0.85, 0.85);
          // Body
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.ellipse(0, 0, 22, 14, 0, 0, Math.PI * 2);
          ctx.fill();
          // Head
          ctx.beginPath();
          ctx.ellipse(18, -8, 12, 10, 0, 0, Math.PI * 2);
          ctx.fill();
          // Nose
          ctx.fillStyle = '#000';
          ctx.fillRect(26, -10, 4, 4);
          // Legs
          ctx.fillStyle = '#e2e8f0';
          const legSwing = isMoving ? Math.sin(Date.now() / 80) * 4 : 0;
          ctx.fillRect(-14 + legSwing, 10, 6, 10);
          ctx.fillRect(-4 - legSwing, 10, 6, 10);
          ctx.fillRect(8 + legSwing, 10, 6, 10);
          ctx.fillRect(16 - legSwing, 10, 6, 10);
      } else if (a.type === 'frog') {
          // Body
          ctx.fillStyle = '#65a30d';
          ctx.beginPath();
          ctx.ellipse(0, 4, 8, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(4, 0, 3, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.fillRect(5, -1, 2, 2);
          // Legs
          ctx.fillStyle = '#4d7c0f';
          const legSwing = isMoving ? Math.sin(Date.now() / 50) * 4 : 0;
          ctx.fillRect(-6, 8, 4, 4 - legSwing);
          ctx.fillRect(4, 8, 4, 4 - legSwing);
      } else if (a.type === 'crocodile') {
        if ((a as any).sex === 'F') ctx.scale(0.85, 0.85);
          // Body
          ctx.fillStyle = '#4d7c0f';
          ctx.fillRect(-18, -6, 36, 12);
          // Tail
          ctx.beginPath();
          ctx.moveTo(-18, -6);
          ctx.lineTo(-36, 0);
          ctx.lineTo(-18, 6);
          ctx.fill();
          // Snout
          ctx.fillRect(18, -4, 14, 8);
          // Eyes
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(16, -8, 4, 4);
          // Scales
          ctx.fillStyle = '#365314';
          for (let i=-10; i<15; i+=6) {
             ctx.fillRect(i, -8, 4, 4);
          }
          // Legs
          ctx.fillStyle = '#3f6212';
          const legSwing = isMoving ? Math.sin(Date.now() / 80) * 4 : 0;
          ctx.fillRect(-14 + legSwing, 6, 6, 6);
          ctx.fillRect(-6 - legSwing, 6, 6, 6);
          ctx.fillRect(6 + legSwing, 6, 6, 6);
          ctx.fillRect(14 - legSwing, 6, 6, 6);
      } else if (a.type === 'camel') {
          // Body
          ctx.fillStyle = '#d97706';
          ctx.fillRect(-12, -8, 24, 16);
          // Hump
          ctx.fillStyle = '#b45309';
          ctx.beginPath();
          ctx.arc(0, -8, (a as any).sex === 'M' ? 12 : 8, 0, Math.PI, true);
          ctx.fill();
          // Head
          ctx.fillStyle = '#d97706';
          ctx.fillRect(8, -14, 10, 10);
          // Legs
          ctx.fillStyle = '#b45309';
          const legSwing = isMoving ? Math.sin(Date.now() / 80) * 4 : 0;
          ctx.fillRect(-10 + legSwing, 8, 4, 8);
          ctx.fillRect(-4 - legSwing, 8, 4, 8);
          ctx.fillRect(4 + legSwing, 8, 4, 8);
          ctx.fillRect(10 - legSwing, 8, 4, 8);
      } else if (a.type === 'scorpion') {
          ctx.fillStyle = '#991b1b';
          // Body
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Tail
          ctx.beginPath();
          ctx.moveTo(-10, 0);
          ctx.lineTo(-16, -8);
          ctx.lineTo(-12, -12);
          ctx.strokeStyle = '#991b1b';
          ctx.lineWidth = 3;
          ctx.stroke();
          // Stinger
          ctx.fillStyle = '#fef08a';
          ctx.beginPath();
          ctx.arc(-12, -12, 3, 0, Math.PI * 2);
          ctx.fill();
          // Claws
          ctx.fillStyle = '#7f1d1d';
          const clawSwing = isMoving ? Math.sin(Date.now() / 50) * 2 : 0;
          ctx.beginPath();
          ctx.arc(8 + clawSwing, -6, 4, 0, Math.PI * 2);
          ctx.arc(8 - clawSwing, 6, 4, 0, Math.PI * 2);
          ctx.fill();
      } else if (a.type === 'sandworm') {
          ctx.fillStyle = '#ca8a04';
          ctx.strokeStyle = '#854d0e';
          ctx.lineWidth = 2;
          
          const segments = 6;
          for (let i = segments; i >= 0; i--) {
              const segSize = 15 - i;
              const wiggle = isMoving ? Math.sin(Date.now() / 100 + i) * 6 : 0;
              ctx.beginPath();
              ctx.arc(-i * 12, wiggle, segSize, 0, Math.PI * 2);
              ctx.fill();
              ctx.stroke();
          }
          // Maw
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(0, 0, 8, 0, Math.PI * 2);
          ctx.fill();
      } else if (a.type === 'freshwater_fish') {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 4, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#0ea5e9';
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(-12, -4);
          ctx.lineTo(-12, 4);
          ctx.fill();
      } else if (a.type === 'turtle') {
          // Shell
          ctx.fillStyle = '#14532d';
          ctx.beginPath();
          ctx.ellipse(0, 0, 10, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          // Head
          ctx.fillStyle = '#22c55e';
          ctx.beginPath();
          ctx.arc(10, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          // Flippers
          const flipSwing = isMoving ? Math.sin(Date.now() / 150) * 3 : 0;
          ctx.fillRect(4 + flipSwing, -12, 4, 4);
          ctx.fillRect(4 - flipSwing, 8, 4, 4);
          ctx.fillRect(-6 - flipSwing, -10, 4, 4);
          ctx.fillRect(-6 + flipSwing, 6, 4, 4);
      
      } else if (a.type === 'spider') {
          ctx.fillStyle = '#111827';
          // Body
          ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
          // Head
          ctx.beginPath(); ctx.arc(0, -6, 5, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-2, -8, 2, 2);
          ctx.fillRect(1, -8, 2, 2);
          ctx.strokeStyle = '#111827';
          ctx.lineWidth = 2;
          ctx.beginPath();
          const legSwing = isMoving ? Math.sin(Date.now() / 50) * 3 : 0;
          // Left legs
          ctx.moveTo(-6, -2); ctx.lineTo(-14, -6 + legSwing); ctx.stroke();
          ctx.moveTo(-7, 0);  ctx.lineTo(-15, 0 - legSwing); ctx.stroke();
          ctx.moveTo(-6, 2);  ctx.lineTo(-14, 6 + legSwing); ctx.stroke();
          // Right legs
          ctx.moveTo(6, -2);  ctx.lineTo(14, -6 - legSwing); ctx.stroke();
          ctx.moveTo(7, 0);   ctx.lineTo(15, 0 + legSwing); ctx.stroke();
          ctx.moveTo(6, 2);   ctx.lineTo(14, 6 - legSwing); ctx.stroke();

      } else if (a.type === 'skeleton') {
          ctx.fillStyle = '#f3f4f6';
          // Skull
          ctx.fillRect(-4, -14, 8, 8);
          // Ribs
          ctx.fillRect(-3, -4, 6, 8);
          ctx.fillRect(-5, -2, 10, 2);
          ctx.fillRect(-5, 2, 10, 2);
          // Limbs
          const legSwing = isMoving ? Math.sin(Date.now() / 100) * 4 : 0;
          ctx.fillRect(-4 + legSwing, 6, 2, 8);
          ctx.fillRect(2 - legSwing, 6, 2, 8);
          ctx.fillRect(-8 - legSwing, -4, 2, 8);
          ctx.fillRect(6 + legSwing, -4, 2, 8);
          // Eyes
          ctx.fillStyle = '#ef4444'; // glowing red eyes
          ctx.fillRect(-2, -12, 2, 2);
          ctx.fillRect(2, -12, 2, 2);
      } else if (a.type === 'corrupted_beast') {
          // Body
          ctx.fillStyle = '#312e81';
          ctx.fillRect(-16, -12, 32, 20);
          // Head
          ctx.fillStyle = '#4c1d95';
          ctx.fillRect(16, -16, 12, 12);
          // Eyes (many eyes)
          ctx.fillStyle = '#fde047';
          ctx.fillRect(20, -14, 2, 2);
          ctx.fillRect(24, -14, 2, 2);
          ctx.fillRect(22, -10, 2, 2);
          // Tentacles/Spikes
          ctx.fillStyle = '#7c3aed';
          const wiggle = isMoving ? Math.sin(Date.now() / 50) * 2 : 0;
          for (let i=-12; i<=12; i+=6) {
              ctx.beginPath();
              ctx.moveTo(i, -12);
              ctx.lineTo(i + wiggle, -20);
              ctx.lineTo(i+4, -12);
              ctx.fill();
          }
          // Legs
          ctx.fillStyle = '#1e1b4b';
          const legSwing = isMoving ? Math.sin(Date.now() / 100) * 6 : 0;
          ctx.fillRect(-12 + legSwing, 8, 6, 10);
          ctx.fillRect(-2 - legSwing, 8, 6, 10);
          ctx.fillRect(8 + legSwing, 8, 6, 10);
      } else if (a.type === 'bunny') {
          // Body
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.ellipse(0, 0, 6, 8, 0, 0, Math.PI * 2);
          ctx.fill();
          // Ears
          const earSwing = isMoving ? Math.sin(Date.now() / 50) * 2 : 0;
          ctx.beginPath();
          ctx.ellipse(-2, -10 + earSwing, 2, 6, 0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(2, -10 - earSwing, 2, 6, -0.2, 0, Math.PI * 2);
          ctx.fill();
          // Tail
          ctx.beginPath();
          ctx.arc(-6, 4, 3, 0, Math.PI * 2);
          ctx.fill();
          // Nose
          ctx.fillStyle = '#fbcfe8';
          ctx.beginPath();
          ctx.arc(6, -2, 1.5, 0, Math.PI * 2);
          ctx.fill();
      } else if (a.type === 'butterfly') {
          const flap = Math.sin(Date.now() / 50);
          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.ellipse(-4 * Math.abs(flap), -4, 4, 6, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.ellipse(-4 * Math.abs(flap), 4, 3, 5, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f472b6';
          ctx.beginPath();
          ctx.ellipse(4 * Math.abs(flap), -4, 4, 6, -Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.ellipse(4 * Math.abs(flap), 4, 3, 5, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
          // Body
          ctx.fillStyle = '#000';
          ctx.fillRect(-1, -4, 2, 8);
      } else if (a.type === 'cave_bat') {
          const flap = Math.sin(Date.now() / 30);
          ctx.fillStyle = '#1e293b';
          // Body
          ctx.fillRect(-3, -4, 6, 8);
          // Wings
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.ellipse(-6 - 4 * Math.abs(flap), 0, 6, 3, Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.ellipse(6 + 4 * Math.abs(flap), 0, 6, 3, -Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          // Eyes
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-2, -2, 1.5, 1.5);
          ctx.fillRect(1, -2, 1.5, 1.5);
      } else if (a.type === 'cave_rat') {
          ctx.fillStyle = '#451a03';
          ctx.beginPath();
          ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2);
          ctx.fill();
          // Head
          ctx.fillStyle = '#713f12';
          ctx.beginPath();
          ctx.arc(8, 0, 4, 0, Math.PI * 2);
          ctx.fill();
          // Tail
          const tailWiggle = isMoving ? Math.sin(Date.now() / 50) * 4 : 0;
          ctx.strokeStyle = '#f87171';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-8, 0);
          ctx.lineTo(-14, tailWiggle);
          ctx.stroke();
          // Eyes
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(9, -2, 1.5, 1.5);
      } else if (a.type === 'goblin') {
          ctx.fillStyle = '#22c55e';
          // Body
          ctx.fillRect(-5, -6, 10, 12);
          // Head
          ctx.fillRect(-4, -14, 8, 8);
          // Ears
          ctx.beginPath();
          ctx.moveTo(-4, -12);
          ctx.lineTo(-10, -14);
          ctx.lineTo(-4, -10);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(4, -12);
          ctx.lineTo(10, -14);
          ctx.lineTo(4, -10);
          ctx.fill();
          // Legs
          const legSwing = isMoving ? Math.sin(Date.now() / 60) * 4 : 0;
          ctx.fillRect(-4 + legSwing, 6, 3, 6);
          ctx.fillRect(1 - legSwing, 6, 3, 6);
      } else if (a.type === 'necromancer') {
          // Dark aura
          ctx.shadowBlur = 15;
          ctx.shadowColor = '#9333ea';
          // Robes
          ctx.fillStyle = '#4c1d95';
          ctx.fillRect(-10, -10, 20, 24);
          // Head
          ctx.fillStyle = '#000';
          ctx.fillRect(-8, -22, 16, 16);
          // Eyes
          ctx.fillStyle = '#a855f7';
          ctx.fillRect(-4, -18, 2, 2);
          ctx.fillRect(2, -18, 2, 2);
          // Staff
          ctx.strokeStyle = '#451a03';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(12, 10);
          ctx.lineTo(16, -20);
          ctx.stroke();
          // Magic crystal on staff
          ctx.fillStyle = '#d946ef';
          ctx.beginPath();
          ctx.arc(16, -22, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
      } else if (a.type === 'hobgoblin') {
          ctx.fillStyle = '#15803d';
          // Body
          ctx.fillRect(-8, -10, 16, 20);
          // Head
          ctx.fillRect(-6, -20, 12, 10);
          // Ears
          ctx.beginPath();
          ctx.moveTo(-6, -18);
          ctx.lineTo(-14, -20);
          ctx.lineTo(-6, -15);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(6, -18);
          ctx.lineTo(14, -20);
          ctx.lineTo(6, -15);
          ctx.fill();
          // Crown if named/royal
          if (a.name) {
              ctx.fillStyle = '#fbbf24';
              ctx.fillRect(-5, -24, 10, 4);
              ctx.fillRect(-7, -26, 2, 4);
              ctx.fillRect(-1, -27, 2, 5);
              ctx.fillRect(5, -26, 2, 4);
          }
          // Legs
          ctx.fillStyle = '#166534';
          const legSwing = isMoving ? Math.sin(Date.now() / 80) * 5 : 0;
          ctx.fillRect(-6 + legSwing, 10, 5, 8);
          ctx.fillRect(1 - legSwing, 10, 5, 8);
      } else if (a.type === 'fox') {
        if ((a as any).sex === 'F') ctx.scale(0.85, 0.85);
        // Body
        ctx.fillStyle = '#ea580c'; // orange-600
        ctx.fillRect(-10, -8, 20, 10);
        
        // Underbelly
        ctx.fillStyle = '#fff';
        ctx.fillRect(-8, -2, 16, 4);
        
        // Head
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(8, -12, 10, 10);
        ctx.fillStyle = '#000'; // nose
        ctx.fillRect(16, -6, 4, 4);
        
        // Ears
        ctx.fillStyle = '#9a3412';
        ctx.beginPath();
        ctx.moveTo(8, -12);
        ctx.lineTo(12, -18);
        ctx.lineTo(14, -12);
        ctx.fill();
        
        // Tail
        ctx.fillStyle = '#ea580c';
        const tailWag = isMoving ? Math.sin(Date.now() / 50) * 0.5 : 0;
        ctx.save();
        ctx.translate(-10, -4);
        ctx.rotate(-0.3 + tailWag);
        ctx.beginPath();
        ctx.ellipse(-6, 0, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fff'; // white tip
        ctx.beginPath();
        ctx.ellipse(-12, 0, 3, 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Legs
        ctx.fillStyle = '#000';
        const legSwing = isMoving ? Math.sin(Date.now() / 50) * 5 : 0;
        ctx.fillRect(-8 + legSwing, 2, 3, 6);
        ctx.fillRect(-3 - legSwing, 2, 3, 6);
        ctx.fillRect(6 + legSwing, 2, 3, 6);
        ctx.fillRect(11 - legSwing, 2, 3, 6);
      } else if (a.type === 'shark') {
        if ((a as any).sex === 'F') ctx.scale(0.85, 0.85);
        ctx.fillStyle = '#94a3b8'; // slate-400
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 24, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        // Fin
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.moveTo(-4, -6);
        ctx.lineTo(0, -16);
        ctx.lineTo(4, -6);
        ctx.fill();
        // Tail
        ctx.beginPath();
        const tailWag = isMoving ? Math.sin(Date.now() / 50) * 4 : 0;
        ctx.moveTo(-20, 0);
        ctx.lineTo(-28, -6 + tailWag);
        ctx.lineTo(-28, 6 + tailWag);
        ctx.fill();
      } else if (a.type === 'dolphin') {
        ctx.fillStyle = '#38bdf8'; // light blue
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 20, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        // Fin
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(-2, -5);
        ctx.lineTo(2, -12);
        ctx.lineTo(6, -5);
        ctx.fill();
        // Tail
        ctx.beginPath();
        const tailWag = isMoving ? Math.sin(Date.now() / 50) * 4 : 0;
        ctx.moveTo(-16, 0);
        ctx.lineTo(-24, -4 + tailWag);
        ctx.lineTo(-24, 4 + tailWag);
        ctx.fill();
      } else if (a.type === 'tuna') {
        ctx.fillStyle = '#475569'; // slate
        // Body
        ctx.beginPath();
        ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tail
        ctx.beginPath();
        const tailWag = isMoving ? Math.sin(Date.now() / 30) * 3 : 0;
        ctx.moveTo(-12, 0);
        ctx.lineTo(-18, -4 + tailWag);
        ctx.lineTo(-18, 4 + tailWag);
        ctx.fill();
      }
      
      // Health bar for animals (Skip for props)
      if (a.type !== 'pillar' && a.type !== 'table' && a.type !== 'chest') {
          ctx.fillStyle = 'red';
          ctx.fillRect(-10, -28, 20, 4);
          ctx.fillStyle = 'lime';
          const maxHp = (a as any).maxHealth || (a.type === 'wolf' ? 150 : (a.type === 'shark' ? 150 : (a.type === 'fox' || a.type === 'dolphin' ? 80 : (a.type === 'dog' ? 100 : 50))));
          const hpRatio = Math.max(0, Math.min(1, a.health / maxHp));
          ctx.fillRect(-10, -28, 20 * hpRatio, 4);
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 1;
          ctx.strokeRect(-10, -28, 20, 4);
      }
      
      if (a.name) {
          ctx.fillStyle = '#fbbf24'; // Royal color
          ctx.font = 'bold 12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Lv.${a.level || 1} ${a.name}`, 0, -34);
      } else if (a.ownerId === this.myId) {
          ctx.fillStyle = '#60a5fa'; // Blue for own pets
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Lv.${a.level || 1} Dog`, 0, -34);
      } else if (a.level && a.level > 1) {
          ctx.fillStyle = '#fff';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`Lv.${a.level}`, 0, -34);
      }

      ctx.restore();
    }

    // Draw Players
    for (const p of Object.values(this.gameState.players)) {
      if (!p.isAlive) continue;
      
      // Draw shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 16, 12, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.save();
      ctx.translate(p.x, p.y);
      
      // Bobbing animation for player
      const bounce = Math.sin(Date.now() / 150) * 2;
      ctx.translate(0, bounce);
      
      if (p.isRidingBoat) {
        ctx.save();
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.ellipse(0, 10, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#A0522D';
        ctx.beginPath();
        ctx.ellipse(0, 10, 20, 8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Player body
      ctx.fillStyle = p.equipment?.body?.color || p.color;
      ctx.fillRect(-10, -8, 20, 16);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 2;
      ctx.strokeRect(-10, -8, 20, 16);
      
      // Player head
      ctx.fillStyle = '#fcd34d'; // skin tone
      ctx.fillRect(-8, -22, 16, 14);
      ctx.strokeRect(-8, -22, 16, 14);
      
      // Helmet
      if (p.equipment?.head) {
         ctx.fillStyle = p.equipment.head.color;
         ctx.fillRect(-10, -26, 20, 10);
         ctx.strokeRect(-10, -26, 20, 10);
      }

      // Weapon
      if (p.equipment?.right_hand) {
         ctx.fillStyle = p.equipment.right_hand.color;
         // Draw a simple weapon in hand
         ctx.save();
         ctx.translate(12, -4);
         ctx.rotate(Math.PI / 4); // hold angle
         ctx.fillRect(-2, -15, 4, 30);
         ctx.strokeRect(-2, -15, 4, 30);
         ctx.restore();
      }
      
      // Eyes
      ctx.fillStyle = '#000';
      ctx.fillRect(-4, -18, 2, 2);
      ctx.fillRect(2, -18, 2, 2);
      
      if (!p.isRidingBoat) {
        // Legs
        ctx.fillStyle = '#1e3a8a';
        ctx.fillRect(-8, 8, 6, 8);
        ctx.fillRect(2, 8, 6, 8);
      }
      
      // Weapon / Hands
      ctx.fillStyle = '#a1a1aa';
      ctx.fillRect(10, -4, 4, 12); // holding a little sword or tool
      
      ctx.restore();
      
      // Health bar
      ctx.fillStyle = 'red';
      ctx.fillRect(p.x - 16, p.y - 32, 32, 6);
      ctx.fillStyle = 'lime';
      ctx.fillRect(p.x - 16, p.y - 32, 32 * (p.health / 100), 6);
      ctx.strokeStyle = '#000';
      ctx.strokeRect(p.x - 16, p.y - 32, 32, 6);
      
      // Name tag
      ctx.fillStyle = '#fff';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';
      const name = p.id === this.myId ? 'You' : `Player ${p.id.substring(0, 4)}`;
      ctx.fillText(name, p.x, p.y - 38);
    }
    
    // Draw attack cooldown/indicator if it's me
    if (this.myId && this.gameState.players[this.myId]) {
      const me = this.gameState.players[this.myId];
      const timeSinceAttack = Date.now() - this.lastAttackTime;
      if (timeSinceAttack < 500) {
         ctx.beginPath();
         ctx.arc(me.x, me.y, 80 * (timeSinceAttack / 500), 0, Math.PI * 2);
         ctx.strokeStyle = `rgba(255, 255, 255, ${1 - (timeSinceAttack / 500)})`;
         ctx.lineWidth = 4;
         ctx.stroke();
      }
    }

    ctx.restore();
  }

  private lastTime = 0;
  private loop = (time: number = 0) => {
    if (!this.isRunning) return;
    
    const dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    
    if (dt < 0.1) { // cap dt to avoid huge jumps
      this.update(dt);
    }
    this.draw();
    
    requestAnimationFrame(this.loop);
  };
}
