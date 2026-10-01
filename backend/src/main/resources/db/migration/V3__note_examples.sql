create table note_example (
 id uuid primary key,
 owner_id uuid not null references app_user(id),
 note_id uuid not null references study_note(id) on delete cascade,
 ordinal integer not null check (ordinal >= 0),
 japanese text not null,
 reading text,
 korean text,
 audio_id uuid references media_asset(id),
 unique(note_id,ordinal)
);
create index note_example_owner_note on note_example(owner_id,note_id,ordinal);
