# WORK IN PROGRESS

# wirus

## Jak wystartowac apke

### Wymagania

- Node.js 22+
- `pnpm` 10+
- Redis na `127.0.0.1:6379`

### Instalacja

```bash
pnpm install
cp apps/backend/.env.local.example apps/backend/.env.local
cp apps/frontend/.env.local.example apps/frontend/.env.local
```

Domyslna konfiguracja po skopiowaniu plikow:

- frontend: `http://localhost:3100`
- backend: `http://localhost:3101`
- websocket: `http://localhost:3101/rooms`

### Start lokalny

Jesli masz juz uruchomionego Redisa lokalnie:

```bash
pnpm dev
```

To odpala frontend i backend rownolegle.

### Start lokalny z Dockerem dla Redisa

Jesli nie masz lokalnego Redisa, najprostsza opcja to:

```bash
pnpm dev:local
```

Ten skrypt:

- uruchamia kontener Docker `wirus-redis` na porcie `6379`
- buduje pakiety wspoldzielone
- startuje backend i frontend

Po zatrzymaniu skryptu (`Ctrl+C`) kontener `wirus-redis` tez jest zatrzymywany, wiec przy zwyklym ponownym starcie pokoje nie powinny zostawac.

### Czysty restart lokalny

Jesli chcesz wymusic start bez zadnych starych danych z Redisa:

```bash
pnpm dev:local:reset
```

Ten wariant usuwa poprzedni kontener `wirus-redis`, stawia swiezy i dopiero potem uruchamia aplikacje.

### Osobne uruchamianie

Backend:

```bash
pnpm --filter @wirus/backend dev
```

Frontend:

```bash
pnpm --filter @wirus/frontend dev
```
