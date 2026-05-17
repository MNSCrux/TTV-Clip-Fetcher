-- CreateTable
CREATE TABLE "StreamerList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StreamerListEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "streamer_list_id" INTEGER NOT NULL,
    "streamer_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "StreamerListEntry_streamer_list_id_fkey" FOREIGN KEY ("streamer_list_id") REFERENCES "StreamerList" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreamerListEntry_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "Streamer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Clip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL DEFAULT 'twitch_api',
    "external_id" TEXT,
    "url" TEXT NOT NULL,
    "embed_url" TEXT,
    "broadcaster_id" TEXT NOT NULL,
    "broadcaster_name" TEXT NOT NULL,
    "creator_id" TEXT,
    "creator_name" TEXT,
    "video_id" TEXT,
    "game_id" TEXT,
    "game_name" TEXT,
    "language" TEXT,
    "title" TEXT NOT NULL,
    "streamer_handle" TEXT,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL,
    "thumbnail_url" TEXT,
    "duration" INTEGER,
    "vod_offset" INTEGER,
    "fetched_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scraped_at" DATETIME,
    "raw_json" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'unreviewed',
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "local_file_path" TEXT,
    "notes" TEXT,
    "streamer_id" INTEGER NOT NULL,
    "fetch_run_id" INTEGER,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Clip_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "Streamer" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Clip_fetch_run_id_fkey" FOREIGN KEY ("fetch_run_id") REFERENCES "FetchRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Clip" ("broadcaster_id", "broadcaster_name", "created_at", "creator_id", "creator_name", "downloaded", "duration", "embed_url", "external_id", "fetched_at", "game_id", "game_name", "id", "language", "local_file_path", "notes", "raw_json", "rejected", "review_status", "scraped_at", "selected", "source", "streamer_handle", "streamer_id", "thumbnail_url", "title", "updated_at", "url", "video_id", "view_count", "vod_offset") SELECT "broadcaster_id", "broadcaster_name", "created_at", "creator_id", "creator_name", "downloaded", "duration", "embed_url", "external_id", "fetched_at", "game_id", "game_name", "id", "language", "local_file_path", "notes", "raw_json", "rejected", "review_status", "scraped_at", "selected", "source", "streamer_handle", "streamer_id", "thumbnail_url", "title", "updated_at", "url", "video_id", "view_count", "vod_offset" FROM "Clip";
DROP TABLE "Clip";
ALTER TABLE "new_Clip" RENAME TO "Clip";
CREATE INDEX "Clip_created_at_idx" ON "Clip"("created_at");
CREATE INDEX "Clip_view_count_idx" ON "Clip"("view_count");
CREATE INDEX "Clip_broadcaster_id_idx" ON "Clip"("broadcaster_id");
CREATE INDEX "Clip_review_status_idx" ON "Clip"("review_status");
CREATE INDEX "Clip_selected_idx" ON "Clip"("selected");
CREATE INDEX "Clip_rejected_idx" ON "Clip"("rejected");
CREATE INDEX "Clip_streamer_id_idx" ON "Clip"("streamer_id");
CREATE INDEX "Clip_fetch_run_id_idx" ON "Clip"("fetch_run_id");
CREATE UNIQUE INDEX "Clip_source_external_id_fetch_run_id_key" ON "Clip"("source", "external_id", "fetch_run_id");
CREATE TABLE "new_FetchRun" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "started_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'running',
    "provider" TEXT,
    "total_streamers" INTEGER NOT NULL DEFAULT 0,
    "completed_streamers" INTEGER NOT NULL DEFAULT 0,
    "failed_streamers" INTEGER NOT NULL DEFAULT 0,
    "total_clips_found" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" DATETIME,
    "streamer_list_id" INTEGER,
    CONSTRAINT "FetchRun_streamer_list_id_fkey" FOREIGN KEY ("streamer_list_id") REFERENCES "StreamerList" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_FetchRun" ("completed_streamers", "created_at", "ended_at", "error_summary", "failed_streamers", "finished_at", "id", "provider", "started_at", "status", "total_clips_found", "total_streamers") SELECT "completed_streamers", "created_at", "ended_at", "error_summary", "failed_streamers", "finished_at", "id", "provider", "started_at", "status", "total_clips_found", "total_streamers" FROM "FetchRun";
DROP TABLE "FetchRun";
ALTER TABLE "new_FetchRun" RENAME TO "FetchRun";
CREATE INDEX "FetchRun_status_idx" ON "FetchRun"("status");
CREATE INDEX "FetchRun_created_at_idx" ON "FetchRun"("created_at");
CREATE INDEX "FetchRun_streamer_list_id_idx" ON "FetchRun"("streamer_list_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "StreamerListEntry_streamer_list_id_idx" ON "StreamerListEntry"("streamer_list_id");

-- CreateIndex
CREATE UNIQUE INDEX "StreamerListEntry_streamer_list_id_streamer_id_key" ON "StreamerListEntry"("streamer_list_id", "streamer_id");

-- Seed: Default streamer list and migrate existing streamers
INSERT INTO "StreamerList" ("name", "is_active", "created_at", "updated_at")
SELECT 'Default', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "StreamerList" WHERE "name" = 'Default');

INSERT INTO "StreamerListEntry" ("streamer_list_id", "streamer_id", "active")
SELECT sl.id, s.id, s.active
FROM "Streamer" s
CROSS JOIN (SELECT id FROM "StreamerList" WHERE "name" = 'Default' LIMIT 1) sl
WHERE NOT EXISTS (
  SELECT 1 FROM "StreamerListEntry" e
  WHERE e.streamer_list_id = sl.id AND e.streamer_id = s.id
);

UPDATE "FetchRun"
SET "streamer_list_id" = (SELECT id FROM "StreamerList" WHERE "name" = 'Default' LIMIT 1)
WHERE "streamer_list_id" IS NULL;
