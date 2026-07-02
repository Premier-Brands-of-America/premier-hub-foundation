# Premier Hub v2 — HANDOFF / estado para continuar

_Última actualización: 2026-07-02. Rama de trabajo: `feat/premier-hub-revamp` (pusheada a origin, 141+ commits sobre `main`)._

## Qué es / dónde vive
- **App:** premier-hub-foundation (Vite + React + TS + Tailwind + shadcn + Supabase).
- **Frontend en prod:** `https://premierhub.pba` — server local **mylogger** = `pbaapps01` (Debian, LAN 192.168.100.240, SSH puerto 203), nginx, dir `/var/www/premierhub`. Multi-app (no tocar talcspt ni Grafana). HTTPS con cert AD CS.
- **Backend:** Supabase proyecto `yogscxuhjalgwngefbta` (Postgres + RLS + Edge Functions + Auth Azure/Entra). Login = solo M365.
- **Repo:** github.com/Premier-Brands-of-America/premier-hub-foundation, rama `feat/premier-hub-revamp`.

## Estado — TODO LIVE en prod (2026-07-02)
- v2 completo con datos reales (no demo en prod; demo solo en preview vía `isPreviewEnvironment()`).
- **Break-glass admin access** (privacidad): admin no ve lo privado ajeno por default; "Acceder para soporte" con motivo → temporal, audit_log + notifica al dueño.
- **Art requests:** "Submit Art Request", project type multi-select, Customer "Other" write-in, Files=Reference/Final (app + SharePoint auto-provision), marcas reales, borrar/editar (owner), notificación in-app al manager asignado.
- **M365:** login, calendar (día), org directory sync, Org chart con jerarquía real (managers resueltos sobre todo el directorio) + filtra inactivos.
- **Memory KG ("graphify in-app"):** /memory (admin-only + grants por user/depto en Admin Settings + log append-only). Edge fns memory-extract (Claude extrae conceptos/relaciones), memory-search + ai-assistant RAG (pgvector gte-small), memory-wiki. Botón "Rebuild memory" (procesa ~20 items/corrida).
- **UX:** nav Projects hub con tabs, botón Save tranquilizador, Backlinks→"Mentioned in" + tooltip, Memory admin-only, Audit Log real.

## PENDIENTES
1. **Brand Guidelines drag&drop** (FullBriefRequest.tsx:348, hoy es URL). Subir como attachment "reference" DESPUÉS de crear el request (el bucket art-requests exige request ligado); o bucket público dedicado.
2. **Icons de request** (izquierda) → reducir a 2 (simple/complejo), más art-related. EN HOLD hasta que Dan confirme cuáles son.
3. **Transcripts (Teams):** código listo (graph-subscribe/renew/webhook/transcribe-summarize/transcript-action-items + tablas). Falta infra Microsoft: permiso app-only `OnlineMeetingTranscript.Read.All` + admin consent; Application Access Policy Teams (confirmar `PremierHubTranscripts`); secret `GRAPH_WEBHOOK_URL`; cron graph-renew; + cablear botón "Activar transcripts" y el picker que enlaza el bloque /meet con meeting_transcripts. Ver research/integrations.md.
4. **Memory KG:** dar "Rebuild memory" varias veces para procesar todo el contenido. Nivel futuro: definir mejor la extracción/RAG (Edwin ofreció un "memory project").
5. **Seguridad:** rotar/reemitir el cert AD CS (el password del PFX viajó por chat).

## COMANDOS CLAVE
### Redeploy frontend (desde la Mac Studio) — reintentos por si el VPN/sshd da "Connection refused"
```bash
cd ~/Developer/PremierHubv3/premier-hub-foundation
zsh -lc "npm run build"
LH=$(md5 -q dist/index.html); tar czf /tmp/premierhub-dist.tgz -C dist .
for i in 1 2 3; do scp -o BatchMode=yes /tmp/premierhub-dist.tgz mylogger:/tmp/ && break; sleep 5; done
for i in 1 2 3; do ssh -o BatchMode=yes mylogger "rm -rf /var/www/premierhub/* && tar xzf /tmp/premierhub-dist.tgz -C /var/www/premierhub && chown -R www-data:www-data /var/www/premierhub && rm -f /tmp/premierhub-dist.tgz && md5sum /var/www/premierhub/index.html" && break; sleep 5; done
# verificar: el md5 remoto debe == $LH
ssh mylogger 'curl -sk --resolve premierhub.pba:443:127.0.0.1 -o /dev/null -w "%{http_code}\n" https://premierhub.pba'
```
### Backend (necesita el token; el keychain no se lee por SSH headless)
```bash
export SUPABASE_ACCESS_TOKEN='sbp_...'
supabase db push
supabase functions deploy <fn>        # p.ej. memory-extract memory-search memory-wiki ai-assistant graph-user-directory sharepoint-provision
```
Nota: NO uses secrets con prefijo `SUPABASE_` (reservado); el service key auto-inyectado es `SUPABASE_SERVICE_ROLE_KEY`. Las edge fns deben usar `Deno.serve` nativo (no `serve` de deno.land → timeout de bundling).

### Corrida autónoma supervisada (para features grandes)
Harness en `~/Developer/PremierHubv3/.run/`: editar `prompt.txt`, borrar `DONE`, lanzar:
```bash
/opt/homebrew/bin/tmux new-session -d -s phubv3-sup "~/Developer/PremierHubv3/.run/supervisor.sh"
```
Estado: `python3 .run/status_parse.py .run/run.log`; se crea `.run/DONE` al terminar. ntfy notifica.

## Reglas
Nunca push a main/master. Migraciones y functions se escriben, Edwin las pushea/deploya. Commits en español, pequeños. Todo RLS-scoped + privacidad primero.
