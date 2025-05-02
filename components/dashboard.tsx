// src/components/dashboard.tsx
"use client"

import { useState, useEffect, lazy, Suspense, useMemo } from "react" // Added useMemo
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Gamepad2 } from "lucide-react" // Added Gamepad2
import { Skeleton } from "@/components/ui/skeleton"

// Lazy load components
const Overview = lazy(() => import("@/components/overview"))
const ChampionStats = lazy(() => import("@/components/champion-stats"))
const PlayerStats = lazy(() => import("@/components/player-stats"))
const TeamStats = lazy(() => import("@/components/team-stats"))
const GameAnalysis = lazy(() => import("@/components/game-analysis"))

interface DashboardProps {
  data: any[]
}

// Loading component remains the same
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

// --- Helper function needed for stats calculation (from champion-stats) ---
const getGlobalPickOrder = (side: string, teamPickOrder: number | null): number | null => { // Allow null
    if (teamPickOrder === null || teamPickOrder < 1 || teamPickOrder > 5) return null
    if (side === "Blue") {
      switch (teamPickOrder) {
        case 1: return 1; case 2: return 4; case 3: return 5; case 4: return 8; case 5: return 9;
        default: return null
      }
    } else if (side === "Red") {
      switch (teamPickOrder) {
        case 1: return 2; case 2: return 3; case 3: return 6; case 4: return 7; case 5: return 10;
        default: return null
      }
    }
    return null
}
const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"];
// --- End Helper Function ---


export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [processedData, setProcessedData] = useState<any>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)

  // Initial processing (remains largely the same, just ensures data is ready)
  useEffect(() => {
    if (!data || data.length === 0) return

    try {
      console.log("Processing dashboard data...")
      setProcessingError(null); // Reset error on new data

      const normalizedData = data.map((row) => {
        const normalizedRow: Record<string, any> = {}
        Object.entries(row).forEach(([key, value]) => {
          normalizedRow[key.toLowerCase()] = value != null ? value : ''; // Handle potential null/undefined, ensure lowercase keys
        })
        return normalizedRow
      })

      // Check for critical columns needed for *any* analysis
      const sampleRow = normalizedData[0] || {};
      const requiredBaseCols = ['gameid', 'participantid', 'side'];
      const missingBaseCols = requiredBaseCols.filter(col => !(col in sampleRow));
      if (missingBaseCols.length > 0) {
           throw new Error(`Core columns missing: ${missingBaseCols.join(', ')}. Cannot process data.`);
      }

      const champions = new Set<string>()
      const players = new Set<string>()
      const teams = new Set<string>()
      const leagues = new Set<string>()
      const patches = new Set<string>()

      const playerData: any[] = [];
      const teamData: any[] = [];

      normalizedData.forEach((row) => {
        const participantId = Number(row.participantid);
        // Use participantId and presence of key fields to differentiate
        const isPlayerRow = participantId >= 1 && participantId <= 10 && 'playername' in row && 'champion' in row;
        const isTeamRow = (participantId === 100 || participantId === 200) && 'teamname' in row;

        if (isPlayerRow) {
          playerData.push(row);
          if (row.champion) champions.add(String(row.champion));
          if (row.playername) players.add(String(row.playername));
          if (row.teamname) teams.add(String(row.teamname)); // Team name can be on player rows
          if (row.league) leagues.add(String(row.league));
          if (row.patch) patches.add(String(row.patch));
        } else if (isTeamRow) {
          teamData.push(row);
          // Also check team rows for data consistency if needed (league, patch)
          if (row.league) leagues.add(String(row.league));
          if (row.patch) patches.add(String(row.patch));
           // Extract pick/ban champions from team rows to ensure they are in the unique set
           for (let i = 1; i <= 5; i++) {
               if (row[`pick${i}`]) champions.add(String(row[`pick${i}`]));
               if (row[`ban${i}`]) champions.add(String(row[`ban${i}`]));
           }
        }
      });

      // Basic check if we found player/team data
       if (playerData.length === 0) {
            console.warn("No valid player rows found based on participantId, playername, and champion fields.");
            // Decide if this is an error or just a limitation
            // throw new Error("No player data found. Check spreadsheet format.");
       }
       if (teamData.length === 0) {
            console.warn("No valid team rows found based on participantId and teamname fields.");
             // Decide if this is an error or just a limitation
            // throw new Error("No team data found. Check participantId 100/200 rows.");
       }


      setProcessedData({
        playerData,
        teamData,
        // Ensure unique values are sorted for consistent display in dropdowns
        uniqueValues: {
          champions: Array.from(champions).filter(Boolean).sort(),
          players: Array.from(players).filter(Boolean).sort(),
          teams: Array.from(teams).filter(Boolean).sort(),
          leagues: Array.from(leagues).filter(Boolean).sort(),
          patches: Array.from(patches).filter(Boolean).sort(),
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
      setProcessedData(null); // Clear data on error
    }
  }, [data])


  // --- LIFTED STATS CALCULATION ---
  const allCalculatedStats = useMemo<ChampionStat[] | null>(() => {
      if (!processedData || !processedData.playerData || !processedData.teamData) {
        console.log("Skipping stats calculation: processedData not ready.");
        return null;
      }

      console.time("calculateAllChampionStats");
      const stats: Record<string, any> = {}; // Use 'any' for intermediate calculations

      // Initialize stats object using unique champions from processedData
      processedData.uniqueValues.champions.forEach((champion: string) => {
          if (!champion) return;
          stats[champion] = {
              name: champion, picks: 0, wins: 0, losses: 0, kills: 0, deaths: 0, assists: 0,
              totalGamesPlayed: 0, positions: {}, damageShare: 0, goldShare: 0,
              blindPickMatchups: 0, counterPickMatchups: 0, totalLaneMatchups: 0,
              pairings: {}, // Initialize pairings object
          };
      });


      // Group by Game (using already separated player/team data)
      const games = new Map<string, {players: any[], blueTeam: any | null, redTeam: any | null}>();
      processedData.playerData.forEach((row: any) => {
        if (!games.has(row.gameid)) games.set(row.gameid, {players: [], blueTeam: null, redTeam: null});
        games.get(row.gameid)?.players.push(row);
      });
      processedData.teamData.forEach((row: any) => {
        if (games.has(row.gameid)) {
          const gameData = games.get(row.gameid);
          if (gameData) {
            if (row.side === 'Blue' && Number(row.participantid) === 100) gameData.blueTeam = row;
            else if (row.side === 'Red' && Number(row.participantid) === 200) gameData.redTeam = row;
          }
        }
      });

      let totalGamesProcessedForPickRates = 0; // Use a specific counter for pick rate denominator


      // Process Each Game and Aggregate Stats
      games.forEach((gameData, gameid) => {
          const { players, blueTeam, redTeam } = gameData;
          // Ensure we have data for both teams and exactly 10 players for robust analysis
          const canProcessPickOrder = blueTeam && redTeam && players.length === 10;

          if (canProcessPickOrder) {
            totalGamesProcessedForPickRates++; // Increment only for complete games suitable for pick rate calc
          }

          // --- Basic Stats & Pairings Calculation ---
          const gamePlayersBySide: { Blue: any[], Red: any[] } = { Blue: [], Red: [] };
          players.forEach(player => {
              const champion = player.champion;
              // Ensure champion exists and is in our stats object
              if (!champion || !stats[champion]) {
                  // console.warn(`Champion "${champion}" in game ${gameid} not found in initial stats object. Skipping.`);
                  return;
              }

              // Aggregate basic stats (ensure values are numbers, default to 0)
              stats[champion].picks++;
              stats[champion].totalGamesPlayed++;
              if (Number(player.result) === 1) stats[champion].wins++; else stats[champion].losses++;
              stats[champion].kills += Number(player.kills) || 0;
              stats[champion].deaths += Number(player.deaths) || 0;
              stats[champion].assists += Number(player.assists) || 0;

              // Safely handle position, ensuring it's a valid string
              const position = typeof player.position === 'string' ? player.position.toLowerCase() : "unknown";
              stats[champion].positions[position] = (stats[champion].positions[position] || 0) + 1;

              // Use correct keys for shares, default to 0 if missing/invalid
              stats[champion].damageShare += Number(player.damageshare) || 0;
              stats[champion].goldShare += Number(player.earnedgoldshare) || 0;


              // Add to side list for pairing calculation
              if (player.side === 'Blue' || player.side === 'Red') {
                  gamePlayersBySide[player.side].push(player);
              }
          });

          // Calculate pairings within each team
          (['Blue', 'Red'] as const).forEach(side => {
              const teamPlayers = gamePlayersBySide[side];
              for (let i = 0; i < teamPlayers.length; i++) {
                  const playerChamp = teamPlayers[i]?.champion;
                  if (!playerChamp || !stats[playerChamp]) continue;

                  for (let j = i + 1; j < teamPlayers.length; j++) {
                      const teammateChamp = teamPlayers[j]?.champion;
                      if (!teammateChamp || !stats[teammateChamp]) continue;

                      // Increment pairing count for both champions
                      stats[playerChamp].pairings[teammateChamp] = (stats[playerChamp].pairings[teammateChamp] || 0) + 1;
                      stats[teammateChamp].pairings[playerChamp] = (stats[teammateChamp].pairings[playerChamp] || 0) + 1;
                  }
              }
          });
          // --- End Pairings ---


          // --- Pick Order Analysis (Blind/Counter) - Only if full data available ---
          if (canProcessPickOrder && blueTeam && redTeam) {
              const playerPickInfo: Record<string, { position: string; globalPickOrder: number | null; champion: string; playerRow: any }> = {};

              players.forEach(player => {
                  const side = player.side;
                  const position = typeof player.position === 'string' ? player.position.toLowerCase() : null;
                  const champion = player.champion;
                  if (!side || !position || !champion || !STANDARD_POSITIONS.includes(position)) return; // Skip if missing crucial info

                  let teamPickOrder: number | null = null;
                  const relevantTeamRow = side === 'Blue' ? blueTeam : redTeam;
                  // Ensure pick fields exist before accessing
                  for (let i = 1; i <= 5; i++) {
                      const pickKey = `pick${i}`;
                      if (relevantTeamRow[pickKey] === champion) {
                          teamPickOrder = i;
                          break;
                      }
                  }

                  const globalPickOrder = getGlobalPickOrder(side, teamPickOrder);
                  playerPickInfo[`${side}-${position}`] = { position, globalPickOrder, champion, playerRow: player };
              });

              // Compare pick orders for lane matchups
              STANDARD_POSITIONS.forEach(pos => {
                  const bluePlayerInfo = playerPickInfo[`Blue-${pos}`];
                  const redPlayerInfo = playerPickInfo[`Red-${pos}`];

                  // Ensure both players exist, have champion stats, and calculable pick orders
                  if (bluePlayerInfo && redPlayerInfo &&
                      stats[bluePlayerInfo.champion] && stats[redPlayerInfo.champion] &&
                      bluePlayerInfo.globalPickOrder !== null && redPlayerInfo.globalPickOrder !== null)
                  {
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
                      // If pick orders are the same (should be rare/impossible in standard draft), count neither? Or handle as needed.
                  }
              });
          }
          // --- End Pick Order Analysis ---

      }); // End of games.forEach

      // --- Calculate Final Rates, Averages, and Format ---
      const finalStatsArray: ChampionStat[] = Object.values(stats).map((champion: any) => {
          if (!champion || !champion.name) return null; // Skip if somehow null/invalid

          const gamesPlayed = champion.totalGamesPlayed || 0;
          const laneMatchups = champion.totalLaneMatchups || 0;

          champion.winRate = gamesPlayed > 0 ? (champion.wins / gamesPlayed) * 100 : 0;
          const kdaValue = champion.deaths > 0 ? ((champion.kills + champion.assists) / champion.deaths) : (champion.kills + champion.assists);
          champion.kda = champion.deaths === 0 && (champion.kills > 0 || champion.assists > 0) ? 'Perfect' : kdaValue; // Handle KDA string 'Perfect'

          champion.avgKills = gamesPlayed > 0 ? (champion.kills / gamesPlayed) : 0;
          champion.avgDeaths = gamesPlayed > 0 ? (champion.deaths / gamesPlayed) : 0;
          champion.avgAssists = gamesPlayed > 0 ? (champion.assists / gamesPlayed) : 0;

          // Calculate average shares based on games played, multiply by 100 for percentage
          champion.avgDamageShare = gamesPlayed > 0 ? (champion.damageShare / gamesPlayed) * 100 : 0;
          champion.avgGoldShare = gamesPlayed > 0 ? (champion.goldShare / gamesPlayed) * 100 : 0;

          // Calculate pick rate based on games where pick order could be determined
          champion.pickRate = totalGamesProcessedForPickRates > 0 ? (champion.picks / totalGamesProcessedForPickRates) * 100 : 0;

          champion.blindPickRate = laneMatchups > 0 ? (champion.blindPickMatchups / laneMatchups) * 100 : 0;
          champion.counterPickRate = laneMatchups > 0 ? (champion.counterPickMatchups / laneMatchups) * 100 : 0;

          let maxCount = 0;
          let mainPosition = "N/A";
          if (gamesPlayed > 0 && champion.positions) {
              Object.entries(champion.positions).forEach(([position, count]: [string, any]) => {
                   // Consider only standard positions for 'mainPosition' determination
                   if (STANDARD_POSITIONS.includes(position) && count > maxCount) {
                      maxCount = count;
                      mainPosition = position;
                   }
              });
              // If no standard position found but there are picks, fall back to any max position? Or keep N/A? Let's keep N/A for now.
               if (mainPosition === "N/A" && Object.keys(champion.positions).length > 0) {
                   // Optional: find max among non-standard roles if needed
               }
          }
          champion.mainPosition = mainPosition;

          // Format Pairings Data into sorted array
          const sortedPairings = Object.entries(champion.pairings || {}) // Handle case where pairings might be undefined
              .map(([name, count]) => ({ name, count: count as number }))
              .sort((a, b) => b.count - a.count);
          champion.pairings = sortedPairings;

          // --- Formatting (Create separate formatted fields) ---
          champion.kdaFormatted = typeof champion.kda === 'number' ? champion.kda.toFixed(2) : 'Perfect';
          champion.avgKillsFormatted = champion.avgKills.toFixed(1);
          champion.avgDeathsFormatted = champion.avgDeaths.toFixed(1);
          champion.avgAssistsFormatted = champion.avgAssists.toFixed(1);
          champion.avgDamageShareFormatted = champion.avgDamageShare.toFixed(1);
          champion.avgGoldShareFormatted = champion.avgGoldShare.toFixed(1);
          champion.winRateFormatted = champion.winRate.toFixed(1);
          champion.pickRateFormatted = champion.pickRate.toFixed(1);
          champion.blindPickRateFormatted = champion.blindPickRate.toFixed(1);
          champion.counterPickRateFormatted = champion.counterPickRate.toFixed(1);

          // Add the raw damage/gold share values as well if needed by other components
          // champion.damageShare = champion.damageShare; // Already exists
          // champion.goldShare = champion.goldShare; // Already exists

          return champion as ChampionStat; // Cast to the final type
      }).filter((stat): stat is ChampionStat => Boolean(stat)); // Filter out any nulls


      console.timeEnd("calculateAllChampionStats");
      console.log(`Calculated stats for ${finalStatsArray.length} champions.`);
      return finalStatsArray;

  }, [processedData]); // Recalculate only when processedData changes
  // --- END LIFTED STATS CALCULATION ---


  if (processingError) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Dashboard Error</AlertTitle>
        <AlertDescription>{processingError}</AlertDescription>
      </Alert>
    )
  }

  // Show loading state while initial processing or stats calculation is happening
  if (!processedData || !allCalculatedStats) {
    return (
        <div className="flex justify-center items-center h-64">
            <div className="text-center">
                <p className="text-lg font-semibold text-vasco-gray">Crunching the numbers...</p>
                <p className="text-sm text-vasco-gray">Please wait while we process your data.</p>
                {/* Optional: add a spinner here */}
                 <div className="mt-4">
                    <Skeleton className="h-8 w-32 mx-auto mb-4" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </div>
      </div>
    )
  }

  // We have processedData and allCalculatedStats now
  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-vasco-black text-white grid w-full grid-cols-3 sm:grid-cols-6"> {/* Adjusted grid for new tab */}
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
          {/* New Tab Trigger */}
          <TabsTrigger value="draft" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black flex items-center gap-1">
             <Gamepad2 className="h-4 w-4" /> Draft Sim
          </TabsTrigger>
        </TabsList>

        {/* Existing Tabs */}
        <TabsContent value="overview" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            <Overview data={processedData} />
          </Suspense>
        </TabsContent>

        <TabsContent value="champions" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            {/* Pass processedData and the newly calculated stats */}
            <ChampionStats
                data={processedData} // Pass unique values, maybe raw data if filters need it?
                allCalculatedStats={allCalculatedStats} // Pass the calculated stats
                searchQuery=""
            />
          </Suspense>
        </TabsContent>

        <TabsContent value="players" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            <PlayerStats data={processedData} searchQuery="" />
          </Suspense>
        </TabsContent>

        <TabsContent value="teams" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            <TeamStats data={processedData} searchQuery="" />
          </Suspense>
        </TabsContent>

        <TabsContent value="games" className="mt-6">
          <Suspense fallback={<TabLoading />}>
            <GameAnalysis data={processedData} searchQuery="" />
          </Suspense>
        </TabsContent>

        {/* New Tab Content */}
        <TabsContent value="draft" className="mt-6">
            <Suspense fallback={<TabLoading />}>
            </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}