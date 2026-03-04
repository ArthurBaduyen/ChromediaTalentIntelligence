export function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map((part) => Number(part));
  if (!year || !month || !day) return null;
  const parsed = new Date(year, month - 1, day);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function formatMonthYear(isoDate: string) {
  const date = parseIsoDate(isoDate);
  if (!date) return "";
  return date.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function formatProjectDurationRange(startDate: string, endDate: string) {
  const start = formatMonthYear(startDate);
  const end = formatMonthYear(endDate);
  if (!start || !end) return "";
  return `${start} - ${end}`;
}

export function parseProjectDurationRange(duration: string) {
  const match = duration.trim().match(/^([A-Za-z]{3})\s+(\d{4})\s*-\s*([A-Za-z]{3})\s+(\d{4})$/);
  if (!match) return { startDate: "", endDate: "" };
  const [, startMon, startYear, endMon, endYear] = match;
  const start = new Date(`${startMon} 1, ${startYear}`);
  const end = new Date(`${endMon} 1, ${endYear}`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return { startDate: "", endDate: "" };
  return {
    startDate: formatIsoDate(start),
    endDate: formatIsoDate(end)
  };
}

export function getCalendarDays(monthDate: Date) {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const offset = firstDay.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const cells: Array<{ date: Date; inCurrentMonth: boolean }> = [];

  for (let index = 0; index < offset; index += 1) {
    const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), index - offset + 1);
    cells.push({ date, inCurrentMonth: false });
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ date: new Date(monthDate.getFullYear(), monthDate.getMonth(), day), inCurrentMonth: true });
  }
  while (cells.length < 42) {
    const day = cells.length - (offset + daysInMonth) + 1;
    cells.push({ date: new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, day), inCurrentMonth: false });
  }
  return cells;
}

export function normalizeLevelLabel(level: string) {
  return level.replace(" Level", "-Level");
}

export function getLevelRank(label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes("senior lead")) return 4;
  if (normalized.startsWith("senior")) return 3;
  if (normalized.startsWith("mid")) return 2;
  if (normalized.startsWith("entry")) return 1;
  return 0;
}

export function skillEntryKey(skillId: string, level: string, capabilityId: string) {
  return capabilityId;
}

export function capabilityIdForEntry(skillId: string, level: string, index: number) {
  return `${skillId}::${level}::${index}`;
}

export function toPolarPoint(cx: number, cy: number, radius: number, angle: number) {
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle)
  };
}

export function truncateRadarLabel(label: string, max = 16) {
  return label.length > max ? `${label.slice(0, max - 1)}…` : label;
}
