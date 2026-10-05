# Deploy automatico

## Flusso consigliato (webhook GitHub)

1. Lavori in locale o con Claude Code
2. `git push origin main`
3. GitHub chiama `https://demo.menucolcodice.it/api/deploy/webhook`
4. Il server esegue `scripts/deploy.sh` (pull, build, restart PM2)

### Setup una tantum sul server

```bash
cd /var/www/vhosts/demo.menucolcodice.it/httpdocs
chmod +x scripts/setup-deploy-webhook.sh scripts/deploy.sh
./scripts/setup-deploy-webhook.sh
pm2 restart demo-menucolcodice-it
```

### Deploy manuale

```bash
./scripts/deploy.sh
# oppure
npm run deploy
```

### Log

```bash
tail -f /var/www/vhosts/demo.menucolcodice.it/logs/deploy-webhook.log
```

## GitHub Actions (opzionale)

Il file `.github/workflows/deploy.yml` richiede al token GitHub lo scope `workflow`.
Se in futuro lo abiliti, Actions può fare deploy via SSH usando i secret:

- `DEPLOY_HOST`
- `DEPLOY_USER`
- `DEPLOY_SSH_KEY`

## Note

- `.env.production` e `platform/*.json` restano solo sul server (gitignore).
- `deploy.sh` si ferma se ci sono modifiche locali non committate.
- Un solo deploy alla volta (lock file).
