import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type DatePreset =
  "today" | "7d" | "30d" | "this_month" | "last_month" | "custom";

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export const getPresetDates = (
  preset: DatePreset,
): { from: string; to: string } => {
  const now = new Date();
  const todayStr = formatDate(now);

  switch (preset) {
    case "today":
      return { from: todayStr, to: todayStr };
    case "7d": {
      const d = new Date();
      d.setDate(d.getDate() - 6);
      return { from: formatDate(d), to: todayStr };
    }
    case "30d": {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { from: formatDate(d), to: todayStr };
    }
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: formatDate(start), to: todayStr };
    }
    case "last_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { from: formatDate(start), to: formatDate(end) };
    }
    case "custom":
    default: {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { from: formatDate(d), to: todayStr };
    }
  }
};

export const useDateRange = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const urlPreset = (searchParams.get("preset") as DatePreset) || "30d";
  const urlFrom = searchParams.get("from");
  const urlTo = searchParams.get("to");

  const { from, to, preset } = useMemo(() => {
    if (urlPreset === "custom" && urlFrom && urlTo) {
      return { from: urlFrom, to: urlTo, preset: "custom" as DatePreset };
    }
    const dates = getPresetDates(urlPreset);
    return {
      from: urlFrom || dates.from,
      to: urlTo || dates.to,
      preset: urlPreset,
    };
  }, [urlPreset, urlFrom, urlTo]);

  const setRange = (
    newPreset: DatePreset,
    customFrom?: string,
    customTo?: string,
  ) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("preset", newPreset);

    if (newPreset === "custom" && customFrom && customTo) {
      nextParams.set("from", customFrom);
      nextParams.set("to", customTo);
    } else {
      const dates = getPresetDates(newPreset);
      nextParams.set("from", dates.from);
      nextParams.set("to", dates.to);
    }

    setSearchParams(nextParams, { replace: true });
  };

  return {
    from,
    to,
    preset,
    setRange,
  };
};
