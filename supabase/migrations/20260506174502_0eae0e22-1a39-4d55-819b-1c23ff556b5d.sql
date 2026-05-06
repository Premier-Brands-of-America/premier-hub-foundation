create or replace function public.is_feature_enabled(p_feature_key text)
returns boolean language plpgsql security definer stable set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_dept uuid;
  v_user_flag boolean;
  v_dept_flag boolean;
  v_global_flag boolean;
begin
  if v_uid is null then return false; end if;

  select department_id into v_dept from public.profiles where user_id = v_uid;

  select enabled into v_user_flag
  from public.feature_flags
  where feature_key = p_feature_key and entity_type = 'user' and entity_id = v_uid
  limit 1;
  if v_user_flag is not null then return v_user_flag; end if;

  if v_dept is not null then
    select enabled into v_dept_flag
    from public.feature_flags
    where feature_key = p_feature_key and entity_type = 'department' and entity_id = v_dept
    limit 1;
    if v_dept_flag is not null then return v_dept_flag; end if;
  end if;

  select enabled into v_global_flag
  from public.feature_flags
  where feature_key = p_feature_key and entity_type = 'global' and entity_id is null
  limit 1;

  return coalesce(v_global_flag, true);
end $$;

grant execute on function public.is_feature_enabled(text) to authenticated;

create or replace function public.resolve_features(p_keys text[])
returns table(feature_key text, enabled boolean) language plpgsql security definer stable set search_path = public as $$
begin
  return query
    select k, public.is_feature_enabled(k) from unnest(p_keys) k;
end $$;

grant execute on function public.resolve_features(text[]) to authenticated;