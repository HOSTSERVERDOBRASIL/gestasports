const reservedRootPaths = new Set([
  "",
  "login",
  "convite",
  "recuperar-senha",
  "superadmin",
  "associados",
  "convites",
  "auditoria",
  "atletas",
  "elenco",
  "diretoria",
  "comissao-tecnica",
  "goleiros",
  "clubes",
  "equipes",
  "campos",
  "adversarios",
  "financeiro",
  "historico",
  "eventos",
  "jogos",
  "minha-conta",
  "cadastrar-jogo",
  "agenda-jogos",
  "escalacoes",
  "participacao",
  "artilharia",
  "assistencias",
  "participacoes",
  "disciplina",
  "confrontos",
  "rankings",
  "convocacoes",
  "competicoes",
  "galeria",
  "relatorios",
  "configuracoes",
  "uniformes",
  "memorial",
  "dashboard",
  "create-game"
]);

export function getTenantSlugFromPath(pathname = window.location.pathname) {
  const segment = pathname.split("/").filter(Boolean)[0]?.toLowerCase() ?? "";
  return reservedRootPaths.has(segment) ? "" : segment;
}

export function getTenantBasename(pathname = window.location.pathname) {
  const slug = getTenantSlugFromPath(pathname);
  return slug ? `/${slug}` : undefined;
}

export function getWorkspaceStorageKey() {
  const slug = getTenantSlugFromPath();
  return `${window.location.hostname}${slug ? `/${slug}` : ""}`;
}
