create table app_user (
 id uuid primary key, email varchar(320) not null unique, password_hash varchar(100) not null,
 timezone varchar(80) not null default 'Asia/Seoul', created_at timestamptz not null default now()
);
create table auth_session (
 token_hash char(64) primary key, user_id uuid not null references app_user(id) on delete cascade,
 csrf_token varchar(100) not null, expires_at timestamptz not null, created_at timestamptz not null default now()
);
create index auth_session_user on auth_session(user_id);
create table user_settings (
 user_id uuid primary key references app_user(id) on delete cascade,
 daily_new_limit integer not null default 10 check (daily_new_limit between 0 and 100),
 show_reading_hint boolean not null default false, show_hangul_hint boolean not null default false,
 auto_play_audio boolean not null default false, allow_audio_before_reveal boolean not null default true,
 tts_fallback boolean not null default false, playback_speed numeric(3,2) not null default 1
);
create table content_source (
 id uuid primary key, owner_id uuid not null references app_user(id), source_key varchar(120) not null,
 source_version varchar(100) not null, source_url text, sha256 char(64), notice text,
 unique(owner_id,source_key,source_version)
);
create table deck (
 id uuid primary key, owner_id uuid not null references app_user(id), source_id uuid references content_source(id),
 source_path text not null, title text not null, level varchar(20), kind varchar(30) not null,
 import_status varchar(20) not null default 'READY', selected boolean not null default false,
 unique(owner_id,source_id,source_path)
);
create index deck_owner on deck(owner_id);
create unique index personal_deck_owner_path on deck(owner_id,source_path) where source_id is null;
create table study_note (
 id uuid primary key, owner_id uuid not null references app_user(id), source_id uuid references content_source(id),
 source_note_id varchar(100), source_guid varchar(200), kind varchar(30) not null, front text not null,
 reading text, meaning text, example text, example_meaning text, explanation text,
 hangul_hint text, personal_memo text, raw_fields text, tags text, updated_at timestamptz not null default now(),
 unique(owner_id,source_id,source_guid)
);
create index note_owner_front on study_note(owner_id,front);
create table card (
 id uuid primary key, owner_id uuid not null references app_user(id), deck_id uuid not null references deck(id),
 note_id uuid not null references study_note(id), source_card_id varchar(100), direction varchar(30) not null,
 word_audio_id uuid, example_audio_id uuid, active boolean not null default true,
 unique(owner_id,deck_id,note_id,direction)
);
create index card_deck on card(deck_id,active);
create table media_asset (
 id uuid primary key, owner_id uuid not null references app_user(id), source_id uuid not null references content_source(id),
 original_name text not null, storage_path text not null, sha256 char(64) not null, mime varchar(100) not null,
 size_bytes bigint not null, unique(owner_id,source_id,original_name)
);
alter table card add constraint fk_word_audio foreign key(word_audio_id) references media_asset(id);
alter table card add constraint fk_example_audio foreign key(example_audio_id) references media_asset(id);
create table user_card_state (
 id uuid primary key, user_id uuid not null references app_user(id), card_id uuid not null references card(id),
 fsrs_json text, due_at timestamptz, first_seen_at timestamptz, last_reviewed_at timestamptz,
 suspended boolean not null default false, version bigint not null default 0,
 unique(user_id,card_id)
);
create index state_due on user_card_state(user_id,due_at);
create table study_session (
 id uuid primary key, user_id uuid not null references app_user(id), deck_id uuid not null references deck(id),
 started_at timestamptz not null, finished_at timestamptz
);
create table session_card (
 session_id uuid not null references study_session(id) on delete cascade, card_id uuid not null references card(id),
 position integer not null, primary key(session_id,card_id)
);
create table review_log (
 id uuid primary key, user_id uuid not null references app_user(id), card_id uuid not null references card(id),
 session_id uuid not null references study_session(id), rating varchar(10) not null,
 reviewed_at timestamptz not null, previous_state text, next_state text not null,
 previous_version bigint not null, next_version bigint not null, idempotency_key varchar(100) not null,
 request_hash char(64) not null, scheduler_version varchar(80) not null,
 scheduler_settings text not null, unique(user_id,idempotency_key)
);
create index review_user_at on review_log(user_id,reviewed_at);
create table bookmark (
 user_id uuid not null references app_user(id), note_id uuid not null references study_note(id),
 primary key(user_id,note_id)
);
create table import_job (
 id uuid primary key, owner_id uuid not null references app_user(id), source_id uuid references content_source(id),
 file_name text not null, status varchar(30) not null, started_at timestamptz not null,
 finished_at timestamptz, report_json text, error_message text
);
create index import_owner on import_job(owner_id,started_at);
create table login_attempt (
 email_hash char(64) primary key, failures integer not null, blocked_until timestamptz,
 updated_at timestamptz not null
);
