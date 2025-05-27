// src/components/champion-stats.tsx

"use client"

import React, { useState, useEffect, useMemo, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import ChampionImage from "./champion-image"
import ChampionDashboard from "./champion-dashboard"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Filter } from "lucide-react"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
// *** Import necessary types ***
import type { ChampionStat, SynergyDataMap, MatchupDataMap } from "@/types"

interface ChampionStatsProps {
  data: {
    uniqueValues: {
      champions: string[]
      patches: string[]
      leagues: string[]
    }
    // --- This now receives the combined data pre-filtered by the dashboard ---
    playerData: any[] // Raw player data (including team rows for bans)
  }
  // This prop contains pre-calculated GLOBAL stats (like blind/counter rates)
  // It's used for context and fallbacks where appropriate.
  allCalculatedStats: ChampionStat[]
  searchQuery?: string // Optional search query prop
  // Filters are still passed down for display and potential use,
  // but the core filtering of `playerData` happened in the parent.
  filterPatch?: string
  filterLeague?: string
  showTopLeagues?: boolean
  onPatchChange?: (value: string) => void
  onLeagueChange?: (value: string) => void
  onTopLeaguesToggle?: () => void
}

export default function ChampionStats({
  data,
  allCalculatedStats, // Use this for global context/fallbacks
  searchQuery,
  filterPatch = "all",
  filterLeague = "all",
  showTopLeagues = false,
  onPatchChange,
  onLeagueChange,
  onTopLeaguesToggle,
}: ChampionStatsProps) {
  const [searchTerm, setSearchTerm] = useState(searchQuery || "")
  // Local state reflects the filters passed from the parent
  const [selectedPatch, setSelectedPatch] = useState<string>(filterPatch)
  const [selectedLeague, setSelectedLeague] = useState<string>(filterLeague)
  const [isTopLeaguesActive, setIsTopLeaguesActive] = useState(showTopLeagues)
  const [activeTab, setActiveTab] = useState("presence")
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "ascending" | "descending" }>({
    key: "presence", // Default sort
    direction: "descending",
  })
  const [selectedChampion, setSelectedChampion] = useState<ChampionStat | null>(null) // Use ChampionStat type
  const [isDashboardOpen, setIsDashboardOpen] = useState(false)

  // Store calculated detailed data in state to avoid recalculating when only dashboard opens/closes
  const [calculatedData, setCalculatedData] = useState<{
    stats: ChampionStat[],
    synergy: SynergyDataMap,
    matchups: MatchupDataMap
  } | null>(null);


  const topLeagues = useMemo(() => ["LPL", "LCK", "LEC"], []); // Keep consistent with dashboard if possible

  // Update local state when external props change (for display/control consistency)
  useEffect(() => {
    setSelectedPatch(filterPatch)
    setSelectedLeague(filterLeague)
    setIsTopLeaguesActive(showTopLeagues)
    setSearchTerm(searchQuery || "")
  }, [filterPatch, filterLeague, showTopLeagues, searchQuery])

  // --- The data received (`data.playerData`) is already filtered by the parent ---
  // We still need to process it to calculate stats based on *this specific filtered subset*.
  const filteredPlayerData = useMemo(() => {
     // Basic check in case parent passes undefined/null
     if (!data?.playerData || !Array.isArray(data.playerData)) {
        console.warn("ChampionStats received invalid playerData:", data?.playerData);
        return [];
     }
     // The data is already filtered by patch/league/topLeagues in the dashboard.
     // No *additional* filtering needed here based on those props.
     return data.playerData;
  }, [data?.playerData]);


  // Get unique game IDs from the *filtered* player data
  const uniqueGameIds = useMemo(() => {
    // Filter out rows that might not have a gameid before creating the Set
    return new Set(filteredPlayerData.filter(p => p.gameid).map((player) => player.gameid))
  }, [filteredPlayerData])


  // Calculate total *filtered* games
  const totalFilteredGames = useMemo(() => {
    return uniqueGameIds.size
  }, [uniqueGameIds])

  // *** Main Calculation Memo ***
  // This calculates ChampionStats, SynergyData, and MatchupData based on filteredPlayerData
  // THIS LOGIC SHOULD NOW WORK CORRECTLY as filteredPlayerData contains the necessary team rows.
  useEffect(() => {
    // Reset calculation if filters result in no games
    if (totalFilteredGames === 0) {
        // Ensure calculation clears if no data post-filter
        if (filteredPlayerData.length === 0) {
            setCalculatedData({ stats: [], synergy: {}, matchups: {} });
            return;
        }
        // If filteredPlayerData has rows but uniqueGameIds is 0 (data issue?), log it.
        console.warn("Warning: filteredPlayerData has rows, but totalFilteredGames is 0. Check gameid consistency.");
        setCalculatedData({ stats: [], synergy: {}, matchups: {} });
        return;
    };

    console.log(`Recalculating champion stats for ${totalFilteredGames} games based on received filtered data...`);

    // 1. Aggregate data per game: Player lists, team totals, game results
    const gameData: Record<string, { Blue: any[], Red: any[], blueWin: boolean }> = {}
    const gameTotals: Record<string, { Blue: { damage: number, gold: number, kills: number }, Red: { damage: number, gold: number, kills: number } }> = {}
    const gameTeams: Record<string, { Blue: string[], Red: string[] }> = {} // Store champ names per team/game

    // ========================= BAN COUNTING INITIALIZATION =========================
    // Initialize banCounts here, it will be populated in the loop below
    const banCounts: Record<string, number> = {}
    // ==============================================================================

    filteredPlayerData.forEach((player) => {
        const gameId = player.gameid;
        const side = player.side;
        const championName = player.champion;
        const participantId = Number(player.participantid); // Ensure it's a number

        // Skip if core data is missing
        if (!gameId || !side ) { // Removed participantid check here, handle below
            // console.warn("Skipping row due to missing gameId or side:", player);
             return;
        }

        // --- Process TEAM rows (for BANS) ---
        // This condition should now be met for the relevant rows in filteredPlayerData
        if (participantId === 100 || participantId === 200) {
            // ========================= BAN COUNTING LOGIC =========================
            for (let i = 1; i <= 5; i++) {
                const bannedChampion = player[`ban${i}`];
                if (bannedChampion && typeof bannedChampion === 'string' && bannedChampion.trim() !== '') {
                    banCounts[bannedChampion] = (banCounts[bannedChampion] || 0) + 1;
                }
            }
            // We don't need team rows for player stats, synergy, or matchups directly
            // (those are built from player rows later), so we can return after processing bans.
            return;
            // ======================================================================
        }

        // --- Process PLAYER rows (participantId 1-10 approx) ---
        if (participantId >= 1 && participantId <= 10 && championName) { // Ensure it's a valid player row with a champion
             // Initialize game structures if first time seeing this gameId from a player row
            if (!gameData[gameId]) {
                gameData[gameId] = { Blue: [], Red: [], blueWin: false }; // Determine win later
                gameTotals[gameId] = { Blue: { damage: 0, gold: 0, kills: 0 }, Red: { damage: 0, gold: 0, kills: 0 } };
                gameTeams[gameId] = { Blue: [], Red: [] };
            }

             // Add player to game data
            gameData[gameId][side].push(player);

             // Accumulate team totals
            gameTotals[gameId][side].damage += Number(player.damagetochampions) || 0;
            gameTotals[gameId][side].gold += Number(player.totalgold) || Number(player.earnedgold) || 0;
            gameTotals[gameId][side].kills += Number(player.kills) || 0;

            // Store champion name for team composition (used for synergy/matchups)
            if (championName && !gameTeams[gameId][side].includes(championName)) {
                gameTeams[gameId][side].push(championName);
            }

            // Determine game winner (assuming 'result' = 1 means win) - Blue side check is sufficient
            if (side === 'Blue' && Number(player.result) === 1) {
                gameData[gameId].blueWin = true;
            }
            // If Red wins, blueWin remains false (default)
        }
        // Ignore other participant IDs if any exist in the data
    });

    // console.log("Final Ban Counts based on filtered data:", banCounts); // Debug log


    // 2. Initialize Player Stat Aggregation Structures
    const champStatsAgg: Record<string, any> = {} // Aggregates stats per champion


    // 3. Process Each Player Record for Player Stats Aggregation
    // Iterate again, this time *only* for player stats, using the gameData/gameTotals built above
    filteredPlayerData.forEach((player) => {
        const participantId = Number(player.participantid);
        // --- Skip rows that are not actual player rows (e.g., team/ban rows) ---
        if (participantId < 1 || participantId > 10) {
             return;
        }

        // --- Player Stat Aggregation ---
        const championName = player.champion
        const gameId = player.gameid
        const side = player.side
        const position = player.position?.toLowerCase() || "unknown"

        // Skip if missing essential player info (redundant check, but safe)
        if (!championName || !gameId || !side ) {
            return;
        }

        // Initialize champion stats object if first time seen
        if (!champStatsAgg[championName]) {
            champStatsAgg[championName] = {
              name: championName, picks: 0, wins: 0, kills: 0, deaths: 0, assists: 0,
              cs: 0, gold: 0, damage: 0, _totalDamageShare: 0, _totalGoldShare: 0,
              _totalKillParticipation: 0, _totalGameLengthMinutes: 0, positions: {},
              pairingsMap: {}, // Used for synergy calculation later
              // Ban related fields will be added in step 5
            }
        }
        const champ = champStatsAgg[championName]

        // Increment basic stats
        champ.picks += 1
        if (Number(player.result) === 1) champ.wins += 1
        champ.kills += Number(player.kills) || 0
        champ.deaths += Number(player.deaths) || 0
        champ.assists += Number(player.assists) || 0
        champ.cs += (Number(player.minionkills) || 0) + (Number(player.monsterkills) || 0)
        champ.gold += Number(player.totalgold) || Number(player.earnedgold) || 0
        champ.damage += Number(player.damagetochampions) || 0
        champ.positions[position] = (champ.positions[position] || 0) + 1

        // Accumulate for averages
        // Use gamelength from the player row if available, might be more consistent
        const gameLengthMinutes = (Number(player.gamelength) || 0) / 60;
        if (gameLengthMinutes > 0) champ._totalGameLengthMinutes += gameLengthMinutes;
        else {
            // Fallback or warning if gamelength is missing/zero
            // console.warn(`Game length missing or zero for player row:`, player);
        }

        // Accumulate shares using pre-calculated gameTotals
        const teamTotals = gameTotals[gameId]?.[side];
        if (teamTotals) {
            if (teamTotals.damage > 0) champ._totalDamageShare += ((Number(player.damagetochampions) || 0) / teamTotals.damage) * 100;
            else if (Number(player.damagetochampions) > 0) { /* Handle case where player has damage but team total is 0 (unlikely) */ }

            if (teamTotals.gold > 0) champ._totalGoldShare += ((Number(player.totalgold) || Number(player.earnedgold) || 0) / teamTotals.gold) * 100;
            else if ((Number(player.totalgold) || Number(player.earnedgold) || 0) > 0) { /* Handle case */ }

            if (teamTotals.kills > 0) champ._totalKillParticipation += (((Number(player.kills) || 0) + (Number(player.assists) || 0)) / teamTotals.kills) * 100;
            else if ((Number(player.kills) || 0) + (Number(player.assists) || 0) > 0) { /* Handle case where player has KP but team kills are 0 */ champ._totalKillParticipation += 100; } // Or consider how to handle this edge case
        } else {
             // console.warn(`Missing team totals for game ${gameId}, side ${side}`);
        }
    });

    // 4. Process Each Game for Synergy and Matchups (using gameTeams and gameData)
    const synergyAgg: Record<string, Record<string, { gamesPlayed: number, wins: number }>> = {}
    const matchupAgg: Record<string, Record<string, { gamesPlayedVs: number, winsVs: number }>> = {}

    Object.entries(gameTeams).forEach(([gameId, teams]) => {
        // Ensure we have win data for this game from gameData
        if (!gameData[gameId]) {
            // console.warn(`Missing game win data for game ${gameId} during synergy/matchup calculation.`);
            return;
        }
        const blueTeam = teams.Blue;
        const redTeam = teams.Red;
        const blueWon = gameData[gameId].blueWin;

        // Synergy within Blue Team
        for (let i = 0; i < blueTeam.length; i++) {
            const champA = blueTeam[i];
             // Ensure champA exists in our aggregated stats (was picked at least once)
             if(champStatsAgg[champA]) {
                for (let j = i + 1; j < blueTeam.length; j++) {
                    const champB = blueTeam[j];
                    // Ensure champB exists
                    if(champStatsAgg[champB]){
                        // Update pairings map in champStatsAgg (used for ChampionDashboard)
                        champStatsAgg[champA].pairingsMap[champB] = (champStatsAgg[champA].pairingsMap[champB] || 0) + 1;
                        champStatsAgg[champB].pairingsMap[champA] = (champStatsAgg[champB].pairingsMap[champA] || 0) + 1;

                        // Aggregate synergy stats
                        if (!synergyAgg[champA]) synergyAgg[champA] = {};
                        if (!synergyAgg[champB]) synergyAgg[champB] = {};
                        if (!synergyAgg[champA][champB]) synergyAgg[champA][champB] = { gamesPlayed: 0, wins: 0 };
                        if (!synergyAgg[champB][champA]) synergyAgg[champB][champA] = { gamesPlayed: 0, wins: 0 };
                        synergyAgg[champA][champB].gamesPlayed++;
                        synergyAgg[champB][champA].gamesPlayed++;
                        if (blueWon) {
                            synergyAgg[champA][champB].wins++;
                            synergyAgg[champB][champA].wins++;
                        }
                    }
                }
            }
        }
        // Synergy within Red Team
        for (let i = 0; i < redTeam.length; i++) {
            const champA = redTeam[i];
            if(champStatsAgg[champA]) {
                 for (let j = i + 1; j < redTeam.length; j++) {
                     const champB = redTeam[j];
                      if(champStatsAgg[champB]) {
                         // Update pairings map
                         champStatsAgg[champA].pairingsMap[champB] = (champStatsAgg[champA].pairingsMap[champB] || 0) + 1;
                         champStatsAgg[champB].pairingsMap[champA] = (champStatsAgg[champB].pairingsMap[champA] || 0) + 1;

                         // Aggregate synergy stats
                        if (!synergyAgg[champA]) synergyAgg[champA] = {};
                        if (!synergyAgg[champB]) synergyAgg[champB] = {};
                        if (!synergyAgg[champA][champB]) synergyAgg[champA][champB] = { gamesPlayed: 0, wins: 0 };
                        if (!synergyAgg[champB][champA]) synergyAgg[champB][champA] = { gamesPlayed: 0, wins: 0 };
                        synergyAgg[champA][champB].gamesPlayed++;
                        synergyAgg[champB][champA].gamesPlayed++;
                        if (!blueWon) { // Red won
                            synergyAgg[champA][champB].wins++;
                            synergyAgg[champB][champA].wins++;
                        }
                     }
                 }
            }
        }
        // Matchups (Blue vs Red)
        blueTeam.forEach(blueChamp => {
             // Ensure blueChamp exists in stats
             if (!champStatsAgg[blueChamp]) return;
            redTeam.forEach(redChamp => {
                 // Ensure redChamp exists in stats
                 if (!champStatsAgg[redChamp]) return;

                // Aggregate matchup stats (ChampA vs ChampB)
                if (!matchupAgg[blueChamp]) matchupAgg[blueChamp] = {};
                if (!matchupAgg[blueChamp][redChamp]) matchupAgg[blueChamp][redChamp] = { gamesPlayedVs: 0, winsVs: 0 };
                matchupAgg[blueChamp][redChamp].gamesPlayedVs++;
                if (blueWon) { matchupAgg[blueChamp][redChamp].winsVs++; } // blueChamp won vs redChamp

                // Aggregate matchup stats (ChampB vs ChampA)
                if (!matchupAgg[redChamp]) matchupAgg[redChamp] = {};
                if (!matchupAgg[redChamp][blueChamp]) matchupAgg[redChamp][blueChamp] = { gamesPlayedVs: 0, winsVs: 0 };
                matchupAgg[redChamp][blueChamp].gamesPlayedVs++;
                if (!blueWon) { matchupAgg[redChamp][blueChamp].winsVs++; } // redChamp won vs blueChamp
            });
        });
    });


    // 5. Finalize Champion Stats (Combine aggregated stats and calculated bans)
    const finalChampionStats: ChampionStat[] = Object.values(champStatsAgg).map((champ: any): ChampionStat => {
      const games = champ.picks; // Use picks count as games played for this champ
      // Ensure we have picks before calculating averages based on game count
      if (games === 0) {
          // This case should ideally not happen if champ is in champStatsAgg, but safety check
          console.warn(`Champion ${champ.name} in champStatsAgg but has 0 picks.`);
           // Handle ban-only champions later. If somehow a champ is here with 0 picks, return a minimal object or null.
           // For now, let's assign bans and calculate rates based on totalFilteredGames, assuming it might *only* have bans.
           const currentBans = banCounts[champ.name] || 0;
           const banRate = totalFilteredGames > 0 ? (currentBans / totalFilteredGames) * 100 : 0;
           return {
                name: champ.name, picks: 0, wins: 0, bans: currentBans, winRate: 0, pickRate: 0, banRate: banRate,
                presence: banRate, blindPickRate: 0, counterPickRate: 0, mainPosition: 'unknown', positions: {}, kda: 0,
                avgKills: 0, avgDeaths: 0, avgAssists: 0, avgDamageShare: 0, avgGoldShare: 0, avgKillParticipation: 0,
                cspm: 0, gpm: 0, dpm: 0, pairings: []
           } as ChampionStat; // Cast needed as some fields aren't calculated
      }

      const deaths = champ.deaths;
      const kills = champ.kills;
      const assists = champ.assists;

      // We need a reliable total game length for per-minute stats. Summing player.gamelength might be inaccurate
      // if players disconnect or data is inconsistent. Let's average the per-game average length.
      // Alternative: Calculate average game length across all *filtered* games once.
      // Let's stick to the current _totalGameLengthMinutes accumulated from player rows for now.
      const totalGameLengthMinutes = champ._totalGameLengthMinutes;
      const avgGameLengthForChamp = games > 0 ? totalGameLengthMinutes / games : 0;


      // Averages & Per Minute Stats
      const avgKills = kills / games;
      const avgDeaths = deaths / games;
      const avgAssists = assists / games;
      // Use the per-game averages accumulated, divided by games played
      const avgDamageShare = champ._totalDamageShare / games;
      const avgGoldShare = champ._totalGoldShare / games;
      const avgKillParticipation = champ._totalKillParticipation / games;

      // Per-minute stats need a reliable time base. Using the accumulated total might be best available.
      const cspm = totalGameLengthMinutes > 0 ? champ.cs / totalGameLengthMinutes : 0;
      const gpm = totalGameLengthMinutes > 0 ? champ.gold / totalGameLengthMinutes : 0;
      const dpm = totalGameLengthMinutes > 0 ? champ.damage / totalGameLengthMinutes : 0;

      // KDA
      let kda: number | 'Perfect' = 0;
      if (deaths === 0) kda = (kills > 0 || assists > 0) ? 'Perfect' : 0;
      else kda = (kills + assists) / deaths;

      // Rates based on *totalFilteredGames*
      const winRate = (champ.wins / games) * 100; // Win rate based on games the champ was *picked*
      const pickRate = totalFilteredGames > 0 ? (games / totalFilteredGames) * 100 : 0;

      // ========================= BAN ASSIGNMENT START =========================
      // *** Retrieve counted bans for THIS champion from the banCounts map ***
      const currentBans = banCounts[champ.name] || 0; // Default to 0 if not found in banCounts
      // *** Calculate banRate based on totalFilteredGames context ***
      const banRate = totalFilteredGames > 0 ? (currentBans / totalFilteredGames) * 100 : 0;
      // *** Calculate presence using filtered pickRate and banRate ***
      // Ensure presence doesn't exceed 100 due to potential floating point issues? Clamp it.
      const calculatedPresence = pickRate + banRate;
      const presence = Math.min(calculatedPresence, 100); // Clamp at 100%
      // ========================== BAN ASSIGNMENT END ==========================

      // Main Position
      let mainPosition = "unknown";
      if (Object.keys(champ.positions).length > 0) {
        // Find the position with the highest count
        mainPosition = Object.entries(champ.positions)
                        .reduce((a: [string, number], b: [string, any]): [string, number] => (b[1] > a[1] ? b : a), ["unknown", 0])[0];
      }

      // Get global stats for fallback/context (Blind/Counter rates usually come from global analysis)
      const globalStats = allCalculatedStats?.find(stat => stat.name === champ.name);

      // Convert pairings map to sorted array (for ChampionDashboard)
      const pairingsArray = Object.entries(champ.pairingsMap)
           .map(([name, count]) => ({ name, count: count as number }))
           .sort((a, b) => b.count - a.count);

      // *** Construct final object, assigning the calculated currentBans and banRate ***
      return {
          name: champ.name,
          picks: games,
          wins: champ.wins,
          bans: currentBans, // <<< Assign calculated bans
          winRate: winRate,
          pickRate: pickRate,
          banRate: banRate, // <<< Assign calculated ban rate
          presence: presence, // <<< Assign calculated presence
          // Use global stats for blind/counter unless calculated locally (which isn't in this logic)
          blindPickRate: globalStats?.blindPickRate ?? 0,
          counterPickRate: globalStats?.counterPickRate ?? 0,
          // Determine main position, fallback to global if needed
          mainPosition: mainPosition !== 'unknown' ? mainPosition : (globalStats?.mainPosition ?? 'unknown'),
          positions: champ.positions, // Store counts per position
          kda: kda,
          avgKills: avgKills,
          avgDeaths: avgDeaths,
          avgAssists: avgAssists,
          avgDamageShare: avgDamageShare,
          avgGoldShare: avgGoldShare,
          avgKillParticipation: avgKillParticipation,
          cspm: cspm,
          gpm: gpm,
          dpm: dpm,
          pairings: pairingsArray, // Pass pairings for the dashboard
      };
    });

    // Add champions that were only banned within the filter context
    Object.keys(banCounts).forEach(bannedChampName => {
        // Check if this banned champion wasn't already added (because they also had picks)
        if (!finalChampionStats.some(stat => stat.name === bannedChampName)) {
            const globalStats = allCalculatedStats?.find(stat => stat.name === bannedChampName);
            // ========================= BAN-ONLY ASSIGNMENT START =========================
            const currentBans = banCounts[bannedChampName]; // Bans must be > 0 here
            const banRate = totalFilteredGames > 0 ? (currentBans / totalFilteredGames) * 100 : 0;
            const presence = banRate; // Presence is just banRate if picks are 0
            // ========================== BAN-ONLY ASSIGNMENT END ==========================
            finalChampionStats.push({
                name: bannedChampName,
                picks: 0, wins: 0,
                bans: currentBans, // <<< Assign calculated bans
                winRate: 0, pickRate: 0,
                banRate: banRate, // <<< Assign calculated ban rate
                presence: Math.min(presence, 100), // Clamp at 100%
                blindPickRate: globalStats?.blindPickRate ?? 0,
                counterPickRate: globalStats?.counterPickRate ?? 0,
                mainPosition: globalStats?.mainPosition ?? 'unknown',
                positions: {}, kda: 0, avgKills: 0, avgDeaths: 0, avgAssists: 0,
                avgDamageShare: 0, avgGoldShare: 0, avgKillParticipation: 0,
                cspm: 0, gpm: 0, dpm: 0, pairings: []
            } as ChampionStat); // Cast ensures type compliance
        }
     });

    // 6. Finalize Synergy and Matchup Data (Convert aggregated data)
    const finalSynergyData: SynergyDataMap = {};
    Object.entries(synergyAgg).forEach(([champA, allies]) => {
        if (!finalSynergyData[champA]) finalSynergyData[champA] = {};
        Object.entries(allies).forEach(([champB, data]) => {
             // Synergy Pick Rate: Games Played Together / Total Filtered Games
             const pickRate = totalFilteredGames > 0 ? (data.gamesPlayed / totalFilteredGames) * 100 : 0;
             finalSynergyData[champA][champB] = {
                 allyChampionName: champB,
                 gamesPlayed: data.gamesPlayed,
                 winRate: data.gamesPlayed > 0 ? (data.wins / data.gamesPlayed) * 100 : 0,
                 pickRate: pickRate // How often this pair appeared in the filtered games
             };
        });
    });

    const finalMatchupData: MatchupDataMap = {};
     Object.entries(matchupAgg).forEach(([champA, opponents]) => {
        if (!finalMatchupData[champA]) finalMatchupData[champA] = {};
        Object.entries(opponents).forEach(([champB, data]) => {
            // Matchup Pick Rate: Games Played Against Each Other / Total Filtered Games
            const pickRateVs = totalFilteredGames > 0 ? (data.gamesPlayedVs / totalFilteredGames) * 100 : 0;
            finalMatchupData[champA][champB] = {
                opponentChampionName: champB,
                gamesPlayedVs: data.gamesPlayedVs,
                winRateVs: data.gamesPlayedVs > 0 ? (data.winsVs / data.gamesPlayedVs) * 100 : 0, // Win rate of champA *against* champB
                // Optional: Include pickRateVs if needed in the dashboard
                // pickRateVs: pickRateVs
            };
        });
    });

    // 7. Set the calculated state
    setCalculatedData({
        stats: finalChampionStats,
        synergy: finalSynergyData,
        matchups: finalMatchupData
    });

   // Dependencies: Recalculate if the filtered data, total games count, or global stats change.
  }, [filteredPlayerData, totalFilteredGames, allCalculatedStats]);


  // Sort champions based on current sort configuration using calculatedData
  const sortedChampions = useMemo(() => {
    if (!calculatedData?.stats) return []; // Guard against null/undefined stats
    const sortableChampions = [...calculatedData.stats];
    // Keep original sort logic
    return sortableChampions.sort((a, b) => {
      // Ensure key is valid for ChampionStat or 'presence'
      const key = sortConfig.key as keyof ChampionStat | 'presence';

      // Handle potential missing keys or different types gracefully
      let valA = key in a ? a[key as keyof ChampionStat] : (key === 'presence' ? (a.pickRate + a.banRate) : undefined);
      let valB = key in b ? b[key as keyof ChampionStat] : (key === 'presence' ? (b.pickRate + b.banRate) : undefined);

       // Specific KDA sort logic
       if (key === 'kda') {
           const kdaA = a.kda;
           const kdaB = b.kda;
           if (kdaA === 'Perfect' && kdaB !== 'Perfect') return sortConfig.direction === 'descending' ? -1 : 1;
           if (kdaA !== 'Perfect' && kdaB === 'Perfect') return sortConfig.direction === 'descending' ? 1 : -1;
           if (kdaA === 'Perfect' && kdaB === 'Perfect') return 0;
           // Treat non-Perfect KDA as numbers, default non-numeric to 0 for comparison
           valA = typeof kdaA === 'number' ? kdaA : 0;
           valB = typeof kdaB === 'number' ? kdaB : 0;
       }

      // General numeric comparison, treat non-numbers as lowest value
      const numA = typeof valA === 'number' ? valA : -Infinity;
      const numB = typeof valB === 'number' ? valB : -Infinity;

      if (numA < numB) return sortConfig.direction === "ascending" ? -1 : 1;
      if (numA > numB) return sortConfig.direction === "ascending" ? 1 : -1;

      // Fallback sort by name if primary key values are equal
      return a.name.localeCompare(b.name);
    });
  }, [calculatedData?.stats, sortConfig]);

  // Filter champions by search term
  const searchedChampions = useMemo(() => {
    // Depend on sortedChampions directly
    if (!sortedChampions) return [];
    if (!searchTerm) return sortedChampions;
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return sortedChampions.filter((champion) =>
        champion.name.toLowerCase().includes(lowerCaseSearchTerm)
    );
  }, [sortedChampions, searchTerm]);

  // Get top 10 champions for charts using calculatedData
  const topChampionsForChart = React.useMemo(() => {
     if (!calculatedData?.stats) return []; // Guard against null/undefined stats

     // Define getter function based on activeTab
      const getSortValue = (champ: ChampionStat): number => {
           switch (activeTab) {
               case "presence": return champ.presence ?? 0;
               case "winrate": return champ.winRate ?? 0;
               case "pickrate": return champ.pickRate ?? 0;
               case "banrate": return champ.banRate ?? 0;
               // Ensure fallback for potentially missing global stats
               case "blindpickrate": {
                    const global = allCalculatedStats?.find(s => s.name === champ.name);
                    return global?.blindPickRate ?? champ.blindPickRate ?? 0; // Prioritize global if available
               }
               case "counterpickrate": {
                    const global = allCalculatedStats?.find(s => s.name === champ.name);
                    return global?.counterPickRate ?? champ.counterPickRate ?? 0; // Prioritize global if available
               }
               default: return 0;
           }
       };

       // Filter and Sort logic (Keep original, but ensure values are numeric)
       return [...calculatedData.stats]
           .filter(champ => {
                // Filter out champions with 0 for the relevant metric, except presence (which can be just bans)
                const value = getSortValue(champ);
                if (activeTab === 'banrate') return (champ.bans ?? 0) > 0 && value > 0; // Need bans and rate > 0
                if (activeTab === 'winrate' || activeTab === 'pickrate') return (champ.picks ?? 0) > 0 && value > 0; // Need picks and rate > 0
                if (activeTab === 'blindpickrate' || activeTab === 'counterpickrate') return value > 0; // Just need the rate > 0
                return value > 0.01; // For presence, allow small values
           })
           .sort((a, b) => getSortValue(b) - getSortValue(a)) // Sort descending
           .slice(0, 10); // Take top 10

   }, [calculatedData?.stats, activeTab, allCalculatedStats]); // Add allCalculatedStats dependency


  // --- Handler Functions ---
  // No changes needed in handlers unless filter logic needs adjustment
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "descending";
    if (sortConfig.key === key && sortConfig.direction === "descending") {
      direction = "ascending";
    }
    setSortConfig({ key, direction });
  }

  const getSortDirectionIndicator = (key: string) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === "ascending" ? " ↑" : " ↓";
  }

  // Handlers now primarily call the functions passed down from the parent
  const handlePatchChange = (value: string) => {
    // Update local state for display consistency if needed, then call parent handler
    // setSelectedPatch(value); // Already done by useEffect hook listening to props
    if (onPatchChange) onPatchChange(value)
  }

  const handleLeagueChange = (value: string) => {
    // setSelectedLeague(value); // Already done by useEffect
    // Logic to coordinate with top leagues toggle should be in parent or handled via props
    if (onLeagueChange) onLeagueChange(value)
  }

  const handleTopLeaguesToggle = () => {
    // setIsTopLeaguesActive(!isTopLeaguesActive); // Already done by useEffect
    if (onTopLeaguesToggle) onTopLeaguesToggle()
  }

  const handleChampionClick = (champion: ChampionStat) => {
    // console.log("Champion clicked for dashboard:", champion);
    setSelectedChampion(champion);
    setIsDashboardOpen(true);
  }

  const handleDashboardClose = () => {
    setIsDashboardOpen(false);
    setSelectedChampion(null);
  }

   // --- Formatting Helper ---
   // No changes needed, formatCell seems robust.
   const formatCell = (value: number | string | undefined | null, type: 'percent' | 'decimal' | 'integer' | 'kda'): string => {
      if (value === 'Perfect' && type === 'kda') return 'Perfect';
      // Handle 0 specifically for better formatting
      if (value === 0) {
          switch(type) {
              case 'percent': return '0.0%';
              case 'decimal': return '0.0';
              case 'integer': return '0';
              case 'kda': return '0.00';
              default: return '0';
          }
      }
      // Handle other non-numeric or nullish values
      if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) return '-'; // Use '-' instead of 'N/A' for cleaner table

      const num = Number(value);
      // Check if conversion resulted in NaN
      if (isNaN(num)) return '-';

      try {
        switch(type) {
            case 'percent': return `${num.toFixed(1)}%`;
            case 'decimal': return num.toFixed(1);
            case 'integer': return num.toLocaleString(undefined, { maximumFractionDigits: 0 }); // Format integers nicely
            case 'kda': return num.toFixed(2);
            default: return String(value); // Fallback
        }
      } catch (e) {
          console.error("Error formatting cell value:", value, type, e);
          return '-'; // Fallback on error
      }
  }

  // --- Render ---
  // Structure remains the same. Table cells will now use the correctly calculated ban/banRate.
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Champion Stats</CardTitle>
        <CardDescription>
          {/* Use totalFilteredGames which reflects the scope of the current calculation */}
          {totalFilteredGames > 0
            ? `Showing stats for ${calculatedData?.stats?.length ?? 0} champions from ${totalFilteredGames.toLocaleString()} ${totalFilteredGames === 1 ? 'game' : 'games'}`
            : `No games match the current filters (${filterPatch !== 'all' ? `Patch: ${filterPatch}` : ''}${filterPatch !== 'all' && (filterLeague !== 'all' || isTopLeaguesActive) ? ', ' : ''}${isTopLeaguesActive ? 'Top Leagues' : (filterLeague !== 'all' ? `League: ${filterLeague}`: '')})`}
        </CardDescription>
        {/* Filters Row */}
        <div className="flex flex-col space-y-2 md:flex-row md:space-y-0 md:space-x-2 pt-3">
          <div className="flex flex-wrap gap-2"> {/* Use flex-wrap for better responsiveness */}
            <Select value={selectedPatch} onValueChange={handlePatchChange}>
              <SelectTrigger className="w-full sm:w-[120px]"> {/* Full width on small screens */}
                <SelectValue placeholder="Patch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Patches</SelectItem>
                {/* Ensure uniqueValues exist before mapping */}
                {data?.uniqueValues?.patches?.sort((a, b) => b.localeCompare(a, undefined, { numeric: true })).map((patch) => (
                  <SelectItem key={patch} value={patch}>
                    {patch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedLeague} onValueChange={handleLeagueChange} disabled={isTopLeaguesActive}>
              <SelectTrigger className="w-full sm:w-[120px]" disabled={isTopLeaguesActive}>
                <SelectValue placeholder="League" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Leagues</SelectItem>
                 {/* Ensure uniqueValues exist */}
                {data?.uniqueValues?.leagues?.sort().map((league) => (
                  <SelectItem key={league} value={league}>
                    {league}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <TooltipProvider delayDuration={200}>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isTopLeaguesActive ? "secondary" : "outline"} // Use secondary for active state
                    onClick={handleTopLeaguesToggle}
                    className="whitespace-nowrap"
                    aria-pressed={isTopLeaguesActive} // Accessibility
                  >
                    <Filter className="h-4 w-4 mr-1 sm:mr-2" /> Top Leagues
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter by Top Leagues (e.g., LPL, LCK, LEC)</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </div>
          <Input
            placeholder="Search champions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-[200px]" // Full width on small, fixed on medium+
          />
        </div>
      </CardHeader>
      <CardContent>
        {/* Chart Tabs */}
        <Tabs defaultValue="presence" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 gap-1 h-auto"> {/* Allow height adjust */}
             {(['presence', 'winrate', 'pickrate', 'banrate', 'blindpickrate', 'counterpickrate'] as const).map(tabValue => (
                <TabsTrigger key={tabValue} value={tabValue} className="text-xs sm:text-sm px-2 whitespace-nowrap"> {/* Adjust text size/padding */}
                    { { presence: 'Presence', winrate: 'Win %', pickrate: 'Pick %', banrate: 'Ban %', blindpickrate: 'Blind %', counterpickrate: 'Counter %' }[tabValue] }
                </TabsTrigger>
            ))}
          </TabsList>
          {/* Chart Content Panes */}
           {(['presence', 'winrate', 'pickrate', 'banrate', 'blindpickrate', 'counterpickrate'] as const).map(tabValue => (
            <TabsContent key={tabValue} value={tabValue} className="mt-4 outline-none ring-0"> {/* Remove focus outline */}
               <div className="h-[300px] w-full">
                 {topChampionsForChart.length > 0 ? (
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart
                        data={topChampionsForChart}
                        layout="vertical"
                        margin={{ top: 5, right: 40, left: 10, bottom: 5 }} // Adjust margins
                        barCategoryGap="20%" // Add gap between bars
                     >
                       <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--muted))" />
                       <XAxis
                          type="number"
                          // Domain adjustment based on type might be useful
                          // domain={['auto', 'auto']}
                          // Use axisLine={false} and tickLine={false} for cleaner look?
                          tickFormatter={(value) => {
                              const num = Number(value);
                              if (isNaN(num)) return '';
                              // Check if it's a rate/percentage tab
                              if (['presence', 'winrate', 'pickrate', 'banrate', 'blindpickrate', 'counterpickrate'].includes(tabValue)) {
                                  return `${num.toFixed(0)}%`;
                              }
                              return num.toLocaleString(); // For potential future tabs with counts
                          }}
                          stroke="hsl(var(--muted-foreground))"
                          fontSize={12} // Smaller font size for axis
                       />
                       <YAxis
                          dataKey="name"
                          type="category"
                          width={80} // Adjust width as needed
                          interval={0} // Show all labels
                          tick={<CustomYAxisTick />} // Use custom component for image + text
                          axisLine={false}
                          tickLine={false}
                        />
                       <Tooltip
                            contentStyle={{
                                background: "hsl(var(--background))",
                                border: "1px solid hsl(var(--border))",
                                borderRadius: "var(--radius)",
                                boxShadow: "var(--shadow-md)", // Optional: Add shadow
                            }}
                            cursor={{ fill: 'hsla(var(--muted), 0.5)' }} // Use theme color for cursor
                            formatter={(value: number, name: string, props: any) => {
                                // Tooltip logic remains mostly the same
                                const labelMap: Record<string, string> = { presence: 'Presence', winrate: 'Win Rate', pickrate: 'Pick Rate', banrate: 'Ban Rate', blindpickrate: 'Blind Pick %', counterpickrate: 'Counter Pick %' };
                                const dataKey = activeTab; // Use activeTab to determine the metric
                                const label = labelMap[dataKey] || dataKey;

                                const isPercent = ['presence', 'winrate', 'pickrate', 'banrate', 'blindpickrate', 'counterpickrate'].includes(dataKey);
                                const numericValue = Number(value);
                                let formattedValue = '-';
                                if (!isNaN(numericValue)){
                                    formattedValue = isPercent ? `${numericValue.toFixed(1)}%` : numericValue.toLocaleString();
                                }

                                // Show Games/Bans count as well if relevant
                                let secondaryInfo = '';
                                const champData = props.payload; // The data for the hovered bar
                                if (champData) {
                                    if (dataKey === 'pickrate' || dataKey === 'winrate' || dataKey === 'presence') {
                                         secondaryInfo = ` (${champData.picks?.toLocaleString() ?? 0} Picks)`;
                                    }
                                    if (dataKey === 'banrate' || dataKey === 'presence') {
                                        secondaryInfo += `${secondaryInfo ? ' / ' : ' ('}${champData.bans?.toLocaleString() ?? 0} Bans)`;
                                        if (secondaryInfo.startsWith(' (')) secondaryInfo += ')'; // Close parenthesis if only bans shown
                                    } else if (secondaryInfo) {
                                         secondaryInfo += ')'; // Close parenthesis if only picks shown
                                    }
                                }


                                // Return array: [value, label, potentially other info]
                                // Recharts uses the first element as the formatted value, second as the label.
                                return [`${formattedValue}${secondaryInfo}`, label];
                            }}
                       />
                        {/* Bar logic: dataKey should match the activeTab for value, use 'name' for identification */}
                       <Bar dataKey={activeTab} barSize={18} radius={[4, 4, 0, 0]} > {/* Add corner radius */}
                          {topChampionsForChart.map((entry, index) => {
                                // Consistent coloring based on index for simplicity
                                // Or use a more sophisticated coloring based on value/metric
                                const fill = `hsl(${210 + index * 20}, 60%, 60%)`; // Example HSL color scheme
                                return <Cell key={`cell-${index}`} fill={fill} />;
                          })}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                 ) : (
                   <div className="flex items-center justify-center h-full text-muted-foreground italic">
                     No champions meet the criteria for this chart.
                   </div>
                 )}
               </div>
            </TabsContent>
          ))}
        </Tabs>

        {/* Champions Table */}
        <div className="mt-6 overflow-x-auto relative"> {/* Added relative for potential absolute positioning inside */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px] sm:w-[180px] sticky left-0 bg-background z-10">Champion</TableHead> {/* Sticky header */}
                {/* Make headers sticky if needed: className="cursor-pointer sticky top-0 bg-background" */}
                <TableHead className="cursor-pointer text-right min-w-[90px]" onClick={() => requestSort("presence")}>Presence{getSortDirectionIndicator("presence")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[80px]" onClick={() => requestSort("picks")}>Games{getSortDirectionIndicator("picks")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[90px]" onClick={() => requestSort("winRate")}>Win %{getSortDirectionIndicator("winRate")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[80px]" onClick={() => requestSort("bans")}>Bans{getSortDirectionIndicator("bans")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[90px]" onClick={() => requestSort("banRate")}>Ban %{getSortDirectionIndicator("banRate")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[90px]" onClick={() => requestSort("pickRate")}>Pick %{getSortDirectionIndicator("pickRate")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[90px]" onClick={() => requestSort("blindPickRate")}>Blind %{getSortDirectionIndicator("blindPickRate")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[95px]" onClick={() => requestSort("counterPickRate")}>Counter %{getSortDirectionIndicator("counterPickRate")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[70px]" onClick={() => requestSort("kda")}>KDA{getSortDirectionIndicator("kda")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[70px]" onClick={() => requestSort("cspm")}>CS/M{getSortDirectionIndicator("cspm")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[80px]" onClick={() => requestSort("gpm")}>Gold/M{getSortDirectionIndicator("gpm")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[80px]" onClick={() => requestSort("dpm")}>Dmg/M{getSortDirectionIndicator("dpm")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[80px]" onClick={() => requestSort("avgDamageShare")}>Dmg%{getSortDirectionIndicator("avgDamageShare")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[80px]" onClick={() => requestSort("avgGoldShare")}>Gold%{getSortDirectionIndicator("avgGoldShare")}</TableHead>
                <TableHead className="cursor-pointer text-right min-w-[70px]" onClick={() => requestSort("avgKillParticipation")}>KP%{getSortDirectionIndicator("avgKillParticipation")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searchedChampions.length > 0 ? (
                searchedChampions.map((champion) => (
                  <TableRow
                    key={champion.name}
                    className="cursor-pointer hover:bg-muted/50" // Use themed hover color
                    onClick={() => handleChampionClick(champion)}
                    tabIndex={0} // Make row focusable
                    onKeyDown={(e) => e.key === 'Enter' && handleChampionClick(champion)} // Keyboard navigation
                  >
                    {/* Sticky cell for champion name */}
                    <TableCell className="font-medium sticky left-0 bg-background z-10">
                      <div className="flex items-center space-x-2">
                        <ChampionImage championName={champion.name} size={24} />
                        <span className="truncate">{champion.name}</span> {/* Prevent long names breaking layout */}
                      </div>
                    </TableCell>
                    {/* Right-align numeric data */}
                    <TableCell className="text-right">{formatCell(champion.presence, 'percent')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.picks, 'integer')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.winRate, 'percent')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.bans, 'integer')}</TableCell> {/* Uses champion.bans */}
                    <TableCell className="text-right">{formatCell(champion.banRate, 'percent')}</TableCell> {/* Uses champion.banRate */}
                    <TableCell className="text-right">{formatCell(champion.pickRate, 'percent')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.blindPickRate, 'percent')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.counterPickRate, 'percent')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.kda, 'kda')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.cspm, 'decimal')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.gpm, 'integer')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.dpm, 'integer')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.avgDamageShare, 'percent')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.avgGoldShare, 'percent')}</TableCell>
                    <TableCell className="text-right">{formatCell(champion.avgKillParticipation, 'percent')}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={16} className="text-center h-24 text-muted-foreground"> {/* Use theme color */}
                    No champions found matching the current filters and search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Champion Dashboard Invocation */}
      {/* Ensure calculatedData is available before rendering dashboard */}
      {selectedChampion && isDashboardOpen && calculatedData && (
        <ChampionDashboard
          champion={selectedChampion}
          isOpen={isDashboardOpen}
          onClose={handleDashboardClose}
          // Pass necessary data slices to the dashboard
          allChampions={calculatedData.stats} // Pass the currently calculated stats for context
          allSynergyData={calculatedData.synergy}
          matchupData={calculatedData.matchups}
          // Pass current filter context
          filterPatch={selectedPatch}
          filterLeague={selectedLeague}
          showTopLeagues={isTopLeaguesActive}
          totalFilteredGames={totalFilteredGames} // Pass total games for context if needed
        />
      )}
    </Card>
  )
}

// Custom Y Axis Tick for Bar Chart (Optional but nice)
const CustomYAxisTick = ({ x, y, payload }: any) => {
    const championName = payload.value;
    // Adjust positioning as needed
    return (
        <g transform={`translate(${x - 10},${y})`}>
             <foreignObject x={-75} y={-10} width="90" height="20"> {/* Adjust width/height */}
                 <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <ChampionImage championName={championName} size={16} />
                    <span style={{ marginLeft: '4px' }} title={championName}>{championName}</span>
                 </div>
             </foreignObject>
        </g>
    );
};
