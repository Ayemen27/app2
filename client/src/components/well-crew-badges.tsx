import { Badge } from "@/components/ui/badge";
import { Droplets, Wrench, Users } from "lucide-react";

const CREW_TYPE_LABELS: Record<string, string> = {
  welding: 'لحام',
  steel_installation: 'تركيب حديد',
  panel_installation: 'تركيب ألواح',
};

interface WellCrewBadgesProps {
  wellIds?: string | null;
  wellId?: number | string | null;
  crewType?: string | null;
  teamName?: string | null;
  projectWells: any[];
  isWellsProject?: boolean;
}

function parseIds(wellIds?: string | null, wellId?: number | string | null): number[] {
  try {
    if (wellIds) return JSON.parse(wellIds);
    if (wellId) return [Number(wellId)];
  } catch {}
  if (wellId) return [Number(wellId)];
  return [];
}

function parseCrewTypes(crewType?: string | null): string[] {
  try {
    if (!crewType) return [];
    if (crewType.startsWith('[')) return JSON.parse(crewType);
    return [crewType];
  } catch {}
  return crewType ? [crewType] : [];
}

function parseTeamNames(teamName?: string | null): string[] {
  try {
    if (!teamName) return [];
    if (teamName.startsWith('[')) return JSON.parse(teamName);
    return [teamName];
  } catch {}
  return teamName ? [teamName] : [];
}

export function WellCrewBadges({ wellIds, wellId, crewType, teamName, projectWells, isWellsProject }: WellCrewBadgesProps) {
  if (isWellsProject === false) return null;

  const ids = parseIds(wellIds, wellId);
  const types = parseCrewTypes(crewType);
  const teams = parseTeamNames(teamName);

  if (ids.length === 0 && types.length === 0 && teams.length === 0) return null;

  const wellNames = ids.map((id: number) => {
    const well = projectWells.find((w: any) => w.id === id);
    return well ? (well.well_number || well.wellNumber || `بئر ${id}`) : `بئر ${id}`;
  });

  return (
    <div className="flex flex-wrap items-center gap-1.5 mt-1" data-testid="well-crew-badges">
      {wellNames.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800">
          <Droplets className="h-3 w-3 text-sky-500 shrink-0" />
          <span className="text-[11px] font-medium text-sky-700 dark:text-sky-300">
            {wellNames.join('، ')}
          </span>
        </div>
      )}
      {teams.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
          <Users className="h-3 w-3 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
            {teams.join('، ')}
          </span>
        </div>
      )}
      {types.length > 0 && (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800">
          <Wrench className="h-3 w-3 text-violet-500 shrink-0" />
          <span className="text-[11px] font-medium text-violet-700 dark:text-violet-300">
            {types.map(ct => CREW_TYPE_LABELS[ct] || ct).join('، ')}
          </span>
        </div>
      )}
    </div>
  );
}
