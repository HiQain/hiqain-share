# SPanel deployment

This directory is a complete production bundle. Upload its contents to a
directory in your SPanel account, for example:

`/home/YOUR_ACCOUNT/nodejsapps/hiqain-share`

## First deployment

1. In SPanel, create a MariaDB/MySQL database and database user, then grant the
   user all privileges on that database.
2. Open phpMyAdmin, select the database, and import `setup.sql`.
3. Edit `.env` and set `DATABASE_URL` to the database credentials from SPanel.
   Leave `USE_IN_MEMORY_STORE=false`. SPanel may override `PORT` with the port
   assigned by its Node.js manager.
4. Open SPanel's terminal or connect over SSH, change into this directory, and
   run:

   ```sh
   npm ci --omit=dev
   ```

5. In **Node.js Manager**, create the application for your domain. Use
   `nodejsapps/hiqain-share/app.js` as the executable path. Select the domain,
   leave the URL path empty to serve it at the domain root, and let SPanel
   assign a port (or select an unused port from 3000 through 3500).
6. Start or restart the application.
7. Verify `https://YOUR_DOMAIN/api/healthz`. It should return
   `{"status":"ok"}`.

## Updating an existing deployment

Stop the Node.js app, replace the remote files with this directory's contents,
run `npm ci --omit=dev`, and start/restart the app. Keep the production `.env`
if its credentials differ from the copy in this bundle. `setup.sql` uses
`CREATE TABLE IF NOT EXISTS`, so importing it again is safe but unnecessary
when the schema already exists.

## Included runtime layout

- `app.js` - SPanel startup file
- `dist/index.mjs` - bundled API server
- `public/` - compiled React site served by the API server
- `package.json` and `package-lock.json` - production Node dependencies
- `.env` - runtime configuration
- `setup.sql` - database bootstrap schema

