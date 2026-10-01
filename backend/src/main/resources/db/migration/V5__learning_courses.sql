create table learning_course (
 id uuid primary key, owner_id uuid not null references app_user(id), course_key text not null,
 title text not null, description text not null, kind varchar(30) not null, level varchar(20), position integer not null,
 unique(owner_id,course_key)
);
create table course_lesson (
 id uuid primary key, course_id uuid not null references learning_course(id), lesson_key text not null,
 title text not null, position integer not null, optional boolean not null default false,
 deck_id uuid not null references deck(id), unique(course_id,lesson_key)
);
create table lesson_card (
 lesson_id uuid not null references course_lesson(id), card_id uuid not null references card(id),
 position integer not null, primary key(lesson_id,card_id), unique(lesson_id,position)
);
create index lesson_card_card on lesson_card(card_id);
alter table user_settings add column active_lesson_id uuid references course_lesson(id);
alter table study_session add column lesson_id uuid references course_lesson(id);
create index review_user_card_rating on review_log(user_id,card_id,rating);
