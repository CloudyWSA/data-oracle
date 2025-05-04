// src/components/dashboard.tsx
"use client"

import { useState, useEffect, lazy, Suspense, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Gamepad2 } from "lucide-react" // Added icons
import { Skeleton } from "@/components/ui/skeleton"
import type {
  ParticipantData,
  ChampionStat,
  SynergyDataMap,
  ChampionData,
  MatchupDataMap,
  DraftPositionPickData,
} from "@/types" // Import NEW types

// Lazy load components
const Overview = lazy(() => import("@/components/overview"))
const ChampionStats = lazy(() => import("@/components/champion-stats"))
const PlayerStats = lazy(() => import("@/components/player-stats"))
const TeamStats = lazy(() => import("@/components/team-stats"))
const GameAnalysis = lazy(() => import("@/components/game-analysis"))
const DraftSimulator = lazy(() => import("@/components/draft-simulator"))

interface DashboardProps {
  data: ParticipantData[] // Use the specific type
}

// Loading component
const TabLoading = () => (
  <div className="space-y-4 p-4">
    <Skeleton className="h-12 w-1/3" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Skeleton className="h-[300px] w-full" />
      <Skeleton className="h-[300px] w-full" />
    </div>
    <Skeleton className="h-[400px] w-full" />
  </div>
)

// --- Constants needed for Draft Position Calculation ---
const DRAFT_SLOT_ORDER_MAP: { [order: number]: string } = {
  1: "B1 Ban 1",
  2: "R1 Ban 1",
  3: "B2 Ban 2",
  4: "R2 Ban 2",
  5: "B3 Ban 3",
  6: "R3 Ban 3",
  7: "B1 Pick 1",
  8: "R1 Pick 1",
  9: "R2 Pick 2",
  10: "B2 Pick 2",
  11: "B3 Pick 3",
  12: "R3 Pick 3",
  13: "R4 Ban 4",
  14: "B4 Ban 4",
  15: "R5 Ban 5",
  16: "B5 Ban 5",
  17: "R4 Pick 4",
  18: "B4 Pick 4",
  19: "B5 Pick 5",
  20: "R5 Pick 5",
}

const DRAFT_PICK_SLOTS: { [side: string]: { [teamPickNum: number]: string } } = {
  Blue: { 1: "B1", 2: "B2", 3: "B3", 4: "B4", 5: "B5" },
  Red: { 1: "R1", 2: "R2", 3: "R3", 4: "R4", 5: "R5" },
}
const DRAFT_PICK_ORDER_TO_LABEL: { [order: number]: string } = {
  7: "B1",
  8: "R1",
  9: "R2",
  10: "B2",
  11: "B3",
  12: "R3",
  17: "R4",
  18: "B4",
  19: "B5",
  20: "R5",
}
// --- End Constants ---

// Helper function (keep existing one if used elsewhere, or use the map above)
const getGlobalPickOrder = (side: string, teamPickOrder: number | null): number | null => {
  if (teamPickOrder === null || teamPickOrder < 1 || teamPickOrder > 5) return null
  if (side === "Blue") {
    switch (teamPickOrder) {
      case 1: return 7
      case 2: return 10
      case 3: return 11
      case 4: return 18
      case 5: return 19
      default: return null
    }
  } else if (side === "Red") {
    switch (teamPickOrder) {
      case 1: return 8
      case 2: return 9
      case 3: return 12
      case 4: return 17
      case 5: return 20
      default: return null
    }
  }
  return null
}

const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"]
const TOP_LEAGUES = ["LPL", "LCK", "LEC"]; // Define top leagues consistently

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  // processedData stores unique values and separated player/team data (if needed elsewhere)
  const [processedData, setProcessedData] = useState<{
    playerData: ParticipantData[],
    teamData: any[],
    gameTeamDataMap: Map<string | number, { blue?: any; red?: any }>,
    uniqueValues: {
        champions: string[],
        players: string[],
        teams: string[],
        leagues: string[],
        patches: string[],
    },
    stats: {
        totalGames: number,
        totalChampions: number,
        totalPlayers: number,
        totalTeams: number,
    },
   } | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Add state for combined normalized data (player + team rows)
  const [normalizedDataState, setNormalizedDataState] = useState<ParticipantData[] | null>(null);

  // Add filter state at the dashboard level
  const [filterPatch, setFilterPatch] = useState("all")
  const [filterLeague, setFilterLeague] = useState("all")
  const [showTopLeagues, setShowTopLeagues] = useState(false)

  // Initial processing
  useEffect(() => {
    if (!data || data.length === 0) {
      setProcessingError("No data provided to the dashboard.");
      setProcessedData(null);
      setNormalizedDataState(null);
      return;
    }
    try {
      console.log("Processing dashboard data...")
      setProcessingError(null)

      // ---> Normalize all data initially <---
      const normalizedData = data.map((row) => {
        const normalizedRow: Record<string, any> = {}
        Object.entries(row).forEach(([key, value]) => {
          normalizedRow[key.toLowerCase()] = value ?? "" // Ensure null/undefined become empty string
        })
        // Ensure numeric fields are numbers, handle potential errors
        const numericFields = ['participantid', 'result', 'kills', 'deaths', 'assists', 'gamelength', /* add others as needed */];
        numericFields.forEach(field => {
            if (normalizedRow[field] !== "" && normalizedRow[field] !== null && normalizedRow[field] !== undefined) {
                const num = Number(normalizedRow[field]);
                normalizedRow[field] = isNaN(num) ? 0 : num; // Default to 0 if conversion fails
            } else {
                normalizedRow[field] = 0; // Default missing/empty numeric fields to 0
            }
        });
        return normalizedRow as ParticipantData
      })

      // ---> Store the combined normalized data in state <---
      setNormalizedDataState(normalizedData);

      // ---> Validate core columns <---
      const sampleRow = normalizedData[0]
      if (!sampleRow || sampleRow.gameid === undefined || sampleRow.participantid === undefined || sampleRow.side === undefined) {
         throw new Error("Core columns (gameid, participantid, side) missing or invalid in the data. Check column names and data integrity.")
      }


      // ---> Separate player/team data and gather unique values for processedData state <---
      const champions = new Set<string>()
      const players = new Set<string>()
      const teams = new Set<string>()
      const leagues = new Set<string>()
      const patches = new Set<string>()
      const playerData: ParticipantData[] = []
      const teamData: any[] = []
      const gameTeamDataMap = new Map<string | number, { blue?: any; red?: any }>()

      normalizedData.forEach((row) => {
        const participantId = Number(row.participantid) // Already ensured number above
        const isPlayerRow = participantId >= 1 && participantId <= 10 && row.playername && row.champion
        const isTeamRow = (participantId === 100 || participantId === 200) && row.teamname

        // Common data extraction
        if (row.league) leagues.add(String(row.league));
        if (row.patch) patches.add(String(row.patch));
        if (row.champion) champions.add(row.champion); // Add champ from player rows

        if (isPlayerRow) {
          playerData.push(row)
          // Add player/team specifics if needed
          if (row.playername) players.add(row.playername)
          if (row.teamname) teams.add(row.teamname)
        } else if (isTeamRow) {
          teamData.push(row) // Store raw team row
          // Link team row to game
          if (!gameTeamDataMap.has(row.gameid)) gameTeamDataMap.set(row.gameid, {})
          const gameTeams = gameTeamDataMap.get(row.gameid)
          if (gameTeams) {
            if (row.side === "Blue" && participantId === 100) gameTeams.blue = row
            else if (row.side === "Red" && participantId === 200) gameTeams.red = row
          }
           // Add champs/bans from team rows
          for (let i = 1; i <= 5; i++) {
            const pickKey = `pick${i}` as keyof typeof row
            const banKey = `ban${i}` as keyof typeof row
            if (row[pickKey]) champions.add(String(row[pickKey]))
            if (row[banKey]) champions.add(String(row[banKey]))
          }
           if (row.teamname) teams.add(row.teamname); // Add team name from team rows too
        }
      })

      if (playerData.length === 0) console.warn("No valid player rows (participantid 1-10 with playername/champion) identified in the provided data.")
      if (teamData.length === 0) console.warn("No valid team rows (participantid 100/200 with teamname) identified. Ban/pick order data might be unavailable.")


      // Set the state containing separated data and unique values
      setProcessedData({
        playerData,
        teamData, // Keep raw team data if needed for other components
        gameTeamDataMap, // Store the map for easier access later
        uniqueValues: {
          // Filter out empty strings before sorting
          champions: Array.from(champions).filter(Boolean).sort(),
          players: Array.from(players).filter(Boolean).sort(),
          teams: Array.from(teams).filter(Boolean).sort(),
          leagues: Array.from(leagues).filter(Boolean).sort(),
          patches: Array.from(patches).filter(Boolean).sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), // Sort patches reverse numerically
        },
        stats: {
          totalGames: new Set(normalizedData.map((row) => row.gameid)).size,
          totalChampions: champions.size,
          totalPlayers: players.size,
          totalTeams: teams.size,
        },
      })
      console.log("Initial data processing complete")
    } catch (error) {
      console.error("Error processing dashboard data:", error)
      setProcessingError(`Error processing data: ${error instanceof Error ? error.message : "Unknown error"}`)
      setProcessedData(null)
      setNormalizedDataState(null); // Reset on error
    }
  }, [data])


  // --- Filter the *combined* normalized data based on the current filters ---
  // This is used for calculations that need BOTH player and team rows (like ChampionStats bans)
  const filteredCombinedData = useMemo(() => {
    // Use the state holding the full normalized data
    if (!normalizedDataState) return [];

    console.log(`Filtering combined data: Patch=${filterPatch}, League=${filterLeague}, TopLeagues=${showTopLeagues}`);

    return normalizedDataState.filter((item: any) => { // Use 'item' as it can be player or team row
      // Apply patch filter
      const patchMatch = filterPatch === "all" || String(item.patch) === filterPatch;
      if (!patchMatch) return false;

      // Apply league filter or top leagues filter
      let leagueMatch = true;
      if (showTopLeagues) {
        leagueMatch = TOP_LEAGUES.includes(String(item.league));
      } else if (filterLeague !== "all") {
        leagueMatch = String(item.league) === filterLeague;
      }
      // No need for 'else' - if not topLeagues and not specific league, all leagues match

      return leagueMatch; // Return true only if both patch and league conditions are met
    });
  }, [normalizedDataState, filterPatch, filterLeague, showTopLeagues]);


  // Get unique game IDs from the *filtered combined data*
  const filteredGameIds = useMemo(() => {
    return new Set(filteredCombinedData.map((item) => item.gameid))
  }, [filteredCombinedData])

  // Total number of games in *filtered combined data*
  const totalFilteredGames = useMemo(() => {
    return filteredGameIds.size
  }, [filteredGameIds])


  // --- Lifted Champion Stats Calculation ---
  // This calculation now uses the `filteredCombinedData` so it has access to bans from team rows
  // It generates the `allCalculatedStats` which can be used globally or as context/fallbacks.
  const allCalculatedStats = useMemo<ChampionStat[] | null>(() => {
    // Use filteredCombinedData which includes both player and team rows for the filtered scope
    if (!filteredCombinedData || filteredCombinedData.length === 0 || !processedData?.gameTeamDataMap) {
      // console.log("Skipping Champion stats calculation: filteredCombinedData or gameTeamDataMap not ready.");
      return []; // Return empty array instead of null for easier handling downstream
    }
    console.time("calculateAllChampionStats (Dashboard)");

    // Separate filtered data for easier processing below
    const currentFilteredPlayerData = filteredCombinedData.filter(row => Number(row.participantid) >= 1 && Number(row.participantid) <= 10);
    const currentFilteredTeamData = filteredCombinedData.filter(row => Number(row.participantid) === 100 || Number(row.participantid) === 200);

    const stats: Record<string, any> = {}

    // Get unique champions from the *filtered* data (consider picks AND bans)
    const champions = new Set<string>();
    filteredCombinedData.forEach((row: any) => {
      if (row.champion) champions.add(row.champion);
      if (Number(row.participantid) === 100 || Number(row.participantid) === 200) {
        for (let i = 1; i <= 5; i++) {
          if (row[`ban${i}`]) champions.add(row[`ban${i}`]);
        }
      }
    });


    // Initialize stats for each champion found in the filtered set
    Array.from(champions).forEach((champion: string) => {
      if (champion)
        stats[champion] = {
          name: champion, picks: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0,
          // totalGamesPlayed: 0, // We'll use 'picks' for games played *as* the champ
          positions: {}, damageShareTotal: 0, goldShareTotal: 0, damageShareGames: 0, goldShareGames: 0,
          blindPickMatchups: 0, counterPickMatchups: 0, totalLaneMatchups: 0,
          pairings: {}, // pairings map (champ -> count)
          // patches: {}, leagues: {}, // We don't need to track patches/leagues per champ here
          bans: 0, // Initialize bans field
          _totalGameLengthMinutes: 0, // Accumulator for per-minute stats
          cs: 0, gold: 0, damage: 0, _totalKillParticipation: 0, // More accumulators
        }
    })

    // Group filtered *player* data by game for processing stats
    const games = new Map<string | number, { players: ParticipantData[]; blueTeam: any | null; redTeam: any | null }>()
    currentFilteredPlayerData.forEach((player: ParticipantData) => {
      if (!games.has(player.gameid)) {
        // Find the corresponding team rows for this game *from the already filtered team data*
        const blueTeam = currentFilteredTeamData.find(tr => tr.gameid === player.gameid && tr.side === 'Blue');
        const redTeam = currentFilteredTeamData.find(tr => tr.gameid === player.gameid && tr.side === 'Red');
        games.set(player.gameid, { players: [], blueTeam: blueTeam || null, redTeam: redTeam || null })
      }
      games.get(player.gameid)?.players.push(player)
    })


    // Process Player Stats & Accumulators
    games.forEach((gameData, gameid) => {
      const { players, blueTeam, redTeam } = gameData
      // We only process games where we have player data
      if (!players || players.length === 0) return;

      const gamePlayersBySide: { Blue: ParticipantData[]; Red: ParticipantData[] } = { Blue: [], Red: [] }
      let gameLengthMinutes = 0; // Calculate once per game if possible

      players.forEach((player) => {
        const champion = player.champion
        if (!champion || !stats[champion]) return; // Skip if champ somehow missing or not initialized

        // --- Aggregate Core Stats ---
        stats[champion].picks++;
        if (Number(player.result) === 1) stats[champion].wins++;
        else stats[champion].losses++;
        stats[champion].kills += Number(player.kills) || 0;
        stats[champion].deaths += Number(player.deaths) || 0;
        stats[champion].assists += Number(player.assists) || 0;
        stats[champion].cs += (Number(player.minionkills) || 0) + (Number(player.monsterkills) || 0);
        stats[champion].gold += Number(player.totalgold) || Number(player.earnedgold) || 0;
        stats[champion].damage += Number(player.damagetochampions) || 0;

        const position = typeof player.position === "string" ? player.position.toLowerCase() : "unknown"
        stats[champion].positions[position] = (stats[champion].positions[position] || 0) + 1

        // --- Accumulate for Averages/Per-Minute ---
        if (gameLengthMinutes === 0 && (Number(player.gamelength) || 0) > 0) {
            gameLengthMinutes = (Number(player.gamelength) || 0) / 60;
        }
        // Add this player's contribution to the total game length for the champ (will average later)
        if (gameLengthMinutes > 0) stats[champion]._totalGameLengthMinutes += gameLengthMinutes;

        // Accumulate shares/KP (use data directly if available, otherwise calculate)
        // Assuming damageshare, earnedgoldshare are percentages (0-1 or 0-100?) - let's assume 0-100 for safety
        if (player.damageshare !== undefined && !isNaN(Number(player.damageshare))) {
          stats[champion].damageShareTotal += Number(player.damageshare);
          stats[champion].damageShareGames++;
        }
        if (player.earnedgoldshare !== undefined && !isNaN(Number(player.earnedgoldshare))) {
          stats[champion].goldShareTotal += Number(player.earnedgoldshare);
          stats[champion].goldShareGames++;
        }
        // Kill Participation needs team kills - calculate if needed
        // This requires summing kills per team per game first, which adds complexity here.
        // Let's skip KP calculation in this 'global' context for simplicity,
        // or assume it's done inside ChampionStats component where game context is clearer.

        if (player.side === "Blue" || player.side === "Red") gamePlayersBySide[player.side].push(player)
      })

      // Pairings (within each team)
      ;(["Blue", "Red"] as const).forEach((side) => {
        const teamPlayers = gamePlayersBySide[side]
        for (let i = 0; i < teamPlayers.length; i++) {
          const playerChamp = teamPlayers[i]?.champion
          if (!playerChamp || !stats[playerChamp]) continue
          for (let j = i + 1; j < teamPlayers.length; j++) {
            const teammateChamp = teamPlayers[j]?.champion
            if (!teammateChamp || !stats[teammateChamp]) continue
            stats[playerChamp].pairings[teammateChamp] = (stats[playerChamp].pairings[teammateChamp] || 0) + 1
            stats[teammateChamp].pairings[playerChamp] = (stats[teammateChamp].pairings[playerChamp] || 0) + 1
          }
        }
      })


      // Blind/Counter Pick Logic (Requires Team Rows)
      const canProcessPickOrder = blueTeam && redTeam && players.length >= 10; // Need full teams & team rows
      if (canProcessPickOrder) {
         const playerPickInfo: Record<
           string,
           { position: string; globalPickOrder: number | null; champion: string; playerRow: any }
         > = {}
         players.forEach((player) => {
           const side = player.side;
           const position = typeof player.position === "string" ? player.position.toLowerCase() : null;
           const champion = player.champion;
           if (!side || !position || !champion || !STANDARD_POSITIONS.includes(position)) return;

           let teamPickOrder: number | null = null;
           const relevantTeamRow = side === "Blue" ? blueTeam : redTeam;
           for (let i = 1; i <= 5; i++) {
             const pickKey = `pick${i}`;
             if (relevantTeamRow[pickKey] === champion) {
               teamPickOrder = i;
               break;
             }
           }
           const globalPickOrder = getGlobalPickOrder(side, teamPickOrder);
           if (globalPickOrder !== null) {
             playerPickInfo[`${side}-${position}`] = { position, globalPickOrder, champion, playerRow: player };
           }
         });

         STANDARD_POSITIONS.forEach((pos) => {
           const bluePlayerInfo = playerPickInfo[`Blue-${pos}`];
           const redPlayerInfo = playerPickInfo[`Red-${pos}`];
           // Ensure both players exist and have valid pick orders before processing matchup
           if (bluePlayerInfo?.globalPickOrder && redPlayerInfo?.globalPickOrder && stats[bluePlayerInfo.champion] && stats[redPlayerInfo.champion]) {
             const blueChampStats = stats[bluePlayerInfo.champion];
             const redChampStats = stats[redPlayerInfo.champion];
             blueChampStats.totalLaneMatchups = (blueChampStats.totalLaneMatchups || 0) + 1;
             redChampStats.totalLaneMatchups = (redChampStats.totalLaneMatchups || 0) + 1;

             if (bluePlayerInfo.globalPickOrder < redPlayerInfo.globalPickOrder) {
               blueChampStats.blindPickMatchups = (blueChampStats.blindPickMatchups || 0) + 1;
               redChampStats.counterPickMatchups = (redChampStats.counterPickMatchups || 0) + 1;
             } else if (redPlayerInfo.globalPickOrder < bluePlayerInfo.globalPickOrder) {
               redChampStats.blindPickMatchups = (redChampStats.blindPickMatchups || 0) + 1;
               blueChampStats.counterPickMatchups = (blueChampStats.counterPickMatchups || 0) + 1;
             }
           }
         });
      }

    }) // End of games.forEach

    // Process Bans using the filtered *team* data
    currentFilteredTeamData.forEach((teamRow) => {
        for (let i = 1; i <= 5; i++) {
          const banKey = `ban${i}`
          const champion = teamRow[banKey]
          if (champion && stats[champion]) { // Check if champion exists in our stats object
            stats[champion].bans = (stats[champion].bans || 0) + 1
          } else if (champion && !stats[champion]) {
              // This should not happen if initialization included all bans, but handle defensively
              console.warn(`Banned champion ${champion} not found during ban counting. Initializing.`);
              stats[champion] = {
                  name: champion, picks: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0,
                  positions: {}, damageShareTotal: 0, goldShareTotal: 0, damageShareGames: 0, goldShareGames: 0,
                  blindPickMatchups: 0, counterPickMatchups: 0, totalLaneMatchups: 0, pairings: {},
                  bans: 1, _totalGameLengthMinutes: 0, cs: 0, gold: 0, damage: 0, _totalKillParticipation: 0,
              };
          }
        }
    });

    // --- Finalize Stats (Calculate Rates, Averages, KDA etc.) ---
    const finalStatsArray: ChampionStat[] = Object.values(stats)
      .map((champ: any): ChampionStat | null => { // Allow returning null for invalid entries
        if (!champ?.name) return null; // Skip if somehow name is missing

        const picks = champ.picks || 0;
        const bans = champ.bans || 0;
        const laneMatchups = champ.totalLaneMatchups || 0;
        const totalGamesInScope = totalFilteredGames; // Use the total count of unique games in the filtered set

        // Win Rate (only if picked)
        const winRate = picks > 0 ? (champ.wins / picks) * 100 : 0;

        // Pick Rate, Ban Rate, Presence (based on total filtered games)
        const pickRate = totalGamesInScope > 0 ? (picks / totalGamesInScope) * 100 : 0;
        const banRate = totalGamesInScope > 0 ? (bans / totalGamesInScope) * 100 : 0;
        const presence = Math.min(pickRate + banRate, 100); // Clamp at 100%

        // Blind/Counter Pick Rates (only if involved in lane matchups)
        const blindPickRate = laneMatchups > 0 ? (champ.blindPickMatchups / laneMatchups) * 100 : 0;
        const counterPickRate = laneMatchups > 0 ? (champ.counterPickMatchups / laneMatchups) * 100 : 0;

        // KDA
        let kda: number | 'Perfect' = 0;
        if (champ.deaths === 0) kda = (champ.kills > 0 || champ.assists > 0) ? 'Perfect' : 0;
        else kda = (champ.kills + champ.assists) / champ.deaths;

        // Averages per game (only if picked)
        const avgKills = picks > 0 ? champ.kills / picks : 0;
        const avgDeaths = picks > 0 ? champ.deaths / picks : 0;
        const avgAssists = picks > 0 ? champ.assists / picks : 0;
        const avgDamageShare = champ.damageShareGames > 0 ? champ.damageShareTotal / champ.damageShareGames : 0;
        const avgGoldShare = champ.goldShareGames > 0 ? champ.goldShareTotal / champ.goldShareGames : 0;
        // KP requires more complex calc, omitting here. ChampionStats component calculates it.

        // Per Minute Stats (needs average game length)
        const avgGameLengthForChamp = picks > 0 ? champ._totalGameLengthMinutes / picks : 0;
        const cspm = avgGameLengthForChamp > 0 ? (champ.cs / picks) / avgGameLengthForChamp : 0; // CS per game / avg length
        const gpm = avgGameLengthForChamp > 0 ? (champ.gold / picks) / avgGameLengthForChamp : 0; // Gold per game / avg length
        const dpm = avgGameLengthForChamp > 0 ? (champ.damage / picks) / avgGameLengthForChamp : 0; // Damage per game / avg length

        // Main Position
        let mainPosition = "unknown";
        if (picks > 0 && Object.keys(champ.positions).length > 0) {
          mainPosition = Object.entries(champ.positions)
                          .reduce((a: [string, number], b: [string, any]): [string, number] => (b[1] > a[1] ? b : a), ["unknown", 0])[0];
        }

        // Convert pairings map to array
         const pairingsArray = Object.entries(champ.pairings || {})
           .map(([name, count]) => ({ name, count: count as number }))
           .sort((a, b) => b.count - a.count);

        return {
            name: champ.name,
            picks: picks,
            wins: champ.wins,
            bans: bans,
            winRate: winRate,
            pickRate: pickRate,
            banRate: banRate,
            presence: presence,
            blindPickRate: blindPickRate,
            counterPickRate: counterPickRate,
            mainPosition: mainPosition,
            positions: champ.positions, // Include position counts
            kda: kda,
            avgKills: avgKills,
            avgDeaths: avgDeaths,
            avgAssists: avgAssists,
            avgDamageShare: avgDamageShare,
            avgGoldShare: avgGoldShare,
            avgKillParticipation: 0, // Set to 0 or calculate in ChampionStats
            cspm: cspm,
            gpm: gpm,
            dpm: dpm,
            pairings: pairingsArray, // Include pairings array
        } as ChampionStat;
      })
      .filter((stat): stat is ChampionStat => Boolean(stat)); // Filter out any null results

    console.timeEnd("calculateAllChampionStats (Dashboard)");
    console.log(`Calculated global stats for ${finalStatsArray.length} champions based on ${totalFilteredGames} filtered games.`);
    return finalStatsArray;

  }, [filteredCombinedData, processedData?.gameTeamDataMap, totalFilteredGames]); // Depends on the filtered combined data


  // --- Ally Synergy Data Calculation (Uses filteredCombinedData) ---
  const allSynergyData = useMemo<SynergyDataMap>(() => {
    // Use filteredCombinedData's player rows
    const currentFilteredPlayerData = filteredCombinedData.filter(row => Number(row.participantid) >= 1 && Number(row.participantid) <= 10);
    if (!currentFilteredPlayerData.length) {
      // console.log("Skipping Synergy calculation: filtered player data not ready.");
      return {};
    }
    console.time("calculateAllSynergyData");
    const synergyCounts: { [champ1: string]: { [champ2: string]: { wins: number; played: number } } } = {}
    const gamesData: {
      [gameid: string | number]: { blue: ParticipantData[]; red: ParticipantData[]; winner: "Blue" | "Red" | null }
    } = {}

    // Group filtered players by game
    currentFilteredPlayerData.forEach((row: ParticipantData) => {
      if (!gamesData[row.gameid]) gamesData[row.gameid] = { blue: [], red: [], winner: null }
      if (row.side === "Blue") gamesData[row.gameid].blue.push(row)
      else if (row.side === "Red") gamesData[row.gameid].red.push(row)
      if (gamesData[row.gameid].winner === null && row.result !== undefined) {
        gamesData[row.gameid].winner = Number(row.result) === 1 ? row.side : (row.side === "Blue" ? "Red" : "Blue")
      }
    })

    const totalGamesInScope = totalFilteredGames; // Use total filtered games count from combined data
    if (totalGamesInScope === 0) {
      console.timeEnd("calculateAllSynergyData");
      return {}
    }

    Object.values(gamesData).forEach((game) => {
      const processTeam = (team: ParticipantData[], didWin: boolean) => {
        for (let i = 0; i < team.length; i++) {
          for (let j = i + 1; j < team.length; j++) {
            const champ1 = team[i]?.champion
            const champ2 = team[j]?.champion
            if (!champ1 || !champ2 || champ1 === champ2) continue
            synergyCounts[champ1] = synergyCounts[champ1] || {}
            synergyCounts[champ2] = synergyCounts[champ2] || {}
            synergyCounts[champ1][champ2] = synergyCounts[champ1][champ2] || { wins: 0, played: 0 }
            synergyCounts[champ2][champ1] = synergyCounts[champ2][champ1] || { wins: 0, played: 0 }
            synergyCounts[champ1][champ2].played++
            synergyCounts[champ2][champ1].played++
            if (didWin) {
              synergyCounts[champ1][champ2].wins++
              synergyCounts[champ2][champ1].wins++
            }
          }
        }
      }
      if (game.winner) {
        processTeam(game.blue, game.winner === "Blue")
        processTeam(game.red, game.winner === "Red")
      }
    })

    const finalSynergyData: SynergyDataMap = {}
    Object.keys(synergyCounts).forEach((champ1) => {
      finalSynergyData[champ1] = {}
      Object.keys(synergyCounts[champ1]).forEach((champ2) => {
        const counts = synergyCounts[champ1][champ2]
        if (counts.played > 0) {
          finalSynergyData[champ1][champ2] = {
             allyChampionName: champ2, // Add explicit name
             gamesPlayed: counts.played,
             winRate: Number.parseFloat(((counts.wins / counts.played) * 100).toFixed(1)),
             // Synergy PR = Pair Played / Total *Filtered* Games
             pickRate: Number.parseFloat(((counts.played / totalGamesInScope) * 100).toFixed(1)),
          }
        }
      })
    })
    console.timeEnd("calculateAllSynergyData")
    // console.log(`Calculated ally synergy data for ${Object.keys(finalSynergyData).length} champions.`);
    return finalSynergyData
  }, [filteredCombinedData, totalFilteredGames]) // Depends on filtered combined data


  // --- Matchup (Counter) Data Calculation (Uses filteredCombinedData) ---
  const matchupData = useMemo<MatchupDataMap>(() => {
     // Use filteredCombinedData's player rows
    const currentFilteredPlayerData = filteredCombinedData.filter(row => Number(row.participantid) >= 1 && Number(row.participantid) <= 10);
    if (!currentFilteredPlayerData.length) {
      // console.log("Skipping Matchup calculation: filtered player data not ready.");
      return {};
    }
    console.time("calculateMatchupData");

    const matchupCounts: { [champ1: string]: { [champ2: string]: { winsVs: number; playedVs: number } } } = {}
    const gamesData: {
      [gameid: string | number]: { blue: ParticipantData[]; red: ParticipantData[]; winner: "Blue" | "Red" | null }
    } = {}

    // 1. Group filtered player data by game and determine winner
    currentFilteredPlayerData.forEach((row: ParticipantData) => {
      if (!gamesData[row.gameid]) gamesData[row.gameid] = { blue: [], red: [], winner: null }
      if (row.side === "Blue") gamesData[row.gameid].blue.push(row)
      else if (row.side === "Red") gamesData[row.gameid].red.push(row)
      if (gamesData[row.gameid].winner === null && row.result !== undefined) {
         gamesData[row.gameid].winner = Number(row.result) === 1 ? row.side : (row.side === "Blue" ? "Red" : "Blue")
      }
    })

    const totalGamesInScope = totalFilteredGames; // Use total filtered games count from combined data
    if (totalGamesInScope === 0) {
      console.timeEnd("calculateMatchupData");
      return {}
    }

    // 2. Iterate through games and champion pairs on opposing teams
    Object.values(gamesData).forEach((game) => {
      if (!game.winner || game.blue.length === 0 || game.red.length === 0) return

      const blueWon = game.winner === "Blue"

      for (const bluePlayer of game.blue) {
        for (const redPlayer of game.red) {
          const blueChamp = bluePlayer?.champion
          const redChamp = redPlayer?.champion
          if (!blueChamp || !redChamp) continue

          matchupCounts[blueChamp] = matchupCounts[blueChamp] || {}
          matchupCounts[redChamp] = matchupCounts[redChamp] || {}
          matchupCounts[blueChamp][redChamp] = matchupCounts[blueChamp][redChamp] || { winsVs: 0, playedVs: 0 }
          matchupCounts[redChamp][blueChamp] = matchupCounts[redChamp][blueChamp] || { winsVs: 0, playedVs: 0 }

          matchupCounts[blueChamp][redChamp].playedVs++
          matchupCounts[redChamp][blueChamp].playedVs++

          if (blueWon) matchupCounts[blueChamp][redChamp].winsVs++
          else matchupCounts[redChamp][blueChamp].winsVs++
        }
      }
    })

    // 3. Calculate final rates
    const finalMatchupData: MatchupDataMap = {}
    Object.keys(matchupCounts).forEach((champ1) => {
      finalMatchupData[champ1] = {}
      Object.keys(matchupCounts[champ1]).forEach((champ2) => {
        const counts = matchupCounts[champ1][champ2]
        if (counts.playedVs > 0) {
          finalMatchupData[champ1][champ2] = {
            opponentChampionName: champ2, // Add explicit name
            gamesPlayedVs: counts.playedVs,
            // WR of Champ1 vs Champ2
            winRateVs: Number.parseFloat(((counts.winsVs / counts.playedVs) * 100).toFixed(1)),
            // Optional: PR of Matchup = Games Played Vs / Total Filtered Games
            // pickRateVs: Number.parseFloat(((counts.playedVs / totalGamesInScope) * 100).toFixed(1)),
          }
        }
      })
    })

    console.timeEnd("calculateMatchupData");
    // console.log(`Calculated matchup (counter) data for ${Object.keys(finalMatchupData).length} champions.`);
    return finalMatchupData
  }, [filteredCombinedData, totalFilteredGames]) // Depends on filtered combined data


  // --- Draft Position Pick Data Calculation (Uses filteredCombinedData) ---
  const draftPositionPickData = useMemo<DraftPositionPickData>(() => {
    // Use filteredCombinedData's team rows
    const currentFilteredTeamData = filteredCombinedData.filter(row => Number(row.participantid) === 100 || Number(row.participantid) === 200);
    if (!currentFilteredTeamData.length) {
      // console.log("Skipping Draft Position Pick calculation: filtered team data not ready.");
      return { championPickCounts: {}, totalPicksPerSlot: {} }
    }

    console.time("calculateDraftPositionPickData")

    const championPickCounts: { [championName: string]: { [draftLabel: string]: number } } = {}
    const totalPicksPerSlot: { [draftLabel: string]: number } = {}

    // Group team rows by gameid to avoid double counting if somehow duplicated
    const gameTeamsMap = new Map<string | number, { blue?: any, red?: any }>();
    currentFilteredTeamData.forEach(teamRow => {
        if (!gameTeamsMap.has(teamRow.gameid)) gameTeamsMap.set(teamRow.gameid, {});
        const teams = gameTeamsMap.get(teamRow.gameid);
        if (teams) {
            if (teamRow.side === 'Blue') teams.blue = teamRow;
            if (teamRow.side === 'Red') teams.red = teamRow;
        }
    });


    gameTeamsMap.forEach((gameTeams, gameid) => {
      const { blue: blueTeam, red: redTeam } = gameTeams
      if (!blueTeam || !redTeam) return // Need both team rows for a complete draft picture

      // Process Blue Team Picks
      for (let i = 1; i <= 5; i++) {
        const pickKey = `pick${i}` as keyof typeof blueTeam
        const champion = blueTeam[pickKey]
        const globalPickOrder = getGlobalPickOrder("Blue", i)
        if (champion && globalPickOrder && DRAFT_PICK_ORDER_TO_LABEL[globalPickOrder]) {
          const draftLabel = DRAFT_PICK_ORDER_TO_LABEL[globalPickOrder] // e.g., B1, B2
          totalPicksPerSlot[draftLabel] = (totalPicksPerSlot[draftLabel] || 0) + 1
          championPickCounts[champion] = championPickCounts[champion] || {}
          championPickCounts[champion][draftLabel] = (championPickCounts[champion][draftLabel] || 0) + 1
        }
      }
      // Process Red Team Picks
      for (let i = 1; i <= 5; i++) {
        const pickKey = `pick${i}` as keyof typeof redTeam
        const champion = redTeam[pickKey]
        const globalPickOrder = getGlobalPickOrder("Red", i)
        if (champion && globalPickOrder && DRAFT_PICK_ORDER_TO_LABEL[globalPickOrder]) {
          const draftLabel = DRAFT_PICK_ORDER_TO_LABEL[globalPickOrder] // e.g., R1, R2
          totalPicksPerSlot[draftLabel] = (totalPicksPerSlot[draftLabel] || 0) + 1
          championPickCounts[champion] = championPickCounts[champion] || {}
          championPickCounts[champion][draftLabel] = (championPickCounts[champion][draftLabel] || 0) + 1
        }
      }
    })

    console.timeEnd("calculateDraftPositionPickData")
    // console.log(`Calculated draft position pick data.`);
    return { championPickCounts, totalPicksPerSlot }
  }, [filteredCombinedData]) // Depends on filtered combined data


  // --- Prepare ChampionData list for DraftSimulator (Uses allCalculatedStats) ---
  const draftSimulatorChampions: ChampionData[] = useMemo(() => {
    if (!allCalculatedStats) return []
    return allCalculatedStats.map((stat) => ({
      name: stat.name,
      mainPosition: stat.mainPosition !== "unknown" ? stat.mainPosition : undefined, // Use unknown instead of N/A
      winRate: stat.winRate,
      pickRate: stat.pickRate,
      banRate: stat.banRate, // Add ban rate calculated earlier
    }))
  }, [allCalculatedStats])


  // --- Loading State Check ---
  if (processingError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Dashboard Error</AlertTitle>
        <AlertDescription>{processingError}</AlertDescription>
      </Alert>
    )
  }

  // Check if initial processing OR subsequent calculations are done
  if (!processedData || !normalizedDataState || !allCalculatedStats || !allSynergyData || !matchupData || !draftPositionPickData) {
    return (
      <div className="flex justify-center items-center h-screen"> {/* Full screen loading */}
        <div className="text-center p-8">
           <div role="status" className="flex flex-col items-center">
                {/* You can add a spinner icon here */}
                <svg aria-hidden="true" className="w-10 h-10 mb-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                    <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5424 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                </svg>
                <span className="text-lg font-semibold text-muted-foreground mt-2">Crunching the numbers...</span>
                <p className="text-sm text-muted-foreground">Please wait while we process the data.</p>
                <span className="sr-only">Loading...</span>
            </div>
        </div>
      </div>
    )
  }

  // --- Filter Handlers ---
  const handlePatchChange = (value: string) => {
    setFilterPatch(value)
  }

  const handleLeagueChange = (value: string) => {
    setFilterLeague(value)
    // If a specific league is chosen, disable top leagues filter
    if (value !== "all" && showTopLeagues) {
      setShowTopLeagues(false)
    }
  }

  const handleTopLeaguesToggle = () => {
    const newTopLeaguesState = !showTopLeagues;
    setShowTopLeagues(newTopLeaguesState)
    // If top leagues are enabled, reset specific league filter
    if (newTopLeaguesState) {
      setFilterLeague("all")
    }
  }

  // --- Render Dashboard Tabs ---
  return (
    <div className="space-y-6 p-4 md:p-6"> {/* Add padding */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-vasco-black text-white grid w-full grid-cols-3 sm:grid-cols-6 mb-4">
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="champions" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            Champions
          </TabsTrigger>
          <TabsTrigger value="players" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            Players
          </TabsTrigger>
          <TabsTrigger value="teams" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            Teams
          </TabsTrigger>
          <TabsTrigger value="games" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            Games
          </TabsTrigger>
          <TabsTrigger
            value="draft"
            className="data-[state=active]:bg-white data-[state=active]:text-vasco-black flex items-center gap-1"
          >
            <Gamepad2 className="h-4 w-4" /> Draft Sim
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-2">
          <Suspense fallback={<TabLoading />}>
             {/* Pass processedData which contains stats and unique values */}
            <Overview data={processedData} />
          </Suspense>
        </TabsContent>

        {/* Champions Tab - Pass filteredCombinedData and allCalculatedStats */}
        <TabsContent value="champions" className="mt-2">
          <Suspense fallback={<TabLoading />}>
            <ChampionStats
              data={{
                uniqueValues: processedData.uniqueValues,
                // ---> Pass the combined data, already filtered by dashboard state <---
                playerData: filteredCombinedData,
              }}
              // ---> Pass the globally calculated stats for context/fallbacks <---
              allCalculatedStats={allCalculatedStats || []} // Pass calculated stats based on filtered data
              searchQuery="" // Pass search query if needed
              // ---> Pass current filter state for display/consistency <---
              filterPatch={filterPatch}
              filterLeague={filterLeague}
              showTopLeagues={showTopLeagues}
              // ---> Pass handlers for filter changes <---
              onPatchChange={handlePatchChange}
              onLeagueChange={handleLeagueChange}
              onTopLeaguesToggle={handleTopLeaguesToggle}
            />
          </Suspense>
        </TabsContent>

        {/* Player Stats Tab - Pass processedData which contains separated playerData */}
        <TabsContent value="players" className="mt-2">
          <Suspense fallback={<TabLoading />}>
            <PlayerStats
                data={processedData}
                searchQuery=""
                // Pass filters if PlayerStats needs them
                filterPatch={filterPatch}
                filterLeague={filterLeague}
                showTopLeagues={showTopLeagues}
            />
          </Suspense>
        </TabsContent>

        {/* Team Stats Tab - Pass processedData which contains separated teamData */}
        <TabsContent value="teams" className="mt-2">
          <Suspense fallback={<TabLoading />}>
            <TeamStats
                data={processedData}
                searchQuery=""
                // Pass filters if TeamStats needs them
                filterPatch={filterPatch}
                filterLeague={filterLeague}
                showTopLeagues={showTopLeagues}
             />
          </Suspense>
        </TabsContent>

        {/* Game Analysis Tab - Pass processedData */}
        <TabsContent value="games" className="mt-2">
          <Suspense fallback={<TabLoading />}>
            <GameAnalysis
                data={processedData}
                searchQuery=""
                // Pass filters if GameAnalysis needs them
                filterPatch={filterPatch}
                filterLeague={filterLeague}
                showTopLeagues={showTopLeagues}
            />
          </Suspense>
        </TabsContent>

        {/* Draft Simulator Tab - Pass calculated synergy, matchup, etc. */}
        <TabsContent value="draft" className="mt-2">
          <Suspense fallback={<TabLoading />}>
            <DraftSimulator
              allChampions={draftSimulatorChampions} // Basic champ list derived from allCalculatedStats
              allSynergyData={allSynergyData} // Ally synergy map based on filtered data
              matchupData={matchupData} // Counter matchup map based on filtered data
              draftPositionPickData={draftPositionPickData} // Draft position counts based on filtered data
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}