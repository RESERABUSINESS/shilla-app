-- Security advisor: pin the search_path of notification_text.
alter function private.notification_text(text, text, text) set search_path = public;
