-- Run after switching the frontend to the Edge Function.
revoke execute on function public.cancel_registration(uuid,text) from public,anon,authenticated;
revoke execute on function public.register_player(uuid,text) from public,anon,authenticated;
revoke execute on function public.get_games() from public,anon,authenticated;
revoke execute on function public.admin_get_players(text) from public,anon,authenticated;
revoke execute on function public.is_admin(text) from public,anon,authenticated;
revoke execute on function public.admin_add_player(text,text,integer) from public,anon,authenticated;
revoke execute on function public.admin_set_level(text,uuid,integer) from public,anon,authenticated;
revoke execute on function public.admin_create_game(text,date) from public,anon,authenticated;
revoke execute on function public.admin_delete_game(text,uuid) from public,anon,authenticated;
revoke execute on function public.admin_save_teams(text,uuid,jsonb) from public,anon,authenticated;
revoke all on public.settings from public,anon,authenticated;
alter function public.norm(text) set search_path = public;
