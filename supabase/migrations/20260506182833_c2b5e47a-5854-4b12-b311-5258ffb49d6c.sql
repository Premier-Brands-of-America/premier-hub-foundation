create or replace function public.audit_feature_flags()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor uuid;
begin
  select id into v_actor from public.profiles where user_id = auth.uid() limit 1;
  insert into public.audit_log(actor_id, entity_type, entity_id, action, before, after)
  values (
    v_actor,
    'feature_flag',
    coalesce(new.id, old.id),
    tg_op,
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

drop trigger if exists trg_audit_feature_flags on public.feature_flags;
create trigger trg_audit_feature_flags
after insert or update or delete on public.feature_flags
for each row execute function public.audit_feature_flags();