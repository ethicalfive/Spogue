import { useEffect, useRef, useState, useMemo } from 'react';
import { GameEngine } from './game/GameEngine';
import { GameStateData, ItemSlot, ItemData } from './game/Entities';
import { Settings, Play, Trophy, Map as MapIcon, Edit, Package, Shield, Sword, User, Trash2, ChevronDown, ChevronUp, Maximize2, Minimize2, Layers } from 'lucide-react';

import { TileType } from './game/MapGenerator';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);
  
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  
  const [inGame, setInGame] = useState(false);
  const [isDead, setIsDead] = useState(false);
  const [killerId, setKillerId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editorMode, setEditorMode] = useState(false);
  const [editorBrush, setEditorBrush] = useState<TileType>(TileType.GRASS);
  const [showInventory, setShowInventory] = useState(false);
    const [showStats, setShowStats] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [hudExpanded, setHudExpanded] = useState(false);
  const [showLoot, setShowLoot] = useState(false);
  const [ignoredItems, setIgnoredItems] = useState<Set<string>>(new Set());
  const [gameMode, setGameMode] = useState<'respawn' | 'permadeath'>('respawn');
  const [playerClass, setPlayerClass] = useState<string>('warrior');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    const newEngine = new GameEngine(canvasRef.current);
    
    newEngine.onStateUpdate = (state, id) => {
      setGameState({ ...state }); // clone to trigger render
      setMyId(id);
      if (id && state.players[id] && !state.players[id].isAlive) {
         setIsDead(true);
      } else {
         setIsDead(false);
      }
    };
    
    newEngine.onDeath = (killer) => {
      setIsDead(true);
      setKillerId(killer);
    };
    newEngine.onRespawn = () => {
      setIsDead(false);
      setKillerId(null);
    };
    newEngine.onLootClicked = () => {
      setShowLoot(true);
    };
    newEngine.onSelfClicked = () => {
      setShowStats(true);
    };
    
    setEngine(newEngine);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      newEngine.stop();
    };
  }, []);

  const startGame = () => {
    setInGame(true);
    setIsDead(false);
    setKillerId(null);
    engine?.initSound();
    engine?.socket?.emit('joinGame', { gameMode, playerClass, username, password });
    engine?.start();
  };

  useEffect(() => {
    if (!engine) return;
    const socket = engine.socket;
    if (!socket) return;
    
    const handleReset = () => {
       window.location.reload();
    };
    const handleError = (msg: string) => {
       alert(msg);
       setInGame(false);
    };
    
    const handleAuthSuccess = (data: { id: string, username: string }) => {
       engine.myId = data.id;
       setMyId(data.id);
    };
    
    socket.on('serverReset', handleReset);
    socket.on('authError', handleError);
    socket.on('authSuccess', handleAuthSuccess);
    
    return () => {
       socket.off('serverReset', handleReset);
       socket.off('authError', handleError);
       socket.off('authSuccess', handleAuthSuccess);
    };
  }, [engine]);

  const toggleEditor = () => {
    if (!engine) return;
    const next = !editorMode;
    setEditorMode(next);
    engine.isEditorMode = next;
    if (next) {
      setInGame(true);
      engine.start();
    }
  };

  const setBrush = (type: TileType) => {
    setEditorBrush(type);
    if (engine) engine.currentEditorBrush = type;
  };

  const myPlayer = myId && gameState?.players[myId] ? gameState.players[myId] : null;
  const nearbyItems = useMemo(() => {
    if (!myPlayer || !gameState?.items) return [];
    let items: ItemData[] = [];
    for (const item of (Object.values(gameState.items) as ItemData[])) {
       if (ignoredItems.has(item.id)) continue;
       if (item.x !== undefined && item.y !== undefined) {
           const d = Math.hypot(item.x - myPlayer.x, item.y - myPlayer.y);
           if (d < 80) { // expanded distance to 80
              items.push(item);
           }
       }
    }
    return items.sort((a,b) => Math.hypot(a.x!-myPlayer.x, a.y!-myPlayer.y) - Math.hypot(b.x!-myPlayer.x, b.y!-myPlayer.y));
  }, [gameState?.items, myPlayer, ignoredItems]);
  
  // Clear ignored items if we walk away from everything
  useEffect(() => {
      if (nearbyItems.length === 0 && showLoot) {
          setShowLoot(false);
      }
  }, [nearbyItems.length, showLoot]);

  useEffect(() => {
      if (ignoredItems.size > 0 && myPlayer && gameState?.items) {
          let anyNear = false;
          for (const id of ignoredItems) {
              const item = gameState.items[id];
              if (item && item.x !== undefined && item.y !== undefined) {
                  const d = Math.hypot(item.x - myPlayer.x, item.y - myPlayer.y);
                  if (d < 100) { anyNear = true; break; }
              }
          }
          if (!anyNear) {
              setIgnoredItems(new Set());
          }
      }
  }, [myPlayer?.x, myPlayer?.y, ignoredItems, gameState?.items]);

  const handleEquipItem = (item: ItemData) => { if (engine && engine.socket) { engine.socket.emit("equipItem", {id: item.id}); } setIgnoredItems(prev => new Set(prev).add(item.id)); };
  const handlePickupItem = (item: ItemData) => { if (engine && engine.socket) { engine.socket.emit("pickupItem", item.id); } setIgnoredItems(prev => new Set(prev).add(item.id)); };
  const handleDismissItem = (item: ItemData) => { 
    if (engine && engine.socket) {
       engine.socket.emit("destroyItem", item.id);
    }
    setIgnoredItems(prev => new Set(prev).add(item.id)); 
  };
  const handleProcessItem = (item: ItemData) => { if (engine && engine.socket) { engine.socket.emit("processItem", item.id); } setIgnoredItems(prev => new Set(prev).add(item.id)); };
  const handleUseItem = (item: ItemData) => { if (engine && engine.socket) { engine.socket.emit("useItem", item.id); } };
   

  return (
    <div className="fixed inset-0 overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Game Canvas */}
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full touch-none"
      />

      
      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl flex flex-col pointer-events-auto">
            <h2 className="text-2xl font-bold text-white mb-6">Server Settings</h2>
            
            <div className="w-full mb-6">
              <label className="block text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">Death Mode</label>
              <div className="flex bg-slate-900 rounded-lg p-1 gap-1">
                 <button onClick={() => setGameMode('respawn')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${gameMode === 'respawn' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Respawn</button>
                 <button onClick={() => setGameMode('permadeath')} className={`flex-1 py-2 text-xs font-semibold rounded-md transition-colors ${gameMode === 'permadeath' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Permadeath</button>
              </div>
            </div>
            
            <div className="w-full mb-6 border-t border-slate-700 pt-6">
               <label className="block text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">Dev Options</label>
               <button onClick={() => {
                   if (confirm("Reset server memory? This will wipe the map, items, animals, and player data.")) {
                       engine?.socket?.emit('devResetServer');
                       setShowSettings(false);
                   }
               }} className="w-full py-3 px-4 bg-red-900/50 hover:bg-red-800 text-red-200 font-semibold rounded-xl flex items-center justify-center gap-2 border border-red-700/50 transition-colors">
                  <Trash2 size={18} /> Wipe Server Memory
               </button>
            </div>
            
            <button 
              onClick={() => setShowSettings(false)}
              className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors mt-auto"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Main Menu Overlay */}
      {!inGame && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 max-w-md w-full flex flex-col items-center">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-2">Wildlands IO</h1>
            <p className="text-slate-400 mb-6 text-center">Survival. PvP. Exploration.</p>
            
            <div className="w-full mb-4">
              <label className="block text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">Class</label>
              <div className="flex bg-slate-900 rounded-lg p-1 gap-1">
                 {['warrior', 'ranger', 'mage', 'bard'].map(c => (
                     <button key={c} onClick={() => setPlayerClass(c)} className={`flex-1 py-2 text-xs font-semibold capitalize rounded-md transition-colors ${playerClass === c ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>{c}</button>
                 ))}
              </div>
            </div>
            
                        <div className="w-full mb-4">
              <label className="block text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
            </div>
            
            <div className="w-full mb-6">
              <label className="block text-xs text-slate-400 font-bold mb-2 uppercase tracking-wider">Password (Optional)</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Secure your name" className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500 transition-colors" />
            </div>

            <button 
              onClick={startGame}
              className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors mb-4"
            >
              <Play size={20} />
              Join Server
            </button>
            
            <div className="flex w-full gap-4">
              <button 
                onClick={() => setShowSettings(true)}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
              >
                <Settings size={18} /> Settings
              </button>
              <button 
                onClick={toggleEditor}
                className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors"
                title="Level Editor"
              >
                <Edit size={18} /> Editor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Editor Toolbar */}
      {inGame && editorMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-800/90 backdrop-blur border border-slate-700 p-2 rounded-xl flex gap-2 z-20 pointer-events-auto">
          <div className="px-3 py-1 font-bold text-slate-300 border-r border-slate-700 mr-1 flex items-center">Editor</div>
          {[
            { t: TileType.WATER, c: 'bg-blue-500', n: 'Water' },
            { t: TileType.SAND, c: 'bg-yellow-300', n: 'Sand' },
            { t: TileType.GRASS, c: 'bg-green-400', n: 'Grass' },
            { t: TileType.FOREST, c: 'bg-green-800', n: 'Forest' },
            { t: TileType.MOUNTAIN, c: 'bg-stone-500', n: 'Mountain' },
          ].map(brush => (
            <button
              key={brush.t}
              onClick={() => setBrush(brush.t)}
              className={`w-10 h-10 rounded-lg ${brush.c} border-2 transition-transform hover:scale-105 active:scale-95 ${editorBrush === brush.t ? 'border-white' : 'border-transparent'}`}
              title={brush.n}
            />
          ))}
          <button 
            onClick={() => toggleEditor()}
            className="ml-2 px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-bold"
          >
            Exit
          </button>
        </div>
      )}

      {/* HUD (Heads Up Display) */}
      {inGame && !editorMode && myPlayer && !isDead && (
        <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start pointer-events-none">
            {/* Top Left: Player Stats */}
            <div className="pointer-events-auto flex flex-col gap-2">
              <button 
                onClick={() => setHudExpanded(!hudExpanded)} 
                className="bg-slate-900/80 backdrop-blur border border-slate-700 rounded-full w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors self-start shadow-md"
              >
                {hudExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              
              {!hudExpanded ? (
                <div className="flex gap-2">
                    <div 
                      className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-2 rounded-xl shadow-2xl flex flex-col gap-1 min-w-[150px] cursor-pointer hover:bg-slate-800/90 transition-colors"
                      onClick={() => setShowStats(!showStats)}
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-white text-xs tracking-wide flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full border border-slate-600" style={{ backgroundColor: myPlayer.color }} />
                          You
                        </span>
                        <span className="text-amber-400 font-mono font-bold text-xs">{myPlayer?.score || 0} pts</span>
                      </div>
                      <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden shadow-inner border border-slate-800" title={`Health: ${Math.round(myPlayer.health)}/${myPlayer.baseStats?.maxHealth || 100}`}>
                        <div className="bg-gradient-to-r from-red-600 to-red-500 h-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, ((myPlayer?.health || 0) / (myPlayer?.baseStats?.maxHealth || 100)) * 100))}%` }} />
                      </div>
                      <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden shadow-inner border border-slate-800" title={`Mana: ${Math.round(myPlayer.mana || 0)}/${myPlayer.maxMana || 100}`}>
                        <div className="bg-gradient-to-r from-blue-600 to-blue-500 h-full transition-all duration-300" style={{ width: `${Math.max(0, Math.min(100, ((myPlayer?.mana || 0) / (myPlayer?.maxMana || 100)) * 100))}%` }} />
                      </div>
                    </div>
                    
                    {/* Add Crafting Button */}
                    <button 
                      onClick={() => setShowCrafting(!showCrafting)} 
                      className="bg-purple-900/80 hover:bg-purple-800 backdrop-blur border border-purple-500/50 rounded-xl w-12 flex items-center justify-center text-purple-300 transition-colors shadow-lg"
                      title="Skills & Crafting"
                    >
                      <Layers size={18} />
                    </button>
                </div>
              ) : (
                <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-xl flex items-center gap-4 min-w-[280px]">

               <div className="w-12 h-12 rounded-full border-2 border-slate-600 flex items-center justify-center" style={{ backgroundColor: myPlayer.color }}>
                 <span className="font-bold text-shadow">You</span>
               </div>
               <div>
                 <div className="flex justify-between text-sm mb-1 font-medium">
                   <span>Health</span>
                   <span>{Math.round(myPlayer.health)}/100</span>
                 </div>
                 <div className="w-32 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                   <div 
                     className="h-full bg-red-500 transition-all duration-300"
                     style={{ width: `${Math.max(0, Math.min(100, myPlayer.health))}%` }}
                   />
                 </div>
                 {myPlayer.mana !== undefined && (
                 <>
                     <div className="flex justify-between text-sm mt-1 mb-1 font-medium text-blue-200">
                       <span>Mana</span>
                       <span>{Math.round(myPlayer.mana)}/{myPlayer.maxMana || 100}</span>
                     </div>
                     <div className="w-32 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700">
                       <div 
                         className="h-full bg-blue-500 transition-all duration-300"
                         style={{ width: `${Math.max(0, Math.min(100, (myPlayer.mana / (myPlayer.maxMana || 100)) * 100))}%` }}
                       />
                     </div>
                 </>
                 )}
                 <div className="mt-2 text-sm text-amber-400 font-semibold flex items-center gap-1">
                   <Trophy size={14} /> Score: {myPlayer.score}
                 </div>
                 
                 
                 <div className="flex justify-between items-center mt-3">
                     {/* Equipment Mini-View */}
                     <button onClick={() => setShowInventory(true)} className="flex gap-1 hover:opacity-80 transition-opacity">
                       {['head', 'neck', 'body', 'left_hand', 'right_hand', 'ring_1', 'ring_2'].map(slot => {
                          const item = (myPlayer.equipment || {})[slot as keyof typeof myPlayer.equipment];
                          return (
                            <div key={slot} className="w-6 h-6 rounded bg-slate-900 border border-slate-700 flex items-center justify-center relative group" title={item?.name || `No ${slot}`}>
                               {item ? (
                                 <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }} />
                               ) : (
                                 <span className="text-[8px] text-slate-600 font-bold uppercase">{slot[0]}</span>
                               )}
                            </div>
                          );
                       })}
                     </button>
                     <button 
                      onClick={() => setShowCrafting(!showCrafting)} 
                      className="bg-purple-600 hover:bg-purple-500 text-white rounded px-2 py-1 text-xs font-bold transition-colors shadow flex items-center gap-1"
                     >
                      <Layers size={12} /> Skills
                     </button>
                 </div>
               </div>
            </div>
            )}
            </div>

            {/* Top Right: Leaderboard */}
            <div className="pointer-events-auto flex flex-col items-end gap-2">
                {!hudExpanded ? (
                    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-700 p-2 rounded-xl shadow-2xl flex flex-col min-w-[120px]">
                      <h3 className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-1 flex justify-between items-center">
                         <span>Top</span>
                         <Trophy size={10} />
                      </h3>
                      <div className="flex flex-col gap-0.5">
                        {(Object.values(gameState?.players || {}) as any[])
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 3)
                          .map((p, i) => (
                            <div key={p.id} className="flex justify-between items-center text-[10px]">
                              <span style={{ color: p.color }} className="font-medium truncate max-w-[50px]">
                                {p.id === myId ? 'You' : p.id.substring(0, 4)}
                              </span>
                              <span className="font-bold text-slate-300">{p.score}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                ) : (
                    <div className="bg-slate-800/90 backdrop-blur-md border border-slate-700 p-4 rounded-2xl shadow-xl min-w-[180px]">
                      <h3 className="text-xs uppercase text-slate-400 font-bold tracking-wider mb-2 flex items-center gap-2">
                        <Trophy size={14} /> Leaderboard
                      </h3>
                      <div className="space-y-2">
                        {(Object.values(gameState?.players || {}) as any[])
                          .sort((a, b) => b.score - a.score)
                          .slice(0, 5)
                          .map((p, i) => (
                            <div key={p.id} className="flex justify-between items-center text-sm">
                              <span className="flex items-center gap-2">
                                <span className="text-slate-500 text-xs w-3">{i + 1}.</span>
                                <span style={{ color: p.color }} className="font-medium truncate max-w-[80px]">
                                  {p.id === myId ? 'You' : p.id.substring(0, 4)}
                                </span>
                              </span>
                              <span className="font-bold text-slate-300">{p.score}</span>
                            </div>
                          ))}
                      </div>
                    </div>
                )}
            </div>
          </div>

          
                    {nearbyItems.length > 0 && !showLoot && (
            <div className="absolute right-4 top-[150px] pointer-events-auto">
              <button 
                onClick={() => setShowLoot(true)} 
                className="bg-amber-600/90 hover:bg-amber-500 text-white font-bold py-2 px-4 rounded-full shadow-lg border border-amber-400 flex items-center gap-2 animate-pulse"
              >
                <Package size={16} /> Loot ({nearbyItems.length})
              </button>
            </div>
          )}
          
          {nearbyItems.length > 0 && showLoot && (
            <div className="absolute inset-0 flex items-center justify-center bg-transparent z-50" onClick={(e) => { if (e.target === e.currentTarget) setShowLoot(false); }}>
               <div className="pointer-events-auto bg-slate-800/95 backdrop-blur-md border border-slate-600 p-4 rounded-xl shadow-2xl flex flex-col w-[300px] max-h-[60vh]">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-lg font-bold text-white">Ground Loot</h3>
                 <button onClick={() => setShowLoot(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
              </div>
              <div className="flex flex-col gap-2 overflow-y-auto pr-2 no-scrollbar">
              {nearbyItems.map(item => (
                  <div key={item.id} className="bg-slate-900/50 border border-slate-700/50 p-2 rounded-lg flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded border border-slate-500 shadow-inner flex flex-shrink-0 items-center justify-center" style={{ backgroundColor: item.color }} />
                        <div className="flex flex-col">
                          <span className="font-bold text-white leading-tight">{item.name}{item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ''}</span>
                          <span className="text-xs text-slate-300 uppercase tracking-wider">{item.type}</span>
                          <span className="text-xs text-green-400 font-medium">
                            {item.stats?.damage ? `+${item.stats.damage} DMG ` : ''}
                            {item.stats?.defense ? `+${item.stats.defense} DEF` : ''}
                          </span>
                        </div>
                      </div>
                      <button onClick={() => handleDismissItem(item)} className="text-slate-500 hover:text-red-400 transition-colors h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-700" title="Destroy Item Forever"><Trash2 size={16} /></button>
                    </div>
                    <div className="flex gap-2 w-full">
                      {item.type === 'corpse' ? (
                         <button onClick={() => handleProcessItem(item)} className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-semibold py-1 px-2 rounded text-sm transition-colors shadow">Process</button>
                      ) : item.type === 'meat' || item.type === 'egg' ? (
                         <button onClick={() => handleUseItem(item)} className="flex-1 bg-green-600 hover:bg-green-500 active:bg-green-700 text-white font-semibold py-1 px-2 rounded text-sm transition-colors shadow">Eat</button>
                      ) : item.type === 'weapon' ? (
                         <div className="flex-1 flex gap-1">
                           <button onClick={() => { if (engine && engine.socket) engine.socket.emit("equipItem", {id: item.id, hand: 'left_hand'}); setIgnoredItems(prev => new Set(prev).add(item.id)); }} className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-1 px-2 rounded text-sm transition-colors shadow">Eq(L)</button>
                           <button onClick={() => { if (engine && engine.socket) engine.socket.emit("equipItem", {id: item.id, hand: 'right_hand'}); setIgnoredItems(prev => new Set(prev).add(item.id)); }} className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-1 px-2 rounded text-sm transition-colors shadow">Eq(R)</button>
                         </div>
                      ) : (
                         <button onClick={() => handleEquipItem(item)} className="flex-1 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold py-1 px-2 rounded text-sm transition-colors shadow">Equip</button>
                      )}
                      {item.type !== 'corpse' && (
                         <button onClick={() => handlePickupItem(item)} className="flex-1 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-medium py-1 px-2 rounded text-sm transition-colors shadow">Stash</button>
                      )}
                    </div>
                  </div>
              ))}
              </div>
               </div>
            </div>
          )}
                    {/* Crafting / Skills Modal */}
          {showCrafting && inGame && (
             <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-40 p-4 pointer-events-auto" onClick={(e) => { if (e.target === e.currentTarget) setShowCrafting(false); }}>
                <div className="bg-slate-800 border border-purple-500/30 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                   <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50 rounded-t-xl">
                       <h2 className="text-xl font-bold flex items-center gap-2 text-purple-300">
                           <Layers className="text-purple-400" /> Skills & Crafting
                       </h2>
                       <button onClick={() => setShowCrafting(false)} className="text-slate-400 hover:text-white transition-colors font-bold text-xl">✕</button>
                   </div>
                   <div className="p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                       <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg flex flex-col gap-2">
                           <h3 className="font-bold text-slate-200 border-b border-slate-700 pb-2">Cooking (Lv.1)</h3>
                           <p className="text-sm text-slate-400">Combine ingredients to make better food.</p>
                           <button className="bg-green-600 hover:bg-green-500 text-white font-medium py-2 px-4 rounded text-sm transition-colors mt-2 opacity-50 cursor-not-allowed">Requires Campfire</button>
                       </div>
                       <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg flex flex-col gap-2">
                           <h3 className="font-bold text-slate-200 border-b border-slate-700 pb-2">Forging (Lv.1)</h3>
                           <p className="text-sm text-slate-400">Craft weapons and armor from raw materials.</p>
                           <button className="bg-slate-600 hover:bg-slate-500 text-white font-medium py-2 px-4 rounded text-sm transition-colors mt-2 opacity-50 cursor-not-allowed">Requires Anvil</button>
                       </div>
                       <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg flex flex-col gap-2">
                           <h3 className="font-bold text-slate-200 border-b border-slate-700 pb-2">Chemistry (Lv.1)</h3>
                           <p className="text-sm text-slate-400">Brew potions and transmutate elements.</p>
                           <button className="bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded text-sm transition-colors mt-2 opacity-50 cursor-not-allowed">Requires Alchemy Lab</button>
                       </div>
                       <div className="bg-slate-900/50 border border-slate-700 p-4 rounded-lg flex flex-col gap-2">
                           <h3 className="font-bold text-slate-200 border-b border-slate-700 pb-2">Magic & Witchcraft</h3>
                           <p className="text-sm text-slate-400">Enchant items and learn spells.</p>
                           <button className="bg-purple-600 hover:bg-purple-500 text-white font-medium py-2 px-4 rounded text-sm transition-colors mt-2 opacity-50 cursor-not-allowed">Requires Magic Altar</button>
                       </div>
                   </div>
                   <div className="p-4 bg-slate-900/50 text-center text-sm text-slate-500 border-t border-slate-700 rounded-b-xl">
                       Gather more materials and build stations to unlock recipes!
                   </div>
                </div>
             </div>
          )}
          {/* Bottom Controls / Tips */}
          <div className="hidden md:block self-center bg-slate-900/60 backdrop-blur px-6 py-2 rounded-full text-sm text-slate-300 border border-slate-700/50">
            WASD to move • SPACE/Click to attack • E to interact • Scroll/Pinch to zoom
          </div>
          <div className="md:hidden self-center bg-slate-900/60 backdrop-blur px-6 py-2 rounded-full text-xs text-slate-300 border border-slate-700/50 text-center pointer-events-auto">
            Tap to move/attack • Tap self to interact
          </div>
          
        </div>
      )}

            {inGame && showStats && myPlayer && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm z-40 p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowStats(false); }}>
           <div className="bg-slate-800 border border-slate-600 rounded-xl shadow-2xl p-4 w-full max-w-sm pointer-events-auto flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="text-xl font-bold flex items-center gap-2">Character Profile</h2>
                 <button onClick={() => setShowStats(false)} className="text-slate-400 hover:text-white transition-colors text-xl font-bold">✕</button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                 <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase">Class</div>
                    <div className="font-bold capitalize">{myPlayer.playerClass || 'Unknown'}</div>
                 </div>
                 <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase">Mode</div>
                    <div className="font-bold capitalize">{myPlayer.gameMode || 'Respawn'}</div>
                 </div>
                 <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase">Max Health</div>
                    <div className="font-bold">{myPlayer.baseStats?.maxHealth || 100}</div>
                 </div>
                 <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase">Base Speed</div>
                    <div className="font-bold">{myPlayer.baseStats?.speed || 100}</div>
                 </div>
                 <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase">Base Attack</div>
                    <div className="font-bold">{myPlayer.baseStats?.attack || 10}</div>
                 </div>
                 <div className="bg-slate-900 p-2 rounded border border-slate-700">
                    <div className="text-slate-400 text-xs uppercase">Base Defense</div>
                    <div className="font-bold">{myPlayer.baseStats?.defense || 0}</div>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Inventory Screen */}
      {inGame && showInventory && myPlayer && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md z-40 p-4">
           <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto pointer-events-auto flex flex-col">
              <div className="flex justify-between items-center mb-6">
                 <div className="flex items-center gap-4">
                     <h2 className="text-2xl font-bold flex items-center gap-2"><Package /> Inventory & Equipment</h2>
                     <div className="flex gap-2">
                         <div className="bg-red-950/50 text-red-400 px-3 py-1 rounded border border-red-900/50 text-sm font-bold flex items-center gap-1">HP: {Math.floor(myPlayer.health?.current || 0)}/{myPlayer.health?.max || 0}</div>
                         <div className="bg-blue-950/50 text-blue-400 px-3 py-1 rounded border border-blue-900/50 text-sm font-bold flex items-center gap-1">MP: {Math.floor(myPlayer.mana || 0)}/100</div>
                     </div>
                 </div>
                 <button onClick={() => setShowInventory(false)} className="text-slate-400 hover:text-white transition-colors text-2xl font-bold">✕</button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 {/* Equipment */}
                 <div>
                    <h3 className="text-sm uppercase text-slate-400 font-bold mb-4 tracking-wider">Equipped</h3>
                    <div className="space-y-3">
                       {['head', 'neck', 'body', 'left_hand', 'right_hand', 'ring_1', 'ring_2'].map(slot => {
                          const item = (myPlayer.equipment || {})[slot as keyof typeof myPlayer.equipment];
                          return (
                             <div key={slot} className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                <div className="w-12 h-12 rounded border border-slate-600 shadow-inner flex items-center justify-center bg-slate-800 shrink-0">
                                   {item ? (
                                      <button onClick={() => engine?.socket?.emit('unequipItem', slot)} className="w-full h-full flex flex-col items-center justify-center hover:bg-slate-700/50 rounded transition-colors group relative cursor-pointer">
                                        <div className="w-6 h-6 rounded mb-1" style={{ backgroundColor: item.color }} />
                                        <span className="absolute inset-0 flex items-center justify-center bg-black/60 rounded opacity-0 md:group-hover:opacity-100 transition-opacity text-[10px] font-bold text-white uppercase tracking-wider">Unequip</span>
                                      </button>
                                   ) : (
                                      <span className="text-[10px] text-slate-600 font-bold uppercase leading-tight text-center">{slot.replace('_', '\n')}</span>
                                   )}
                                </div>
                                <div className="flex-1 min-w-0">
                                   <div className={`font-semibold truncate ${item?.quality === 'royal' ? 'text-amber-300 drop-shadow-md' : item?.quality === 'legendary' ? 'text-amber-400' : 'text-slate-200'}`}>
                                       {item?.name || 'Empty Slot'}
                                   </div>
                                   {item && (
                                      <div className="flex flex-wrap gap-1 text-xs mt-1">
                                          {item.stats?.damage ? <span className="text-red-400 font-medium">+{item.stats.damage} DMG</span> : null}
                                          {item.stats?.defense ? <span className="text-blue-400 font-medium">+{item.stats.defense} DEF</span> : null}
                                          {item.stats?.magic ? <span className="text-purple-400 font-medium">+{item.stats.magic} MAG</span> : null}
                                          {item.effectTags?.map(tag => <span key={tag} className="text-amber-200/80 italic ml-1">[{tag}]</span>)}
                                      </div>
                                   )}
                                </div>
                             </div>
                          )
                       })}
                    </div>
                 </div>
                 
                 {/* Inventory */}
                 <div>
                    <h3 className="text-sm uppercase text-slate-400 font-bold mb-4 tracking-wider flex items-center gap-2">
                       Backpack <span className="text-slate-500 font-normal">({myPlayer.inventory?.length || 0})</span>
                    </h3>
                    <div className="bg-slate-900/50 p-3 rounded-xl border border-slate-700/50 min-h-[300px] overflow-y-auto flex flex-col gap-2">
                       {myPlayer.inventory && myPlayer.inventory.length > 0 ? myPlayer.inventory.map((item, i) => (
                          <div key={i} className="flex flex-col gap-2 bg-slate-800 p-3 rounded border border-slate-700">
                             <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                   <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
                                   <div>
                                      <div className={`font-semibold text-sm leading-tight ${item.quality === 'royal' ? 'text-amber-300 drop-shadow-md' : item.quality === 'legendary' ? 'text-amber-400' : 'text-slate-200'}`}>{item.name}{item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : ''}</div>
                                      <div className="text-[10px] text-slate-400 uppercase tracking-wider">{item.slot.replace('_', ' ')}</div>
                                   </div>
                                </div>
                                {(item.type === 'meat' || item.type === 'egg') ? (
                                   <button onClick={() => handleUseItem(item)} className="bg-green-600 hover:bg-green-500 text-white text-xs font-bold py-1 px-3 rounded">Use</button>
                                ) : item.type === 'weapon' ? (
                                   <div className="flex gap-1">
                                      <button onClick={() => { if (engine && engine.socket) engine.socket.emit("equipItem", {id: item.id, hand: 'left_hand'}); }} className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold py-1 px-2 rounded">Eq(L)</button>
                                      <button onClick={() => { if (engine && engine.socket) engine.socket.emit("equipItem", {id: item.id, hand: 'right_hand'}); }} className="bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-bold py-1 px-2 rounded">Eq(R)</button>
                                   </div>
                                ) : (
                                   <button onClick={() => { if (engine && engine.socket) engine.socket.emit("equipItem", {id: item.id}); }} className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-1 px-3 rounded">Equip</button>
                                )}
                             </div>
                             <div className="flex flex-wrap gap-1 text-xs ml-7 mt-1">
                               {item.stats?.damage ? <span className="text-red-400 font-medium">+{item.stats.damage} DMG</span> : null}
                               {item.stats?.defense ? <span className="text-blue-400 font-medium">+{item.stats.defense} DEF</span> : null}
                               {item.stats?.magic ? <span className="text-purple-400 font-medium">+{item.stats.magic} MAG</span> : null}
                               {item.effectTags?.map(tag => <span key={tag} className="text-amber-200/80 italic ml-1">[{tag}]</span>)}
                             </div>
                          </div>
                       )) : (
                          <div className="text-sm text-slate-500 italic text-center mt-10">Your backpack is empty.</div>
                       )}
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

      
      {/* Pack Whistle UI */}
      {myPlayer && Object.values(myPlayer.equipment || {}).some((i: any) => i && i.type === 'whistle') && (
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 pointer-events-auto bg-slate-900/60 border border-slate-700/50 py-1.5 px-3 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-md z-40">
             <span className="text-amber-500 font-bold uppercase text-[10px] tracking-wider flex items-center mr-2">Whistle</span>
                 {[
                     { id: 'guard', label: 'Guard' },
                     { id: 'quiet', label: 'Quiet' },
                     { id: 'strike_all', label: 'Strike' },
                     { id: 'stop_and_strike', label: 'Hold/Strike' },
                     { id: 'stop_and_guard', label: 'Hold/Guard' },
                     { id: 'eat_corpses', label: 'Eat' }
                 ].map(b => (
                     <button
                        key={b.id}
                        onClick={() => engine?.socket?.emit('setPackBehavior', b.id)}
                        className={`px-2 py-1 rounded-full text-[10px] font-semibold transition-all whitespace-nowrap ${myPlayer.packBehavior === b.id ? 'bg-amber-600/90 text-white shadow-[0_0_8px_rgba(217,119,6,0.8)] border border-amber-500/50' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700/50'}`}
                     >
                         {b.label}
                     </button>
                 ))}
          </div>
      )}

      {/* Death Screen */}
      {inGame && isDead && (
         <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 backdrop-blur-md z-40">
           <div className="text-center">
             <h2 className="text-6xl font-black text-red-500 tracking-tighter mb-4 drop-shadow-lg">WASTED</h2>
             {killerId && <p className="text-xl text-slate-200 mb-8">Killed by <span className="font-bold text-amber-400">{killerId.substring(0,4)}</span></p>}
             {gameMode === 'permadeath' ? (
                <button onClick={() => window.location.reload()} className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95">Restart Character</button>
             ) : (
                <p className="text-slate-400 animate-pulse">Respawning in 3 seconds...</p>
             )}
           </div>
         </div>
      )}
    </div>
  );
}
