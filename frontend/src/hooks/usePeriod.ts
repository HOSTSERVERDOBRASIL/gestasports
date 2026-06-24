import { useMemo, useState } from "react";

const PERIOD_MONTH_KEY = "gestasports-period-month";
const PERIOD_YEAR_KEY = "gestasports-period-year";

function getDefaultPeriod() {
  const now = new Date();
  const fallbackMonth = now.getUTCMonth() + 1;
  const fallbackYear = now.getUTCFullYear();

  const storedMonth = Number(localStorage.getItem(PERIOD_MONTH_KEY));
  const storedYear = Number(localStorage.getItem(PERIOD_YEAR_KEY));

  return {
    month: Number.isInteger(storedMonth) && storedMonth >= 1 && storedMonth <= 12 ? storedMonth : fallbackMonth,
    year: Number.isInteger(storedYear) && storedYear >= 1980 && storedYear <= 2100 ? storedYear : fallbackYear
  };
}

export function usePeriod() {
  const defaults = useMemo(() => getDefaultPeriod(), []);
  const [month, setMonthState] = useState(defaults.month);
  const [year, setYearState] = useState(defaults.year);

  function setMonth(value: number) {
    setMonthState(value);
    localStorage.setItem(PERIOD_MONTH_KEY, String(value));
  }

  function setYear(value: number) {
    setYearState(value);
    localStorage.setItem(PERIOD_YEAR_KEY, String(value));
  }

  return { month, year, setMonth, setYear };
}
