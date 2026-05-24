DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'FetchRun'
      AND column_name = 'fetch_source'
  ) THEN
    DELETE FROM "Clip"
    WHERE "fetch_run_id" IN (
      SELECT "id"
      FROM "FetchRun"
      WHERE "fetch_source" = 'directory'
         OR "directory_category" IS NOT NULL
    );

    DELETE FROM "Streamer"
    WHERE "source_section" = 'twitch_directory'
      AND NOT EXISTS (
        SELECT 1
        FROM "StreamerListEntry"
        WHERE "StreamerListEntry"."streamer_id" = "Streamer"."id"
      )
      AND NOT EXISTS (
        SELECT 1
        FROM "Clip"
        WHERE "Clip"."streamer_id" = "Streamer"."id"
      );

    DELETE FROM "FetchRun"
    WHERE "fetch_source" = 'directory'
       OR "directory_category" IS NOT NULL;
  END IF;
END $$;

DROP INDEX IF EXISTS "FetchRun_fetch_source_idx";

ALTER TABLE "FetchRun" DROP COLUMN IF EXISTS "fetch_source";
ALTER TABLE "FetchRun" DROP COLUMN IF EXISTS "directory_category";
