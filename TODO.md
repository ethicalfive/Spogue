# Game Development TODO & TDD Plan

## Phase 1: Architecture & Foundation (Done)
- [x] Set up Express + Vite full-stack server.
- [x] Install Socket.IO for real-time multiplayer.
- [x] Define Object-Oriented game entity classes (`Entity`, `Player`, `Animal`).
- [x] Implement robust Game State manager (separate from React UI state).
- [x] Set up main game loop (`update`, `draw`).

## Phase 2: Core Gameplay & Rendering (Done)
- [x] Implement Canvas2D renderer with pinch-zoom and panning camera.
- [x] Add basic player movement and collision detection.
- [x] Implement generative map using Simplex Noise with seeds.
- [x] Create a smart, unobtrusive UI overlay (Main Menu, HUD).

## Phase 3: Multiplayer PvP (Done)
- [x] Setup Socket.IO server to broadcast player positions and actions.
- [x] Implement client-side prediction / interpolation for smooth movement.
- [x] Add basic PvP combat mechanics (health, attacks).

## Phase 4: Sound Engine & Polish (Done)
- [x] Build Web Audio API wrapper for spatial/layered sounds.
- [x] Add player footsteps, attack sounds, and animal ambient noises.
- [x] Load nice textures (using generated shapes/gradients as placeholders).

## Phase 5: Advanced Features (Done)
- [x] Level Editor: toggle mode to place/remove tiles.
- [x] Save/Load functionality (exporting map state and seed to LocalStorage).

## Phase 6: Graphics & Mobile Update (Done)
- [x] Add Articulated class animals (procedural drawing of body, legs, head, tail with movement animations).
- [x] Add Animal State Machines in Server (Wolves hunt, Cows graze).
- [x] Implement procedural pattern textures for map tiles instead of flat colors.
- [x] Implement touch-based virtual joystick overlay for mobile portrait movement.

## Phase 7: Architecture Refactor (Done)
- [x] Create modular directory structure for entities, compositions, symmetries, and systems.
- [x] Rebuild server logic using OOP classes and data abstractions for flavor and mechanics.
- [x] Prepare worldbuilding recipes folder for future expansions.
- Create isolated logic for PRNG and map generation to ensure consistent seeds.
- Abstract socket events to allow testing game logic without network.
- Encapsulate Game Loop to allow manual stepping for physics tests.
