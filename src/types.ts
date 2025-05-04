// src/types.ts

export interface ParticipantData {
    // ... existing fields like gameid, participantid, playername, teamname, champion, position, side, result, kills, deaths, assists, etc.
    gameid: string | number;
    participantid: number;
    playername?: string;
    teamname?: string;
    champion: string;
    position?: string; // Ensure this is lowercase or handled consistently
    side: 'Blue' | 'Red' | string; // Allow string for flexibility but expect Blue/Red
    result?: 0 | 1; // 0 for loss, 1 for win
    kills?: number;
    deaths?: number;
    assists?: number;
    totalDamageDealtToChampions?: number;
    goldEarned?: number;
    league?: string; // Optional
    patch?: string; // Optional
    // Team specific rows might have pick1..pick5, ban1..ban5
    [key: string]: any; // Allow other potential keys
  }
  
  export interface ChampionStat {
    name: string;
    picks: number;
    wins: number;
    losses?: number;
    bans?: number; // Number of times champion was banned
    winRate: number;
    winRateFormatted?: string;
    pickRate: number; // Overall pick rate across all games processed for pick rates
    pickRateFormatted?: string;
    banRate?: number; // Ban rate across all games
    banRateFormatted?: string; // Formatted ban rate
    presence?: number; // Combined pick and ban rate
    kills?: number;
    deaths?: number;
    assists?: number;
    kda: number | 'Perfect';
    kdaFormatted?: string;
    avgKills: number;
    avgKillsFormatted?: string;
    avgDeaths: number;
    avgDeathsFormatted?: string;
    avgAssists: number;
    avgAssistsFormatted?: string;
    totalGamesPlayed?: number;
    positions: Record<string, number>; // e.g., { top: 10, mid: 5 }
    mainPosition: string; // "top", "jng", "mid", "bot", "sup", or "N/A"
    damageShare?: number; // Sum total damage
    avgDamageShare: number; // Average damage per game (needs context for %)
    avgDamageShareFormatted: string;
    goldShare: number; // Sum total gold
    avgGoldShare: number; // Average gold per game (needs context for %)
    avgGoldShareFormatted: string;
    totalLaneMatchups: number;
    blindPickMatchups: number;
    blindPickRate: number;
    blindPickRateFormatted: string;
    counterPickMatchups: number;
    counterPickRate: number;
    counterPickRateFormatted: string;
    pairings: Record<string, number>; // Counts played with other champs
    // Add any other relevant stats
  }
  
  
  export interface ChampionData {
    name: string;
    mainPosition?: string;
    winRate?: number; // Overall win rate
    pickRate?: number; // Overall pick rate
    banRate?: number; // Optional overall ban rate
    patch?: string;
    league?: string;
  }
  
  
  export interface SynergyPairData {
    winRate: number;         // Ally WR% together
    pickRate: number;        // Ally PR% together = Games Pair Played / Total Games
    gamesPlayed?: number;
  }
  
  export interface SynergyDataMap {
    [championName: string]: {
      [partnerChampionName: string]: SynergyPairData;
    };
  }
  
  
  // --- NEW TYPES ---
  
  export interface MatchupPairData {
      winRateVs: number;      // WR% of Champ1 vs Champ2
      pickRateVs: number;     // PR% of this matchup occurring = Games Played Vs / Total Games
      gamesPlayedVs?: number;
  }
  export interface MatchupDataMap {
      [championName: string]: {
          [opponentChampionName: string]: MatchupPairData;
      };
  }
  
  export interface DraftPositionPickData {
      championPickCounts: {
          [championName: string]: { [draftLabel: string]: number }; // e.g., { "Aatrox": { "B1": 5, "R1": 3 } }
      };
      totalPicksPerSlot: {
          [draftLabel: string]: number; // e.g., { "B1": 100, "R1": 98 }
      };
  }
  
  // --- END NEW TYPES ---