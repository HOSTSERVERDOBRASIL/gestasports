export const DEFAULT_LOCALE = "pt-BR";
export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";
export const DEFAULT_CURRENCY = "BRL";
export const DEFAULT_LANGUAGE_LABEL = "Português do Brasil";

export function applyBrazilianPortugueseDefaults() {
  document.documentElement.lang = DEFAULT_LOCALE;
  document.documentElement.dir = "ltr";
  document.documentElement.dataset.locale = DEFAULT_LOCALE;
  document.documentElement.dataset.language = DEFAULT_LANGUAGE_LABEL;
}
