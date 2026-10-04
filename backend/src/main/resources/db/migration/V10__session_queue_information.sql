-- Retain the server-generated reason and next due time when reloading an empty session.
alter table study_session add column queue_info_json text;
