let px = 10, py = 10;
let radius = 8;
let visibleTiles = new Set();
for (let y = -radius; y <= radius; y++) {
    for (let x = -radius; x <= radius; x++) {
        if (x*x + y*y <= radius*radius) {
            let key = `${px+x},${py+y}`;
            visibleTiles.add(key);
        }
    }
}
console.log(visibleTiles.size, visibleTiles.has('10,10'), visibleTiles.has('18,10'));
