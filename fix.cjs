const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix LootSystem call
code = code.replace(/LootSystem\.generateDrop\(zone, /g, "LootSystem.generateDrop(");

// 2. Fix PlayerEntity assignment
code = code.replace(/players\[sessionId\] = WorldRecipes\.spawnPlayer\([\s\S]*?\);/g, match => match.replace(");", ") as any;"));
code = code.replace(/p = WorldRecipes\.spawnPlayer\([\s\S]*?\);/g, match => match.replace(");", ") as any;"));

// 3. Fix weird boat replacements
code = code.replace(/boats: getZ\(\)\.zones\['overworld'\]\.boats/g, "getZ().boats");
code = code.replace(/getZ\(\)\.zones\['overworld'\]\.boats/g, "getZ().boats");

fs.writeFileSync('server.ts', code);
