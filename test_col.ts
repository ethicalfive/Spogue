import { MapGenerator, TileType } from './src/game/MapGenerator';
const mapGen = new MapGenerator('default_seed');
const pt = {x: 0, y: 0};
const tX = Math.floor(pt.x / mapGen.tileSize);
const tY = Math.floor(pt.y / mapGen.tileSize);
const tile = mapGen.getTileAt(tX, tY);
console.log('Tile at 0,0 is:', tile);
