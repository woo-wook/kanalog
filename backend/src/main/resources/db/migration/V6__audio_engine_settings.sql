alter table user_settings add column audio_engine varchar(20) not null default 'SUPERTONIC'
    check(audio_engine in ('SUPERTONIC','ORIGINAL','DEVICE'));
alter table user_settings add column supertonic_voice varchar(2) not null default 'F1'
    check(supertonic_voice in ('F1','F2','F3','F4','F5','M1','M2','M3','M4','M5'));
