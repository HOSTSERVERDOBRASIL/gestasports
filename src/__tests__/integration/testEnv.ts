// Defaults to the local docker-compose Postgres (see docker-compose.yml, port 5434) with a
// dedicated database so integration tests never touch dev data. Overridable via TEST_DATABASE_URL
// so CI can point at its own Postgres service container (typically on the default port 5432)
// without editing this file.
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5434/flamilha_test?schema=public";
