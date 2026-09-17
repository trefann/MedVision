export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

export function formatDateFull(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function getRiskLabel(score: number): string {
  if (score >= 7) return "High";
  if (score >= 4) return "Moderate";
  return "Low";
}

export function getRiskColor(score: number): string {
  if (score >= 7) return "#E63946";
  if (score >= 4) return "#F59E0B";
  return "#16A34A";
}

export function getTriageColor(result: string): string {
  switch (result) {
    case "refer":
      return "#E63946";
    case "monitor":
      return "#F59E0B";
    case "benign":
      return "#16A34A";
    default:
      return "#6B7280";
  }
}

export function getTriageLabel(result: string): string {
  switch (result) {
    case "refer":
      return "Refer urgently";
    case "monitor":
      return "Monitor";
    case "benign":
      return "Benign";
    default:
      return result;
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "overdue":
      return "#E63946";
    case "referred":
    case "monitor":
    case "active":
      return "#F59E0B";
    case "closed":
    case "reached":
    case "biopsied":
    case "benign":
      return "#16A34A";
    default:
      return "#6B7280";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "referred":
      return "Referred";
    case "reached":
      return "Reached";
    case "biopsied":
      return "Biopsied";
    case "closed":
      return "Closed";
    case "active":
      return "Active";
    case "monitor":
      return "Monitor";
    default:
      return status;
  }
}

export function calculateGrowthPercent(
  oldArea: number,
  newArea: number
): number {
  if (oldArea === 0) return 0;
  return Math.round(((newArea - oldArea) / oldArea) * 1000) / 10;
}

export function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1 + "T00:00:00");
  const d2 = new Date(date2 + "T00:00:00");
  return Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

export function weeksLabel(days: number): string {
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks !== 1 ? "s" : ""}`;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function calculateHabitRisk(
  types: string[],
  durationYears: number,
  alcoholUse: boolean,
  mouthOpening: number
): number {
  let score = 0;
  score += types.length * 1.2;
  score += Math.min(durationYears / 5, 3);
  if (alcoholUse) score += 1.5;
  if (mouthOpening < 35) score += 1;
  if (mouthOpening < 30) score += 1;
  return Math.min(Math.round(score * 10) / 10, 10);
}
