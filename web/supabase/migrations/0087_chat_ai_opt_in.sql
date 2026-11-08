-- The website chat assistant is opt-in: a team turns automated answers on in Inbox > Website chats; until then, chat
-- messages simply wait for a person. Teams still on the old 'answer' default never chose it, so they go to 'off';
-- teams that picked 'book' chose it and keep it.
alter table public.organizations alter column chat_ai set default 'off';
update public.organizations set chat_ai = 'off' where chat_ai = 'answer';
