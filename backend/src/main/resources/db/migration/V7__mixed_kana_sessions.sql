-- Existing session/card IDs and FSRS history are preserved.
alter table study_session alter column deck_id drop not null;
alter table study_session add column session_title text;
alter table study_session add column practice boolean not null default false;

create table practice_answer (
 id uuid primary key,
 user_id uuid not null references app_user(id),
 session_id uuid not null references study_session(id),
 card_id uuid not null references card(id),
 rating varchar(10) not null check(rating in ('AGAIN','HARD','GOOD','EASY')),
 answered_at timestamptz not null default now(),
 idempotency_key varchar(100) not null,
 request_hash char(64) not null,
 unique(user_id,idempotency_key),
 unique(session_id,card_id)
);
