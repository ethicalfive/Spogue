const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');
code = code.replace(`        const checkCollision = (cx: number, cy: number) => {
           for (const pt of [{x: cx - 8, y: cy - 8}, {x: cx + 8, y: cy - 8}, {x: cx - 8, y: cy + 8}, {x: cx + 8, y: cy + 8}]) {
              const tile = mapGen.getTileAt(Math.floor(pt.x / mapGen.tileSize), Math.floor(pt.y / mapGen.tileSize));
              if (tile === TileType.MOUNTAIN || tile === TileType.GLACIER || tile === TileType.DUNE) return true;
              if (tile === TileType.WATER && !p.isRidingBoat) return true;
              if (tile !== TileType.WATER && p.isRidingBoat) return true;
           }
           return false;
        };`, `        const checkCollision = (cx: number, cy: number) => {
           for (const pt of [{x: cx - 8, y: cy - 8}, {x: cx + 8, y: cy - 8}, {x: cx - 8, y: cy + 8}, {x: cx + 8, y: cy + 8}]) {
              const tile = mapGen.getTileAt(Math.floor(pt.x / mapGen.tileSize), Math.floor(pt.y / mapGen.tileSize));
              if (tile === TileType.MOUNTAIN || tile === TileType.GLACIER || tile === TileType.DUNE) { console.log("hit mountain"); return true; }
              if (tile === TileType.WATER && !p.isRidingBoat) { console.log("hit water"); return true; }
              if (tile !== TileType.WATER && p.isRidingBoat) { console.log("hit land boat"); return true; }
           }
           return false;
        };`);
fs.writeFileSync('server.ts', code);
