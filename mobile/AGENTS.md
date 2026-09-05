# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# The game engine

`src/engine/` is the single copy of the game engine. Its tests live one level up
in `engine/`, which imports this directory as `buyout-engine` — so after any
engine change, run `cd ../engine && npx vitest run`. Do not create a second copy
of the engine anywhere; there used to be one and it had to be hand-mirrored on
every change.
