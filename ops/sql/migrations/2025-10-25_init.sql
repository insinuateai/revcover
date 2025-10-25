alter table receipts add column if not exists reason_code text;
alter table receipts add column if not exists action_source text;
alter table receipts add column if not exists attribution_hash text;
