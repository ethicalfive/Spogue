# Architecture and Design Spec

## Server and Client Architecture
*Note: This architecture is a simplified, functional setup designed for this specific AI Studio application. It uses a "real" Node.js server and Socket.IO for networking, but the persistence and game loop are in-memory (making it somewhat "fake" compared to a production MMO that would use Redis/Postgres/dedicated matchmakers).*

The application is split into a **Client (React + Canvas)** and a **Server (Express + Socket.IO)**.

**Client-side (`src/`):**
- **React App (`App.tsx`)**: Handles the user interface, menus, overlays, chat, and joining the game.
- **Game Engine (`GameEngine.ts`)**: Manages the HTML5 Canvas rendering loop, camera follow, user inputs, and predicting movement. It receives the global game state from the server and renders tiles, players, animals, and items.
- **Map Generator (`MapGenerator.ts`)**: Uses seeded procedural noise (simplex noise) to generate the terrain deterministically. The client generates the map based on the seed provided by the server to save bandwidth (only the seed and any player modifications need to be sent).

**Server-side (`server.ts`):**
- **State Authority**: The server is the absolute authority on the game state (player positions, health, items, AI states, etc.).
- **Game Loop**: A central tick loop runs at 30 FPS (`setInterval`), simulating animal AI, checking collisions, applying damage, and broadcasting the updated state (`gameState`) to all connected clients.
- **Zone Management**: Manages transitions between the overworld and dungeons.

---

## Generative Graphics System
*Note: The graphics system is procedurally generated at runtime rather than loading pre-drawn sprite images. This is a real technique, but the implementation here is basic and stylized.*

The graphics are created on-the-fly using the HTML5 Canvas 2D API.

- **Map Terrain**: `MapGenerator.ts` generates small canvas textures for different tile types (grass, water, sand, stone). It adds noise, dithering, and small procedurally drawn details (like blades of grass or ripples) to make the tiles look textured.
- **Entities (Players, Animals, Monsters)**: Instead of sprites, entities are drawn programmatically in `GameEngine.ts`'s `draw()` method. We use `ctx.fillRect`, `ctx.ellipse`, and `ctx.arc` to assemble shapes. 
- **Animations**: Animations (like walking bounce or swinging legs) are procedural, calculated using sine waves based on `Date.now()` and the entity's velocity.
- **Tile Patterns**: Once a tile texture is drawn on a tiny off-screen canvas, it is converted into a `CanvasPattern` and cached, allowing the main engine to quickly fill grid squares using `ctx.fillStyle = pattern`.

---

## Entity AI
*Note: The Entity AI is functional but uses a rudimentary finite state machine (FSM) commonly found in older or simpler games. It is not an impressive, complex planner (like GOAP or Behavior Trees) you'd see in modern AAA titles.*

The AI logic lives in `src/game/systems/AISystem.ts` and runs on the server.

- **State Machine**: Each animal has a state (IDLE, WANDER, PURSUE, FLEE, LUNGE, EAT, etc.).
- **Behavior Profiles**: Different animals have different behavior configurations (e.g., `aggressive`, `cowardly`, `pack`, `neutral`). A rabbit will flee if approached, while a wolf will pursue.
- **Pathfinding**: The AI uses simple vector math to move toward a target (`navigateTowards`). If it hits an impassable tile, it attempts a simple bounce/slide to get around it (it does not use complex A* pathfinding, which is computationally expensive for many entities).
- **Pack Mechanics**: Some animals (like wolves and dogs) have basic pack behavior. They will circle their target if someone else is already lunging, creating a more coordinated attack pattern.
- **Evolution/Leveling**: Animals can track their kills. If they defeat enough targets, their max health increases, or in some cases, they can "evolve" into stronger variants (e.g., a wolf evolving into an alpha wolf).
