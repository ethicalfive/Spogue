import { MapGenerator, TileType } from '../MapGenerator';

export class PathfindingSystem {
  public static isWalkable(mapGen: MapGenerator, tileX: number, tileY: number, opts: { isAquatic?: boolean, isRidingBoat?: boolean, impassableTiles?: Set<string> } = {}): boolean {
    if (opts.impassableTiles && opts.impassableTiles.has(`${tileX},${tileY}`)) return false;
    const t = mapGen.getTileAt(tileX, tileY);
    if (t === TileType.MOUNTAIN || t === TileType.GLACIER || t === TileType.DUNE || t === TileType.CAVE_WALL) return false;
    
    if (opts.isAquatic) {
       return t === TileType.WATER;
    }
    
    if (opts.isRidingBoat) {
       return t === TileType.WATER;
    }
    
    if (t === TileType.WATER && !opts.isRidingBoat) {
       return false;
    }
    
    return true;
  }

  // Simple A* for a limited radius
  public static findPath(mapGen: MapGenerator, startX: number, startY: number, endX: number, endY: number, maxSteps = 100, opts: { isAquatic?: boolean, isRidingBoat?: boolean, impassableTiles?: Set<string> } = {}): {x: number, y: number}[] | null {
    const startNode = { x: startX, y: startY, g: 0, h: this.heuristic(startX, startY, endX, endY), parent: null as any };
    const endNode = { x: endX, y: endY };
    
    const openSet = [startNode];
    const closedSet = new Set<string>();
    
    let steps = 0;
    while (openSet.length > 0 && steps < maxSteps) {
      steps++;
      openSet.sort((a, b) => (a.g + a.h) - (b.g + b.h));
      const current = openSet.shift()!;
      
      if (current.x === endNode.x && current.y === endNode.y) {
        // Reconstruct path
        const path: {x: number, y: number}[] = [];
        let curr = current;
        while (curr) {
          path.unshift({ x: curr.x, y: curr.y });
          curr = curr.parent;
        }
        return path;
      }
      
      closedSet.add(`${current.x},${current.y}`);
      
      const neighbors = [
        { x: current.x, y: current.y - 1 },
        { x: current.x, y: current.y + 1 },
        { x: current.x - 1, y: current.y },
        { x: current.x + 1, y: current.y },
      ];
      
      for (const n of neighbors) {
        if (closedSet.has(`${n.x},${n.y}`)) continue;
        if (!this.isWalkable(mapGen, n.x, n.y, opts)) { 
           continue;
        }
        
        const gScore = current.g + (n.x !== current.x && n.y !== current.y ? 1.414 : 1);
        const existing = openSet.find(o => o.x === n.x && o.y === n.y);
        
        if (!existing) {
          openSet.push({ x: n.x, y: n.y, g: gScore, h: this.heuristic(n.x, n.y, endX, endY), parent: current });
        } else if (gScore < existing.g) {
          existing.g = gScore;
          existing.parent = current;
        }
      }
    }
    
    return null; // No path found or too far
  }

  private static heuristic(x1: number, y1: number, x2: number, y2: number) {
    return Math.hypot(x1 - x2, y1 - y2);
  }
}
