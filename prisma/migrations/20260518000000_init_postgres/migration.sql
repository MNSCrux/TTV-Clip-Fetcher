-- CreateTable
CREATE TABLE "Streamer" (
    "id" SERIAL NOT NULL,
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
    "last_resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Streamer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StreamerList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StreamerList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StreamerListEntry" (
    "id" SERIAL NOT NULL,
    "streamer_list_id" INTEGER NOT NULL,
    "streamer_id" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "StreamerListEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Clip" (
    "id" TEXT NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL,
    "thumbnail_url" TEXT,
    "duration" INTEGER,
    "vod_offset" INTEGER,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scraped_at" TIMESTAMP(3),
    "raw_json" TEXT,
    "review_status" TEXT NOT NULL DEFAULT 'unreviewed',
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "rejected" BOOLEAN NOT NULL DEFAULT false,
    "downloaded" BOOLEAN NOT NULL DEFAULT false,
    "local_file_path" TEXT,
    "notes" TEXT,
    "streamer_id" INTEGER NOT NULL,
    "fetch_run_id" INTEGER,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Clip_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FetchRun" (
    "id" SERIAL NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'running',
    "provider" TEXT,
    "total_streamers" INTEGER NOT NULL DEFAULT 0,
    "completed_streamers" INTEGER NOT NULL DEFAULT 0,
    "failed_streamers" INTEGER NOT NULL DEFAULT 0,
    "total_clips_found" INTEGER NOT NULL DEFAULT 0,
    "error_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "streamer_list_id" INTEGER,
    CONSTRAINT "FetchRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AppSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AppSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "ClipList" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "links_text" TEXT NOT NULL,
    "clip_count" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClipList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StreamerFetchError" (
    "id" SERIAL NOT NULL,
    "fetch_run_id" INTEGER NOT NULL,
    "handle" TEXT NOT NULL,
    "twitch_user_id" TEXT,
    "error_message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "streamer_id" INTEGER,
    CONSTRAINT "StreamerFetchError_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Streamer_handle_key" ON "Streamer"("handle");
CREATE UNIQUE INDEX "Streamer_twitch_user_id_key" ON "Streamer"("twitch_user_id");
CREATE INDEX "Streamer_active_idx" ON "Streamer"("active");
CREATE INDEX "Streamer_game_group_idx" ON "Streamer"("game_group");
CREATE INDEX "Streamer_restriction_status_idx" ON "Streamer"("restriction_status");
CREATE INDEX "Streamer_twitch_user_id_idx" ON "Streamer"("twitch_user_id");
CREATE INDEX "StreamerListEntry_streamer_list_id_idx" ON "StreamerListEntry"("streamer_list_id");
CREATE UNIQUE INDEX "StreamerListEntry_streamer_list_id_streamer_id_key" ON "StreamerListEntry"("streamer_list_id", "streamer_id");
CREATE INDEX "Clip_created_at_idx" ON "Clip"("created_at");
CREATE INDEX "Clip_view_count_idx" ON "Clip"("view_count");
CREATE INDEX "Clip_broadcaster_id_idx" ON "Clip"("broadcaster_id");
CREATE INDEX "Clip_review_status_idx" ON "Clip"("review_status");
CREATE INDEX "Clip_selected_idx" ON "Clip"("selected");
CREATE INDEX "Clip_rejected_idx" ON "Clip"("rejected");
CREATE INDEX "Clip_streamer_id_idx" ON "Clip"("streamer_id");
CREATE INDEX "Clip_fetch_run_id_idx" ON "Clip"("fetch_run_id");
CREATE UNIQUE INDEX "Clip_source_external_id_fetch_run_id_key" ON "Clip"("source", "external_id", "fetch_run_id");
CREATE INDEX "FetchRun_status_idx" ON "FetchRun"("status");
CREATE INDEX "FetchRun_created_at_idx" ON "FetchRun"("created_at");
CREATE INDEX "FetchRun_streamer_list_id_idx" ON "FetchRun"("streamer_list_id");
CREATE INDEX "StreamerFetchError_fetch_run_id_idx" ON "StreamerFetchError"("fetch_run_id");
CREATE INDEX "StreamerFetchError_streamer_id_idx" ON "StreamerFetchError"("streamer_id");

ALTER TABLE "StreamerListEntry" ADD CONSTRAINT "StreamerListEntry_streamer_list_id_fkey" FOREIGN KEY ("streamer_list_id") REFERENCES "StreamerList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StreamerListEntry" ADD CONSTRAINT "StreamerListEntry_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "Streamer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Clip" ADD CONSTRAINT "Clip_fetch_run_id_fkey" FOREIGN KEY ("fetch_run_id") REFERENCES "FetchRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FetchRun" ADD CONSTRAINT "FetchRun_streamer_list_id_fkey" FOREIGN KEY ("streamer_list_id") REFERENCES "StreamerList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StreamerFetchError" ADD CONSTRAINT "StreamerFetchError_fetch_run_id_fkey" FOREIGN KEY ("fetch_run_id") REFERENCES "FetchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StreamerFetchError" ADD CONSTRAINT "StreamerFetchError_streamer_id_fkey" FOREIGN KEY ("streamer_id") REFERENCES "Streamer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
