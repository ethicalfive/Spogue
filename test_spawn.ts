import { MapGenerator, TileType } from './src/game/MapGenerator';
const mapGen = new MapGenerator('default_seed');

const getSafeSpawn = (isPlayer = false, nearX = 0, nearY = 0) => {
     let x = 0, y = 0;
     for (let i = 0; i < 200; i++) {
        x = nearX + (Math.random() * 2000 - 1000);
        y = nearY + (Math.random() * 2000 - 1000);
        const tX = Math.floor(x / mapGen.tileSize);
        const tY = Math.floor(y / mapGen.tileSize);
        const tile = mapGen.getTileAt(tX, tY);
        
        if (isPlayer) {
            if (tile === TileType.GRASS || tile === TileType.SAND || tile === TileType.FOREST || tile === TileType.MAGIC_FOREST || tile === TileType.OASIS) return {x, y, tile};
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
           } 
           if (valid) {
               return {x: Math.floor(cx) * mapGen.tileSize + mapGen.tileSize/2, y: Math.floor(cy) * mapGen.tileSize + mapGen.tileSize/2, tile};
           }
        }
     }
     return {x: nearX, y: nearY};
};

console.log(getSafeSpawn(true, 0, 0));
