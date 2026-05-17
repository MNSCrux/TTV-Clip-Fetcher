-- CreateTable
CREATE TABLE "Streamer" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "handle" TEXT NOT NULL,
    "twitch_user_id" TEXT,
    "display_name" TEXT NOT NULL,
    "twitch_display_name" TEXT,
    "profile_image_url" TEXT,
    "game_group" TEXT NOT NULL DEFAULT 'unknown',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "email" TEXT,
    "notes" TEXT,
    "source_section" TEXT,
    "original_sheet_status" TEXT,
    "restriction_status" TEXT NOT NULL DEFAULT 'approved_or_unrestricted',
    "last_resolved_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Clip" (
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
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "Clip_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "Streamer" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FetchRun" (
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
    "finished_at" DATETIME
);

-- CreateTable
CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ClipList" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "links_text" TEXT NOT NULL,
    "clip_count" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "StreamerFetchError" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fetch_run_id" INTEGER NOT NULL,
    "handle" TEXT NOT NULL,
    "twitch_user_id" TEXT,
    "error_message" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streamer_id" INTEGER,
    CONSTRAINT "StreamerFetchError_fetch_run_id_fkey" FOREIGN KEY ("fetch_run_id") REFERENCES "FetchRun" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StreamerFetchError_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "Streamer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Streamer_handle_key" ON "Streamer"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Streamer_twitch_user_id_key" ON "Streamer"("twitch_user_id");

-- CreateIndex
CREATE INDEX "Streamer_active_idx" ON "Streamer"("active");

-- CreateIndex
CREATE INDEX "Streamer_game_group_idx" ON "Streamer"("game_group");

-- CreateIndex
CREATE INDEX "Streamer_restriction_status_idx" ON "Streamer"("restriction_status");

-- CreateIndex
CREATE INDEX "Streamer_twitch_user_id_idx" ON "Streamer"("twitch_user_id");

-- CreateIndex
CREATE INDEX "Clip_created_at_idx" ON "Clip"("created_at");

-- CreateIndex
CREATE INDEX "Clip_view_count_idx" ON "Clip"("view_count");

-- CreateIndex
CREATE INDEX "Clip_broadcaster_id_idx" ON "Clip"("broadcaster_id");

-- CreateIndex
CREATE INDEX "Clip_review_status_idx" ON "Clip"("review_status");

-- CreateIndex
CREATE INDEX "Clip_selected_idx" ON "Clip"("selected");

-- CreateIndex
CREATE INDEX "Clip_rejected_idx" ON "Clip"("rejected");

-- CreateIndex
CREATE INDEX "Clip_streamer_id_idx" ON "Clip"("streamer_id");

-- CreateIndex
CREATE UNIQUE INDEX "Clip_source_external_id_key" ON "Clip"("source", "external_id");

-- CreateIndex
CREATE INDEX "FetchRun_status_idx" ON "FetchRun"("status");

-- CreateIndex
CREATE INDEX "FetchRun_created_at_idx" ON "FetchRun"("created_at");

-- CreateIndex
CREATE INDEX "StreamerFetchError_fetch_run_id_idx" ON "StreamerFetchError"("fetch_run_id");

-- CreateIndex
CREATE INDEX "StreamerFetchError_streamer_id_idx" ON "StreamerFetchError"("streamer_id");

