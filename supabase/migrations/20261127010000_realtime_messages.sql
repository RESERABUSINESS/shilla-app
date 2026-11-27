-- Live chat: stream new messages to clients. Realtime applies the table's RLS,
-- so a client only receives messages from sessions it participates in.
alter publication supabase_realtime add table public.messages;
