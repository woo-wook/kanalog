-- Additive: existing card identities, scheduler JSON, progress and audio are preserved.
alter table user_settings add column practice_level varchar(2) not null default 'N5'
    check(practice_level in ('N5','N4','N3','N2','N1'));
alter table study_session add column reinforcement_enabled boolean not null default false;
alter table session_card add column retry_pending boolean not null default false;
alter table session_card add column retry_version bigint not null default 0;
create table reinforcement_answer (
 id uuid primary key,
 user_id uuid not null references app_user(id),
 session_id uuid not null references study_session(id),
 card_id uuid not null references card(id),
 rating varchar(10) not null check(rating in ('AGAIN','HARD','GOOD','EASY')),
 answered_at timestamptz not null default now(),
 idempotency_key varchar(100) not null,
 request_hash char(64) not null,
 card_version bigint not null,
 unique(user_id,idempotency_key),
 unique(session_id,card_id)
);
create table review_followup (
 user_id uuid not null references app_user(id),
 card_id uuid not null references card(id),
 due_at timestamptz not null,
 primary key(user_id,card_id)
);
create index review_followup_due on review_followup(user_id,due_at);

alter table review_log add column retry_card_json text;
