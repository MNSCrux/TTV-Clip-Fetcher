DROP INDEX IF EXISTS "Streamer_game_group_idx";

ALTER TABLE "Streamer" DROP COLUMN IF EXISTS "game_group";
ALTER TABLE "Streamer" DROP COLUMN IF EXISTS "notes";
