-- User-scoped latest kana evaluation; keep all original review/practice history.
create table kana_practice_state (
 user_id uuid not null references app_user(id),
 card_id uuid not null references card(id),
 last_rating varchar(10) not null check(last_rating in ('AGAIN','HARD','GOOD','EASY')),
 answered_at timestamptz not null,
 attempts integer not null check(attempts>0),
 primary key(user_id,card_id)
);

insert into kana_practice_state(user_id,card_id,last_rating,answered_at,attempts)
select user_id,card_id,rating,answered_at,attempts from (
 select h.*,count(*) over(partition by h.user_id,h.card_id)::int attempts,
 row_number() over(partition by h.user_id,h.card_id order by h.answered_at desc,h.id desc) ordinal
 from (
  select id,user_id,card_id,rating,answered_at from practice_answer
  union all
  select id,user_id,card_id,rating,reviewed_at from review_log
 ) h join card c on c.id=h.card_id and c.owner_id=h.user_id
 join study_note n on n.id=c.note_id and n.kind in ('hiragana','katakana')
) latest where ordinal=1;
