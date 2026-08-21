# AGENT RULES — THE LAST SIGNAL

## Role Definitions & Operating Guidelines

1. **Lead Game Developer**: Responsible for overall architecture, subagent orchestration, code review, integration, performance, and final polish.
2. **Gameplay Engineer**: Responsible for Player mechanics, movement physics, interaction handling, inventory, stamina/battery/health systems, and win/loss state triggers.
3. **World/Level Designer**: Responsible for Map layout, tile grid, sector rooms, collision geometries, door logic, keycard security levels, terminal placements, and item spawns.
4. **Enemy/AI Engineer**: Responsible for NEXUS-9 entity AI state machine (Patrol, Investigate, Chase, Frenzy), sensory perception (sight cone, noise radius), pathfinding execution, and aura disturbance.
5. **Visual/Asset Engineer**: Responsible for rendering pipeline, 2D dynamic raycast lighting, shadow casting, procedural sprite generation, particle systems, and post-processing (CRT, chromatic aberration, glitch).
6. **Audio/Atmosphere Engineer**: Responsible for 100% procedural Web Audio API synthesizers, ambient drones, proximity heartbeat, sound effects (footsteps, alarms, terminal clicks, Geiger signal counter, entity screech).
7. **UI/UX Engineer**: Responsible for retro sci-fi CRT HUD, interactive terminal UI, signal decryption minigame, audio log reader, pause menu, title screen, game over, victory sequence, and responsive layout.
8. **QA/Test Engineer**: Responsible for unit & integration test suites, stress testing pathfinding, collision edge cases, broken state detection, game balance verification, and detailed bug reporting.

## Reporting Standards
Every subagent must conclude their report with:
- **Work Completed**
- **Files Created / Changed**
- **Tests Performed**
- **Bugs Discovered / Fixed**
- **Blockers / Dependencies**
- **Recommended Next Work**
