"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Badge } from "../components/ui/badge"
import { Progress } from "../components/ui/progress"
import { Alert, AlertDescription } from "../components/ui/alert"
import { Switch } from "../components/ui/switch"
import { Label } from "../components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import ChampionImage from "./champion-image"
import {
  Swords,
  TrendingUp,
  TrendingDown,
  Coins,
  Zap,
  Target,
  Sword,
  Users,
  Trophy,
  Clock,
  BarChart3,
  Crown,
  Filter,
  Sparkles,
  ArrowLeft,
  UserPlus,
  Eye,
  Shield,
  Flame,
  Activity,
  MapPin,
  Crosshair,
  Home,
  TreePine,
  Gamepad2,
} from "lucide-react"
import type { ParticipantData } from "../types"

interface MatchupsProps {
  data: {
    uniqueValues: {
      champions: string[]
      players: string[]
      teams: string[]
      leagues: string[]
      patches: string[]
    }
    stats: {
      totalGames: number
      totalChampions: number
      totalPlayers: number
      totalTeams: number
    }
  } | null
  filteredCombinedData: ParticipantData[]
  searchQuery: string
  filterPatch: string
  filterLeague: string
  showTopLeagues: boolean
}

interface ChampionPerformanceStats {
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgDamageShare: number
  avgGoldShare: number
  avgCSPM: number
  avgGoldAt10: number
  avgGoldAt15: number
  avgGoldAt20: number
  avgGoldAt25: number
  avgXpAt10: number
  avgXpAt15: number
  avgXpAt20: number
  avgXpAt25: number
  avgCsAt10: number
  avgCsAt15: number
  avgCsAt20: number
  avgCsAt25: number
  avgWardsPlaced?: number
  avgWardsKilled?: number
  avgVisionScore?: number
  avgControlWardsBought?: number
  avgFirstBloodParticipation?: number
  avgSoloKills?: number
  avgTeleportTakedowns?: number
  avgObjectiveStolen?: number
  avgEpicMonsterStolen?: number
  avgDragonTakedowns?: number
  avgBaronTakedowns?: number
  avgTurretPlatesTaken?: number
  avgTurretsDestroyed?: number
  avgInhibitorsDestroyed?: number
  avgDamageToObjectives?: number
  avgDamageToTurrets?: number
  avgDamageTaken?: number
  avgDamageHealed?: number
  avgDamageMitigated?: number
  avgCrowdControlScore?: number
  avgTimeSpentDead?: number
  avgLongestTimeSpentLiving?: number
  avgKillingSprees?: number
  avgLargestKillingSpree?: number
  avgDoubleKills?: number
  avgTripleKills?: number
  avgQuadraKills?: number
  avgPentaKills?: number
}

interface ExtendedMatchupStats {
  champion1: string
  champion2: string
  champion1Wins: number
  champion2Wins: number
  totalGames: number
  champion1WinRate: number
  champion2WinRate: number
  leaguesFound: { league: string; games: number }[]
  position: string
  champion1Stats: ChampionPerformanceStats
  champion2Stats: ChampionPerformanceStats
  avgGoldDiffAt10: number
  avgGoldDiffAt15: number
  avgGoldDiffAt20: number
  avgGoldDiffAt25: number
  avgXpDiffAt10: number
  avgXpDiffAt15: number
  avgXpDiffAt20: number
  avgXpDiffAt25: number
  avgCsDiffAt10: number
  avgCsDiffAt15: number
  avgCsDiffAt20: number
  avgCsDiffAt25: number
  avgKillDiff: number
  avgDeathDiff: number
  avgAssistDiff: number
  avgDamageShareDiff: number
  avgGoldShareDiff: number
}

interface DuoAggregatedStats {
  avgKills: number
  avgDeaths: number
  avgAssists: number
  avgDamageShare: number
  avgGoldShare: number
  avgCSPM: number
  avgGoldAt10: number
  avgGoldAt15: number
  avgGoldAt20: number
  avgGoldAt25: number
  avgXpAt10: number
  avgXpAt15: number
  avgXpAt20: number
  avgXpAt25: number
  avgCsAt10: number
  avgCsAt15: number
  avgCsAt20: number
  avgCsAt25: number
}

interface DuoStats {
  duo1Champion1: string
  duo1Champion2: string
  duo1Role1: string
  duo1Role2: string
  duo2Champion1: string
  duo2Champion2: string
  duo2Role1: string
  duo2Role2: string
  duo1Wins: number
  duo2Wins: number
  totalGames: number
  duo1WinRate: number
  duo2WinRate: number
  leaguesFound: { league: string; games: number }[]

  duo1AggregatedStats: DuoAggregatedStats
  duo2AggregatedStats: DuoAggregatedStats

  avgDuoGoldDiffAt10: number
  avgDuoGoldDiffAt15: number
  avgDuoGoldDiffAt20: number
  avgDuoGoldDiffAt25: number
  avgDuoXpDiffAt10: number
  avgDuoXpDiffAt15: number
  avgDuoXpDiffAt20: number
  avgDuoXpDiffAt25: number
  avgDuoCsDiffAt10: number
  avgDuoCsDiffAt15: number
  avgDuoCsDiffAt20: number
  avgDuoCsDiffAt25: number

  avgDuoKillDiff: number
  avgDuoDeathDiff: number
  avgDuoAssistDiff: number
  avgDuoDamageShareDiff: number
  avgDuoGoldShareDiff: number
  avgDuoCSPMDiff: number
}

const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"]
const TOP_LEAGUES = ["LPL", "LCK", "LEC"]

const POSITION_DISPLAY = {
  top: "Top",
  jng: "Jungle",
  mid: "Mid",
  bot: "ADC",
  sup: "Support",
}

export default function Matchups({
  data,
  filteredCombinedData,
}: MatchupsProps) {
  const [selectedChampion1, setSelectedChampion1] = useState<string>("")
  const [selectedChampion2, setSelectedChampion2] = useState<string>("")
  const [selectedPosition, setSelectedPosition] = useState<string>("all")

  const [duo1Champion1, setDuo1Champion1] = useState<string>("")
  const [duo1Champion2, setDuo1Champion2] = useState<string>("")
  const [duo1Role1, setDuo1Role1] = useState<string>("")
  const [duo1Role2, setDuo1Role2] = useState<string>("")
  const [duo2Champion1, setDuo2Champion1] = useState<string>("")
  const [duo2Champion2, setDuo2Champion2] = useState<string>("")
  const [duo2Role1, setDuo2Role1] = useState<string>("")
  const [duo2Role2, setDuo2Role2] = useState<string>("")

  const [localFilterPatch, setLocalFilterPatch] = useState("all")
  const [localFilterLeague, setLocalFilterLeague] = useState("all")
  const [localShowTopLeagues, setLocalShowTopLeagues] = useState(false)

  const localFilteredData = useMemo(() => {
    if (!filteredCombinedData.length) return []

    return filteredCombinedData.filter((item: any) => {
      const patchMatch = localFilterPatch === "all" || String(item.patch) === localFilterPatch
      if (!patchMatch) return false

      let leagueMatch = true
      if (localShowTopLeagues) {
        leagueMatch = TOP_LEAGUES.includes(String(item.league))
      } else if (localFilterLeague !== "all") {
        leagueMatch = String(item.league) === localFilterLeague
      }

      return leagueMatch
    })
  }, [filteredCombinedData, localFilterPatch, localFilterLeague, localShowTopLeagues])

  const availableChampions = useMemo(() => {
    if (!data?.uniqueValues?.champions) return []
    return data.uniqueValues.champions.sort()
  }, [data])

  const championOptions = useMemo(() => {
    return availableChampions.map((champion) => ({
      value: champion,
      label: champion,
      element: (
        <div className="flex items-center gap-3 py-1">
          <ChampionImage championName={champion} size={24} />
          <span className="font-medium">{champion}</span>
        </div>
      ),
    }))
  }, [availableChampions])

  const getNumericValue = (value: any): number => {
    const num = Number(value)
    return isNaN(num) ? 0 : num
  }

  const matchupStats = useMemo((): ExtendedMatchupStats | null => {
    if (
      !selectedChampion1 ||
      !selectedChampion2 ||
      selectedChampion1 === selectedChampion2 ||
      !localFilteredData.length
    ) {
      return null
    }

    const playerData = localFilteredData.filter(
      (row) => Number(row.participantid) >= 1 && Number(row.participantid) <= 10,
    )

    const gameData = new Map<string | number, ParticipantData[]>()
    playerData.forEach((player) => {
      if (!gameData.has(player.gameid)) {
        gameData.set(player.gameid, [])
      }
      gameData.get(player.gameid)?.push(player)
    })

    const matchups: Array<{
      champ1Player: ParticipantData
      champ2Player: ParticipantData
      champ1Won: boolean
    }> = []

    gameData.forEach((players) => {
      const champ1Players = players.filter((p) => p.champion === selectedChampion1)
      const champ2Players = players.filter((p) => p.champion === selectedChampion2)

      champ1Players.forEach((c1Player) => {
        champ2Players.forEach((c2Player) => {
          if (c1Player.side !== c2Player.side) {
            if (
              selectedPosition === "all" ||
              (c1Player.position?.toLowerCase() === selectedPosition &&
                c2Player.position?.toLowerCase() === selectedPosition)
            ) {
              const champ1Won = Number(c1Player.result) === 1
              matchups.push({
                champ1Player: c1Player,
                champ2Player: c2Player,
                champ1Won,
              })
            }
          }
        })
      })
    })

    if (matchups.length === 0) return null

    const leagueGameCounts = new Map<string, number>()
    matchups.forEach((m) => {
      const league = String(m.champ1Player.league)
      leagueGameCounts.set(league, (leagueGameCounts.get(league) || 0) + 1)
    })

    const leaguesFound = Array.from(leagueGameCounts.entries())
      .map(([league, games]) => ({ league, games }))
      .sort((a, b) => b.games - a.games)

    const champion1Wins = matchups.filter((m) => m.champ1Won).length
    const champion2Wins = matchups.length - champion1Wins
    const totalGames = matchups.length

    const calculateAverage = (getValue: (matchup: any) => number): number => {
      const values = matchups.map(getValue).filter((v) => !isNaN(v))
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
    }

    const position =
      selectedPosition !== "all" ? selectedPosition : matchups[0]?.champ1Player.position?.toLowerCase() || "unknown"

    const createChampionStats = (getPlayer: (m: any) => ParticipantData): ChampionPerformanceStats => ({
      avgKills: calculateAverage((m) => getNumericValue(getPlayer(m).kills)),
      avgDeaths: calculateAverage((m) => getNumericValue(getPlayer(m).deaths)),
      avgAssists: calculateAverage((m) => getNumericValue(getPlayer(m).assists)),
      avgDamageShare: calculateAverage((m) => getNumericValue(getPlayer(m).damageshare) * 100),
      avgGoldShare: calculateAverage((m) => getNumericValue(getPlayer(m).earnedgoldshare) * 100),
      avgCSPM: calculateAverage((m) => getNumericValue(getPlayer(m).cspm)),
      avgGoldAt10: calculateAverage((m) => getNumericValue(getPlayer(m).goldat10)),
      avgGoldAt15: calculateAverage((m) => getNumericValue(getPlayer(m).goldat15)),
      avgGoldAt20: calculateAverage((m) => getNumericValue(getPlayer(m).goldat20)),
      avgGoldAt25: calculateAverage((m) => getNumericValue(getPlayer(m).goldat25)),
      avgXpAt10: calculateAverage((m) => getNumericValue(getPlayer(m).xpat10)),
      avgXpAt15: calculateAverage((m) => getNumericValue(getPlayer(m).xpat15)),
      avgXpAt20: calculateAverage((m) => getNumericValue(getPlayer(m).xpat20)),
      avgXpAt25: calculateAverage((m) => getNumericValue(getPlayer(m).xpat25)),
      avgCsAt10: calculateAverage((m) => getNumericValue(getPlayer(m).csat10)),
      avgCsAt15: calculateAverage((m) => getNumericValue(getPlayer(m).csat15)),
      avgCsAt20: calculateAverage((m) => getNumericValue(getPlayer(m).csat20)),
      avgCsAt25: calculateAverage((m) => getNumericValue(getPlayer(m).csat25)),
      avgWardsPlaced: calculateAverage((m) => getNumericValue(getPlayer(m).wardsplaced)),
      avgWardsKilled: calculateAverage((m) => getNumericValue(getPlayer(m).wardskilled)),
      avgVisionScore: calculateAverage((m) => getNumericValue(getPlayer(m).visionscore)),
      avgControlWardsBought: calculateAverage((m) => getNumericValue(getPlayer(m).controlwardsbought)),
      avgFirstBloodParticipation: calculateAverage(
        (m) => getNumericValue(getPlayer(m).firstbloodkill) + getNumericValue(getPlayer(m).firstbloodassist),
      ),
      avgSoloKills: calculateAverage((m) => getNumericValue(getPlayer(m).solokills)),
      avgTeleportTakedowns: calculateAverage((m) => getNumericValue(getPlayer(m).teleporttakedowns)),
      avgObjectiveStolen: calculateAverage((m) => getNumericValue(getPlayer(m).objectivestolen)),
      avgEpicMonsterStolen: calculateAverage((m) => getNumericValue(getPlayer(m).epicmonsterstolen)),
      avgDragonTakedowns: calculateAverage((m) => getNumericValue(getPlayer(m).dragontakedowns)),
      avgBaronTakedowns: calculateAverage((m) => getNumericValue(getPlayer(m).barontakedowns)),
      avgTurretPlatesTaken: calculateAverage((m) => getNumericValue(getPlayer(m).turretplates)),
      avgTurretsDestroyed: calculateAverage((m) => getNumericValue(getPlayer(m).turretkills)),
      avgInhibitorsDestroyed: calculateAverage((m) => getNumericValue(getPlayer(m).inhibitorkills)),
      avgDamageToObjectives: calculateAverage((m) => getNumericValue(getPlayer(m).damagedealttoobjects)),
      avgDamageToTurrets: calculateAverage((m) => getNumericValue(getPlayer(m).damagedealttoturrets)),
      avgDamageTaken: calculateAverage((m) => (getNumericValue(getPlayer(m).damagetakenperminute) * (getNumericValue(getPlayer(m).gamelength) / 60))),
      avgDamageHealed: calculateAverage((m) => getNumericValue(getPlayer(m).totalheal)),
      avgDamageMitigated: calculateAverage((m) => (getNumericValue(getPlayer(m).damagemitigatedperminute) * (getNumericValue(getPlayer(m).gamelength) / 60))),
      avgCrowdControlScore: calculateAverage((m) => getNumericValue(getPlayer(m).timeccingothers)),
      avgTimeSpentDead: calculateAverage((m) => getNumericValue(getPlayer(m).timespentdead)),
      avgLongestTimeSpentLiving: calculateAverage((m) => getNumericValue(getPlayer(m).longesttimespentliving)),
      avgKillingSprees: calculateAverage((m) => getNumericValue(getPlayer(m).killingsprees)),
      avgLargestKillingSpree: calculateAverage((m) => getNumericValue(getPlayer(m).largestkillingspree)),
      avgDoubleKills: calculateAverage((m) => getNumericValue(getPlayer(m).doublekills)),
      avgTripleKills: calculateAverage((m) => getNumericValue(getPlayer(m).triplekills)),
      avgQuadraKills: calculateAverage((m) => getNumericValue(getPlayer(m).quadrakills)),
      avgPentaKills: calculateAverage((m) => getNumericValue(getPlayer(m).pentakills)),
    })
    
    const champion1Stats = createChampionStats(m => m.champ1Player);
    const champion2Stats = createChampionStats(m => m.champ2Player);

    return {
      champion1: selectedChampion1,
      champion2: selectedChampion2,
      champion1Wins,
      champion2Wins,
      totalGames,
      champion1WinRate: totalGames > 0 ? (champion1Wins / totalGames) * 100 : 0,
      champion2WinRate: totalGames > 0 ? (champion2Wins / totalGames) * 100 : 0,
      leaguesFound,
      position,
      champion1Stats,
      champion2Stats,
      avgGoldDiffAt10: calculateAverage((m) => getNumericValue(m.champ1Player.golddiffat10)),
      avgGoldDiffAt15: calculateAverage((m) => getNumericValue(m.champ1Player.golddiffat15)),
      avgGoldDiffAt20: calculateAverage((m) => getNumericValue(m.champ1Player.golddiffat20)),
      avgGoldDiffAt25: calculateAverage((m) => getNumericValue(m.champ1Player.golddiffat25)),
      avgXpDiffAt10: calculateAverage((m) => getNumericValue(m.champ1Player.xpdiffat10)),
      avgXpDiffAt15: calculateAverage((m) => getNumericValue(m.champ1Player.xpdiffat15)),
      avgXpDiffAt20: calculateAverage((m) => getNumericValue(m.champ1Player.xpdiffat20)),
      avgXpDiffAt25: calculateAverage((m) => getNumericValue(m.champ1Player.xpdiffat25)),
      avgCsDiffAt10: calculateAverage((m) => getNumericValue(m.champ1Player.csdiffat10)),
      avgCsDiffAt15: calculateAverage((m) => getNumericValue(m.champ1Player.csdiffat15)),
      avgCsDiffAt20: calculateAverage((m) => getNumericValue(m.champ1Player.csdiffat20)),
      avgCsDiffAt25: calculateAverage((m) => getNumericValue(m.champ1Player.csdiffat25)),
      avgKillDiff: champion1Stats.avgKills - champion2Stats.avgKills,
      avgDeathDiff: champion1Stats.avgDeaths - champion2Stats.avgDeaths,
      avgAssistDiff: champion1Stats.avgAssists - champion2Stats.avgAssists,
      avgDamageShareDiff: champion1Stats.avgDamageShare - champion2Stats.avgDamageShare,
      avgGoldShareDiff: champion1Stats.avgGoldShare - champion2Stats.avgGoldShare,
    }
  }, [selectedChampion1, selectedChampion2, selectedPosition, localFilteredData, getNumericValue])

  const duoStats = useMemo((): DuoStats | null => {
    if (
      !duo1Champion1 ||
      !duo1Champion2 ||
      !duo1Role1 ||
      !duo1Role2 ||
      !duo2Champion1 ||
      !duo2Champion2 ||
      !duo2Role1 ||
      !duo2Role2 ||
      !localFilteredData.length
    ) {
      return null
    }

    const playerData = localFilteredData.filter(
      (row) => Number(row.participantid) >= 1 && Number(row.participantid) <= 10,
    )

    const gameData = new Map<string | number, ParticipantData[]>()
    playerData.forEach((player) => {
      if (!gameData.has(player.gameid)) {
        gameData.set(player.gameid, [])
      }
      gameData.get(player.gameid)?.push(player)
    })

    const duoMatchups: Array<{
      duo1Players: ParticipantData[]
      duo2Players: ParticipantData[]
      duo1Won: boolean
      gameId: string | number
    }> = []

    gameData.forEach((players, gameId) => {
      const duo1Champ1Players = players.filter((p) => 
        p.champion === duo1Champion1 && p.position?.toLowerCase() === duo1Role1.toLowerCase()
      );
      const duo1Champ2Players = players.filter((p) => 
        p.champion === duo1Champion2 && p.position?.toLowerCase() === duo1Role2.toLowerCase()
      );
      const duo2Champ1Players = players.filter((p) => 
        p.champion === duo2Champion1 && p.position?.toLowerCase() === duo2Role1.toLowerCase()
      );
      const duo2Champ2Players = players.filter((p) => 
        p.champion === duo2Champion2 && p.position?.toLowerCase() === duo2Role2.toLowerCase()
      );

      duo1Champ1Players.forEach((d1c1) => {
        duo1Champ2Players.forEach((d1c2) => {
          if (d1c1.side === d1c2.side && d1c1.participantid !== d1c2.participantid) {
            duo2Champ1Players.forEach((d2c1) => {
              duo2Champ2Players.forEach((d2c2) => {
                if (d2c1.side === d2c2.side && d2c1.participantid !== d2c2.participantid && d2c1.side !== d1c1.side) {
                  const duo1Won = Number(d1c1.result) === 1
                  duoMatchups.push({
                    duo1Players: [d1c1, d1c2],
                    duo2Players: [d2c1, d2c2],
                    duo1Won,
                    gameId,
                  })
                }
              })
            })
          }
        })
      })
    })

    if (duoMatchups.length === 0) return null

    const leagueGameCounts = new Map<string, number>()
    duoMatchups.forEach((m) => {
      const league = String(m.duo1Players[0].league)
      leagueGameCounts.set(league, (leagueGameCounts.get(league) || 0) + 1)
    })

    const leaguesFound = Array.from(leagueGameCounts.entries())
      .map(([league, games]) => ({ league, games }))
      .sort((a, b) => b.games - a.games)

    const duo1Wins = duoMatchups.filter((m) => m.duo1Won).length
    const duo2Wins = duoMatchups.length - duo1Wins
    const totalGames = duoMatchups.length

    const calculateDuoAverage = (getValue: (matchup: any) => number): number => {
      const values = duoMatchups.map(getValue).filter((v) => !isNaN(v))
      return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0
    }

    const getDuoStatSum = (players: ParticipantData[], statKey: keyof ParticipantData, multiplyBy100: boolean = false): number => {
      return players.reduce((sum, player) => {
        let value = getNumericValue(player[statKey])
        if (multiplyBy100) value *= 100
        return sum + value
      }, 0)
    }

    const createDuoAggregatedStats = (getPlayers: (m: any) => ParticipantData[]): DuoAggregatedStats => ({
      avgKills: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'kills')),
      avgDeaths: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'deaths')),
      avgAssists: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'assists')),
      avgDamageShare: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'damageshare', true)),
      avgGoldShare: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'earnedgoldshare', true)),
      avgCSPM: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'cspm')),
      avgGoldAt10: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'goldat10')),
      avgGoldAt15: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'goldat15')),
      avgGoldAt20: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'goldat20')),
      avgGoldAt25: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'goldat25')),
      avgXpAt10: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'xpat10')),
      avgXpAt15: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'xpat15')),
      avgXpAt20: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'xpat20')),
      avgXpAt25: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'xpat25')),
      avgCsAt10: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'csat10')),
      avgCsAt15: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'csat15')),
      avgCsAt20: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'csat20')),
      avgCsAt25: calculateDuoAverage(m => getDuoStatSum(getPlayers(m), 'csat25')),
    });

    const duo1AggregatedStats = createDuoAggregatedStats(m => m.duo1Players);
    const duo2AggregatedStats = createDuoAggregatedStats(m => m.duo2Players);

    return {
      duo1Champion1, duo1Champion2, duo1Role1, duo1Role2,
      duo2Champion1, duo2Champion2, duo2Role1, duo2Role2,
      duo1Wins, duo2Wins, totalGames,
      duo1WinRate: totalGames > 0 ? (duo1Wins / totalGames) * 100 : 0,
      duo2WinRate: totalGames > 0 ? (duo2Wins / totalGames) * 100 : 0,
      leaguesFound,
      duo1AggregatedStats,
      duo2AggregatedStats,
      avgDuoGoldDiffAt10: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'goldat10') - getDuoStatSum(m.duo2Players, 'goldat10')),
      avgDuoGoldDiffAt15: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'goldat15') - getDuoStatSum(m.duo2Players, 'goldat15')),
      avgDuoGoldDiffAt20: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'goldat20') - getDuoStatSum(m.duo2Players, 'goldat20')),
      avgDuoGoldDiffAt25: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'goldat25') - getDuoStatSum(m.duo2Players, 'goldat25')),
      avgDuoXpDiffAt10: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'xpat10') - getDuoStatSum(m.duo2Players, 'xpat10')),
      avgDuoXpDiffAt15: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'xpat15') - getDuoStatSum(m.duo2Players, 'xpat15')),
      avgDuoXpDiffAt20: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'xpat20') - getDuoStatSum(m.duo2Players, 'xpat20')),
      avgDuoXpDiffAt25: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'xpat25') - getDuoStatSum(m.duo2Players, 'xpat25')),
      avgDuoCsDiffAt10: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'csat10') - getDuoStatSum(m.duo2Players, 'csat10')),
      avgDuoCsDiffAt15: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'csat15') - getDuoStatSum(m.duo2Players, 'csat15')),
      avgDuoCsDiffAt20: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'csat20') - getDuoStatSum(m.duo2Players, 'csat20')),
      avgDuoCsDiffAt25: calculateDuoAverage(m => getDuoStatSum(m.duo1Players, 'csat25') - getDuoStatSum(m.duo2Players, 'csat25')),
      avgDuoKillDiff: duo1AggregatedStats.avgKills - duo2AggregatedStats.avgKills,
      avgDuoDeathDiff: duo1AggregatedStats.avgDeaths - duo2AggregatedStats.avgDeaths,
      avgDuoAssistDiff: duo1AggregatedStats.avgAssists - duo2AggregatedStats.avgAssists,
      avgDuoDamageShareDiff: duo1AggregatedStats.avgDamageShare - duo2AggregatedStats.avgDamageShare,
      avgDuoGoldShareDiff: duo1AggregatedStats.avgGoldShare - duo2AggregatedStats.avgGoldShare,
      avgDuoCSPMDiff: duo1AggregatedStats.avgCSPM - duo2AggregatedStats.avgCSPM,
    }
  }, [
    duo1Champion1, duo1Champion2, duo1Role1, duo1Role2,
    duo2Champion1, duo2Champion2, duo2Role1, duo2Role2,
    localFilteredData, getNumericValue
  ])

  const EnhancedStatCard = ({
    title,
    value,
    icon: Icon,
    isPositive,
    suffix = "",
    description,
    championPerspective, // Can be Duo perspective
  }: {
    title: string
    value: number
    icon: any
    isPositive?: boolean | null 
    suffix?: string
    description?: string
    championPerspective?: string
  }) => {
    const getColorClass = () => {
      if (isPositive === null || (Math.abs(value) < 0.01 && value === 0) ) return "text-gray-600"
      return isPositive ? "text-black" : "text-gray-600"
    }

    const getBgClass = () => {
      if (isPositive === null || (Math.abs(value) < 0.01 && value === 0)) return "bg-gray-50"
      return isPositive ? "bg-white" : "bg-gray-100"
    }

    const getTrendIcon = () => {
      if (isPositive === null || (Math.abs(value) < 0.01 && value === 0)) return null
      return isPositive ? (
        <TrendingUp className="h-4 w-4 text-red-500" />
      ) : (
        <TrendingDown className="h-4 w-4 text-gray-600" />
      )
    }
    
    const displayValue = Math.abs(value) < 0.01 && value !== 0 && suffix !== "s" ? value.toExponential(1) : value.toFixed(suffix === "s" ? 1 : (Number.isInteger(value) && Math.abs(value) < 10 && suffix !== "%" ? 0 : 1));


    return (
      <Card className={`transition-all duration-300 hover:shadow-lg border-gray-200 ${getBgClass()}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon className="h-5 w-5 text-gray-500" />
              <span className="text-sm font-medium">{title}</span>
            </div>
            <div className="flex items-center space-x-1">
              {getTrendIcon()}
              <span className={`text-lg font-bold ${getColorClass()}`}>
                {value > 0 && isPositive !== null && value !== 0 ? "+" : ""}
                {displayValue}
                {suffix}
              </span>
            </div>
          </div>
          {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
          {championPerspective && (
            <p className="text-xs text-red-500 mt-1 font-medium">From {championPerspective}'s perspective</p>
          )}
        </CardContent>
      </Card>
    )
  }

  const RoleSpecificStats = ({
    stats,
    championName,
    position,
  }: {
    stats: ChampionPerformanceStats
    championName: string
    position: string
  }) => {
    const getRoleSpecificCards = () => {
      switch (position) {
        case "sup":
          return (
            <>
              <EnhancedStatCard title="Vision Score" value={stats.avgVisionScore || 0} icon={Eye} isPositive={null} description="Average vision score per game" />
              <EnhancedStatCard title="Wards Placed" value={stats.avgWardsPlaced || 0} icon={MapPin} isPositive={null} description="Average wards placed per game" />
              <EnhancedStatCard title="Wards Killed" value={stats.avgWardsKilled || 0} icon={Target} isPositive={null} description="Average enemy wards destroyed" />
              <EnhancedStatCard title="Control Wards" value={stats.avgControlWardsBought || 0} icon={Shield} isPositive={null} description="Average control wards bought" />
              <EnhancedStatCard title="Damage Healed" value={stats.avgDamageHealed || 0} icon={Activity} isPositive={null} description="Average healing provided" />
              <EnhancedStatCard title="CC Score" value={stats.avgCrowdControlScore || 0} icon={Crosshair} isPositive={null} suffix="s" description="Time spent CCing enemies" />
            </>
          )
        case "bot":
          return (
            <>
              <EnhancedStatCard title="Turret Plates" value={stats.avgTurretPlatesTaken || 0} icon={Home} isPositive={null} description="Average turret plates taken" />
              <EnhancedStatCard title="Damage to Turrets" value={stats.avgDamageToTurrets || 0} icon={Target} isPositive={null} description="Average damage to turrets" />
              <EnhancedStatCard title="Double Kills" value={stats.avgDoubleKills || 0} icon={Sword} isPositive={null} description="Average double kills per game" />
              <EnhancedStatCard title="Triple Kills" value={stats.avgTripleKills || 0} icon={Flame} isPositive={null} description="Average triple kills per game" />
              <EnhancedStatCard title="Damage Taken" value={stats.avgDamageTaken || 0} icon={Shield} isPositive={null} description="Average damage taken per game" />
              <EnhancedStatCard title="Killing Sprees" value={stats.avgKillingSprees || 0} icon={Trophy} isPositive={null} description="Average killing sprees per game" />
            </>
          )
        case "top":
          return (
            <>
              <EnhancedStatCard title="Solo Kills" value={stats.avgSoloKills || 0} icon={Sword} isPositive={null} description="Average solo kills per game" />
              <EnhancedStatCard title="Teleport Takedowns" value={stats.avgTeleportTakedowns || 0} icon={Zap} isPositive={null} description="Kills/assists after teleport" />
              <EnhancedStatCard title="Turret Plates" value={stats.avgTurretPlatesTaken || 0} icon={Home} isPositive={null} description="Average turret plates taken" />
              <EnhancedStatCard title="Damage Mitigated" value={stats.avgDamageMitigated || 0} icon={Shield} isPositive={null} description="Average damage mitigated" />
              <EnhancedStatCard title="Time Spent Dead" value={stats.avgTimeSpentDead || 0} icon={Clock} isPositive={false} suffix="s" description="Average time spent dead" />
              <EnhancedStatCard title="Longest Living Time" value={stats.avgLongestTimeSpentLiving || 0} icon={Activity} isPositive={null} suffix="s" description="Longest time spent alive" />
            </>
          )
        case "jng":
          return (
            <>
              <EnhancedStatCard title="Dragon Takedowns" value={stats.avgDragonTakedowns || 0} icon={TreePine} isPositive={null} description="Average dragon kills/assists" />
              <EnhancedStatCard title="Baron Takedowns" value={stats.avgBaronTakedowns || 0} icon={Crown} isPositive={null} description="Average baron kills/assists" />
              <EnhancedStatCard title="Objectives Stolen" value={stats.avgObjectiveStolen || 0} icon={Target} isPositive={null} description="Average objectives stolen" />
              <EnhancedStatCard title="Epic Monsters Stolen" value={stats.avgEpicMonsterStolen || 0} icon={Flame} isPositive={null} description="Dragons/Barons stolen" />
              <EnhancedStatCard title="Damage to Objectives" value={stats.avgDamageToObjectives || 0} icon={Crosshair} isPositive={null} description="Damage dealt to objectives" />
              <EnhancedStatCard title="Vision Score" value={stats.avgVisionScore || 0} icon={Eye} isPositive={null} description="Average vision score" />
            </>
          )
        case "mid":
          return (
            <>
              <EnhancedStatCard title="Solo Kills" value={stats.avgSoloKills || 0} icon={Sword} isPositive={null} description="Average solo kills per game" />
              <EnhancedStatCard title="First Blood Participation" value={stats.avgFirstBloodParticipation || 0} icon={Flame} isPositive={null} description="First blood kills + assists" />
              <EnhancedStatCard title="Teleport Takedowns" value={stats.avgTeleportTakedowns || 0} icon={Zap} isPositive={null} description="Kills/assists after teleport" />
              <EnhancedStatCard title="Damage to Turrets" value={stats.avgDamageToTurrets || 0} icon={Home} isPositive={null} description="Average damage to turrets" />
              <EnhancedStatCard title="Killing Sprees" value={stats.avgKillingSprees || 0} icon={Trophy} isPositive={null} description="Average killing sprees" />
              <EnhancedStatCard title="Vision Score" value={stats.avgVisionScore || 0} icon={Eye} isPositive={null} description="Average vision score" />
            </>
          )
        default:
          return (
            <>
              <EnhancedStatCard title="Solo Kills" value={stats.avgSoloKills || 0} icon={Sword} isPositive={null} description="Average solo kills per game" />
              <EnhancedStatCard title="Vision Score" value={stats.avgVisionScore || 0} icon={Eye} isPositive={null} description="Average vision score" />
              <EnhancedStatCard title="Damage to Objectives" value={stats.avgDamageToObjectives || 0} icon={Target} isPositive={null} description="Damage to objectives" />
              <EnhancedStatCard title="Turret Plates" value={stats.avgTurretPlatesTaken || 0} icon={Home} isPositive={null} description="Average turret plates taken" />
              <EnhancedStatCard title="Killing Sprees" value={stats.avgKillingSprees || 0} icon={Trophy} isPositive={null} description="Average killing sprees" />
              <EnhancedStatCard title="CC Score" value={stats.avgCrowdControlScore || 0} icon={Crosshair} isPositive={null} suffix="s" description="Time spent CCing enemies" />
            </>
          )
      }
    }

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <ChampionImage championName={championName} size={40} />
          <div>
            <h3 className="text-lg font-bold">
              {championName} - {POSITION_DISPLAY[position as keyof typeof POSITION_DISPLAY] || position.toUpperCase()}
            </h3>
            <p className="text-sm text-gray-600">Role-specific performance metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{getRoleSpecificCards()}</div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <Card className="bg-white border-2 border-black">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-black rounded-lg">
              <Swords className="h-6 w-6 text-white" />
            </div>
            Champion Matchup Arena
            <Sparkles className="h-5 w-5 text-red-500" />
          </CardTitle>
          <CardDescription className="text-lg text-gray-700">
            Discover the ultimate head-to-head champion showdowns with detailed performance analytics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Card className="bg-gray-50 border border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="h-5 w-5" />
                Data Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Patch</Label>
                  <Select value={localFilterPatch} onValueChange={setLocalFilterPatch}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="All patches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Patches</SelectItem>
                      {data?.uniqueValues?.patches?.map((patch) => (
                        <SelectItem key={patch} value={patch}>
                          Patch {patch}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">League</Label>
                  <Select
                    value={localFilterLeague}
                    onValueChange={(value) => {
                      setLocalFilterLeague(value)
                      if (value !== "all") setLocalShowTopLeagues(false)
                    }}
                  >
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="All leagues" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Leagues</SelectItem>
                      {data?.uniqueValues?.leagues?.map((league) => (
                        <SelectItem key={league} value={league}>
                          {league}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Position</Label>
                  <Select value={selectedPosition} onValueChange={setSelectedPosition}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="All positions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Positions</SelectItem>
                      {STANDARD_POSITIONS.map((position) => (
                        <SelectItem key={position} value={position}>
                          {POSITION_DISPLAY[position as keyof typeof POSITION_DISPLAY]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Top Leagues Only</Label>
                  <div className="flex items-center space-x-2 pt-2">
                    <Switch
                      checked={localShowTopLeagues}
                      onCheckedChange={(checked) => {
                        setLocalShowTopLeagues(checked)
                        if (checked) setLocalFilterLeague("all")
                      }}
                    />
                    <Label className="text-sm">LPL, LCK, LEC</Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-100">
              <TabsTrigger value="single" className="data-[state=active]:bg-white data-[state=active]:text-black">
                <Swords className="h-4 w-4 mr-2" />
                Single Champion
              </TabsTrigger>
              <TabsTrigger value="duo" className="data-[state=active]:bg-white data-[state=active]:text-black">
                <UserPlus className="h-4 w-4 mr-2" />
                Champion Duos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="space-y-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Crown className="h-5 w-5 text-black" />
                    Choose Your Champions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-4">
                      <div className="text-center">
                        <Badge variant="outline" className="bg-black text-white border-black">
                          Champion 1
                        </Badge>
                      </div>
                      <Select value={selectedChampion1} onValueChange={setSelectedChampion1}>
                        <SelectTrigger className="h-12 text-lg border-gray-300">
                          <SelectValue placeholder="Select first champion" />
                        </SelectTrigger>
                        <SelectContent>
                          {championOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.element}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedChampion1 && (
                        <div className="flex flex-col items-center space-y-3 p-4 bg-white rounded-lg shadow-md border-2 border-black">
                          <ChampionImage championName={selectedChampion1} size={80} />
                          <h3 className="text-xl font-bold text-black">{selectedChampion1}</h3>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="text-center">
                        <div className="relative">
                          <div className="w-16 h-16 bg-black rounded-full flex items-center justify-center shadow-lg">
                            <Swords className="h-8 w-8 text-white" />
                          </div>
                        </div>
                        <div className="mt-2 text-2xl font-bold text-black">VS</div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <Badge variant="outline" className="bg-gray-800 text-white border-gray-800">
                          Champion 2
                        </Badge>
                      </div>
                      <Select value={selectedChampion2} onValueChange={setSelectedChampion2}>
                        <SelectTrigger className="h-12 text-lg border-gray-300">
                          <SelectValue placeholder="Select second champion" />
                        </SelectTrigger>
                        <SelectContent>
                          {championOptions
                            .filter((option) => option.value !== selectedChampion1)
                            .map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                {option.element}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {selectedChampion2 && (
                        <div className="flex flex-col items-center space-y-3 p-4 bg-white rounded-lg shadow-md border-2 border-gray-800">
                          <ChampionImage championName={selectedChampion2} size={80} />
                          <h3 className="text-xl font-bold text-gray-800">{selectedChampion2}</h3>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!selectedChampion1 || !selectedChampion2 ? (
                <Alert className="border-2 border-dashed border-gray-300">
                  <BarChart3 className="h-4 w-4" />
                  <AlertDescription className="text-lg">
                    Select two different champions above to unleash the ultimate matchup analysis! ⚔️
                  </AlertDescription>
                </Alert>
              ) : selectedChampion1 === selectedChampion2 ? (
                <Alert className="border-2 border-gray-300 bg-gray-50">
                  <AlertDescription className="text-lg">
                    A champion cannot face themselves! Please select two different champions. 🤔
                  </AlertDescription>
                </Alert>
              ) : !matchupStats ? (
                <Alert className="border-2 border-gray-300 bg-gray-50">
                  <AlertDescription className="text-lg">
                    No direct matchups found between {selectedChampion1} and {selectedChampion2} in the current data
                    set.
                    {selectedPosition !== "all" && ` Try selecting "All Positions" to see more results.`} 📊
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-8">
                  <Card className="bg-black text-white border-0 shadow-2xl">
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                        <Trophy className="h-8 w-8 text-red-500" />
                        ULTIMATE SHOWDOWN
                        <Trophy className="h-8 w-8 text-red-500" />
                      </CardTitle>
                      <CardDescription className="text-xl text-gray-300">
                        Battle Statistics from {matchupStats.totalGames} Epic Encounters
                        {matchupStats.position !== "unknown" && (
                          <span className="block mt-2">
                            <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                              {POSITION_DISPLAY[matchupStats.position as keyof typeof POSITION_DISPLAY] ||
                                matchupStats.position.toUpperCase()}{" "}
                              Lane
                            </Badge>
                          </span>
                        )}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center space-y-4">
                          <ChampionImage championName={matchupStats.champion1} size={120} />
                          <h3 className="text-2xl font-bold text-white">{matchupStats.champion1}</h3>
                          <div className="space-y-3">
                            <div className="text-5xl font-bold text-white">
                              {matchupStats.champion1WinRate.toFixed(1)}%
                            </div>
                            <div className="bg-white/20 rounded-full p-1">
                              <Progress value={matchupStats.champion1WinRate} className="h-3" />
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Trophy className="h-5 w-5 text-red-500" />
                              <span className="text-xl font-semibold">{matchupStats.champion1Wins} Victories</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                              <Swords className="h-12 w-12 text-black" />
                            </div>
                            <div className="text-4xl font-bold text-white">VERSUS</div>
                            <Badge
                              variant="secondary"
                              className="text-lg px-4 py-2 bg-white/20 text-white border-white/30"
                            >
                              {matchupStats.totalGames} Battles
                            </Badge>
                          </div>
                        </div>

                        <div className="text-center space-y-4">
                          <ChampionImage championName={matchupStats.champion2} size={120} />
                          <h3 className="text-2xl font-bold text-gray-300">{matchupStats.champion2}</h3>
                          <div className="space-y-3">
                            <div className="text-5xl font-bold text-gray-300">
                              {matchupStats.champion2WinRate.toFixed(1)}%
                            </div>
                            <div className="bg-white/20 rounded-full p-1">
                              <Progress value={matchupStats.champion2WinRate} className="h-3" />
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Trophy className="h-5 w-5 text-red-500" />
                              <span className="text-xl font-semibold">{matchupStats.champion2Wins} Victories</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Trophy className="h-5 w-5 text-black" />
                        League Coverage
                        {matchupStats.leaguesFound.length === 1 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Single League
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {matchupStats.leaguesFound.length} Leagues
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {matchupStats.leaguesFound.length === 1 ? (
                        <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-800 mb-2">
                            {matchupStats.leaguesFound[0].league}
                          </div>
                          <p className="text-green-700">
                            All {matchupStats.totalGames} matchups found in this single league, providing consistent
                            competitive context.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-blue-700 font-medium">
                              Matchups found across {matchupStats.leaguesFound.length} different leagues
                            </p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {matchupStats.leaguesFound.map(({ league, games }) => (
                              <div key={league} className="text-center p-3 bg-gray-50 rounded-lg border">
                                <div className="font-semibold text-gray-800">{league}</div>
                                <div className="text-sm text-gray-600">{games} games</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <BarChart3 className="h-5 w-5 text-black" />
                        Comprehensive Champion Performance
                      </CardTitle>
                      <CardDescription>
                        Detailed individual performance metrics for each champion in this matchup
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-4">
                            <ChampionImage championName={matchupStats.champion1} size={40} />
                            <h3 className="text-lg font-bold">{matchupStats.champion1} Performance</h3>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Combat Performance</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">
                                  {matchupStats.champion1Stats.avgKills.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">Kills</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">
                                  {matchupStats.champion1Stats.avgDeaths.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">Deaths</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">
                                  {matchupStats.champion1Stats.avgAssists.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">Assists</div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Economy & Farm</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">
                                  {matchupStats.champion1Stats.avgCSPM.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">CS/Min</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">
                                  {matchupStats.champion1Stats.avgGoldShare.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-600">Gold Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">
                                  {matchupStats.champion1Stats.avgDamageShare.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-600">Damage Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">
                                  {(matchupStats.champion1Stats.avgGoldAt15 / 1000).toFixed(1)}k
                                </div>
                                <div className="text-xs text-gray-600">Gold .. 15min</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-4">
                            <ChampionImage championName={matchupStats.champion2} size={40} />
                            <h3 className="text-lg font-bold">{matchupStats.champion2} Performance</h3>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Combat Performance</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">
                                  {matchupStats.champion2Stats.avgKills.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">Kills</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">
                                  {matchupStats.champion2Stats.avgDeaths.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">Deaths</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">
                                  {matchupStats.champion2Stats.avgAssists.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">Assists</div>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Economy & Farm</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">
                                  {matchupStats.champion2Stats.avgCSPM.toFixed(1)}
                                </div>
                                <div className="text-xs text-gray-600">CS/Min</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">
                                  {matchupStats.champion2Stats.avgGoldShare.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-600">Gold Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">
                                  {matchupStats.champion2Stats.avgDamageShare.toFixed(1)}%
                                </div>
                                <div className="text-xs text-gray-600">Damage Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">
                                  {(matchupStats.champion2Stats.avgGoldAt15 / 1000).toFixed(1)}k
                                </div>
                                <div className="text-xs text-gray-600">Gold .. 15min</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {matchupStats.position !== "unknown" && (
                    <Card className="bg-white border border-gray-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-xl">
                          <Gamepad2 className="h-5 w-5 text-black" />
                          {POSITION_DISPLAY[matchupStats.position as keyof typeof POSITION_DISPLAY] ||
                            matchupStats.position.toUpperCase()}{" "}
                          Lane Specialist Metrics
                        </CardTitle>
                        <CardDescription>
                          Role-specific performance indicators tailored to{" "}
                          {POSITION_DISPLAY[matchupStats.position as keyof typeof POSITION_DISPLAY] ||
                            matchupStats.position}{" "}
                          gameplay
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                          <RoleSpecificStats
                            stats={matchupStats.champion1Stats}
                            championName={matchupStats.champion1}
                            position={matchupStats.position}
                          />
                          <RoleSpecificStats
                            stats={matchupStats.champion2Stats}
                            championName={matchupStats.champion2}
                            position={matchupStats.position}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <Clock className="h-6 w-6 text-black" />
                        Complete Game Timeline Analysis
                        <div className="flex items-center gap-2 ml-auto">
                          <ArrowLeft className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-500">{matchupStats.champion1} Perspective</span>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Comprehensive timeline showing gold, XP, and CS progression throughout the game
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          {
                            time: "10 Minutes",
                            gold: matchupStats.avgGoldDiffAt10,
                            xp: matchupStats.avgXpDiffAt10,
                            cs: matchupStats.avgCsDiffAt10,
                            goldTotal: matchupStats.champion1Stats.avgGoldAt10,
                            xpTotal: matchupStats.champion1Stats.avgXpAt10,
                            csTotal: matchupStats.champion1Stats.avgCsAt10,
                          },
                          {
                            time: "15 Minutes",
                            gold: matchupStats.avgGoldDiffAt15,
                            xp: matchupStats.avgXpDiffAt15,
                            cs: matchupStats.avgCsDiffAt15,
                            goldTotal: matchupStats.champion1Stats.avgGoldAt15,
                            xpTotal: matchupStats.champion1Stats.avgXpAt15,
                            csTotal: matchupStats.champion1Stats.avgCsAt15,
                          },
                          {
                            time: "20 Minutes",
                            gold: matchupStats.avgGoldDiffAt20,
                            xp: matchupStats.avgXpDiffAt20,
                            cs: matchupStats.avgCsDiffAt20,
                            goldTotal: matchupStats.champion1Stats.avgGoldAt20,
                            xpTotal: matchupStats.champion1Stats.avgXpAt20,
                            csTotal: matchupStats.champion1Stats.avgCsAt20,
                          },
                          {
                            time: "25 Minutes",
                            gold: matchupStats.avgGoldDiffAt25,
                            xp: matchupStats.avgXpDiffAt25,
                            cs: matchupStats.avgCsDiffAt25,
                            goldTotal: matchupStats.champion1Stats.avgGoldAt25,
                            xpTotal: matchupStats.champion1Stats.avgXpAt25,
                            csTotal: matchupStats.champion1Stats.avgCsAt25,
                          },
                        ].map((timePoint, index) => (
                          <div key={index} className="space-y-4">
                            <div className="text-center">
                              <Badge variant="outline" className="text-lg px-4 py-2 bg-gray-100 border-gray-300">
                                {timePoint.time}
                              </Badge>
                            </div>

                            <div className="space-y-3">
                              <h5 className="text-sm font-semibold text-gray-700">Advantages</h5>
                              <EnhancedStatCard
                                title="Gold Advantage"
                                value={timePoint.gold}
                                icon={Coins}
                                isPositive={timePoint.gold > 0}
                                suffix="g"
                                championPerspective={matchupStats.champion1}
                              />
                              <EnhancedStatCard
                                title="XP Advantage"
                                value={timePoint.xp}
                                icon={Zap}
                                isPositive={timePoint.xp > 0}
                                championPerspective={matchupStats.champion1}
                              />
                              <EnhancedStatCard
                                title="CS Advantage"
                                value={timePoint.cs}
                                icon={Target}
                                isPositive={timePoint.cs > 0}
                                championPerspective={matchupStats.champion1}
                              />
                            </div>

                            <div className="space-y-3">
                              <h5 className="text-sm font-semibold text-gray-700">Totals for {matchupStats.champion1}</h5>
                              <div className="grid grid-cols-1 gap-2">
                                <div className="text-center p-2 bg-gray-50 rounded">
                                  <div className="text-sm font-bold">{(timePoint.goldTotal / 1000).toFixed(1)}k</div>
                                  <div className="text-xs text-gray-600">Gold</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded">
                                  <div className="text-sm font-bold">{timePoint.xpTotal.toFixed(0)}</div>
                                  <div className="text-xs text-gray-600">XP</div>
                                </div>
                                <div className="text-center p-2 bg-gray-50 rounded">
                                  <div className="text-sm font-bold">{timePoint.csTotal.toFixed(0)}</div>
                                  <div className="text-xs text-gray-600">CS</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Swords className="h-5 w-5 text-black" />
                        Head-to-Head Comparison
                      </CardTitle>
                      <CardDescription>
                        Direct statistical comparison between the two champions in this matchup
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <EnhancedStatCard
                          title="Kill Difference"
                          value={matchupStats.avgKillDiff}
                          icon={Sword}
                          isPositive={matchupStats.avgKillDiff > 0}
                          description="Average kill advantage per game"
                          championPerspective={matchupStats.champion1}
                        />
                        <EnhancedStatCard
                          title="Death Difference"
                          value={matchupStats.avgDeathDiff}
                          icon={Activity}
                          isPositive={matchupStats.avgDeathDiff < 0}
                          description="Average death difference per game"
                          championPerspective={matchupStats.champion1}
                        />
                        <EnhancedStatCard
                          title="Assist Difference"
                          value={matchupStats.avgAssistDiff}
                          icon={Users}
                          isPositive={matchupStats.avgAssistDiff > 0}
                          description="Average assist advantage per game"
                          championPerspective={matchupStats.champion1}
                        />
                        <EnhancedStatCard
                          title="Damage Share Diff"
                          value={matchupStats.avgDamageShareDiff}
                          icon={Flame}
                          isPositive={matchupStats.avgDamageShareDiff > 0}
                          suffix="%"
                          description="Team damage share difference"
                          championPerspective={matchupStats.champion1}
                        />
                        <EnhancedStatCard
                          title="Gold Share Diff"
                          value={matchupStats.avgGoldShareDiff}
                          icon={Coins}
                          isPositive={matchupStats.avgGoldShareDiff > 0}
                          suffix="%"
                          description="Team gold share difference"
                          championPerspective={matchupStats.champion1}
                        />
                        <EnhancedStatCard
                          title="CS/Min Difference"
                          value={matchupStats.champion1Stats.avgCSPM - matchupStats.champion2Stats.avgCSPM}
                          icon={Target}
                          isPositive={matchupStats.champion1Stats.avgCSPM - matchupStats.champion2Stats.avgCSPM > 0}
                          description="CS per minute difference"
                          championPerspective={matchupStats.champion1}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>

            <TabsContent value="duo" className="space-y-6">
              <Card className="bg-white border border-gray-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <UserPlus className="h-5 w-5 text-black" />
                    Choose Your Champion Duos
                  </CardTitle>
                  <CardDescription>
                    Select two champion duos with their respective roles to analyze their head-to-head performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4">
                      <div className="text-center">
                        <Badge variant="outline" className="bg-black text-white border-black text-lg px-4 py-2">
                          Duo 1
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Champion 1</Label>
                          <Select value={duo1Champion1} onValueChange={setDuo1Champion1}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select champion" />
                            </SelectTrigger>
                            <SelectContent>
                              {championOptions.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  <div className="flex items-center gap-2">
                                    <ChampionImage championName={option.value} size={20} />
                                    <span>{option.value}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Role</Label>
                          <Select value={duo1Role1} onValueChange={setDuo1Role1}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {STANDARD_POSITIONS.map((position) => (
                                <SelectItem key={position} value={position}>
                                  {POSITION_DISPLAY[position as keyof typeof POSITION_DISPLAY]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Champion 2</Label>
                          <Select value={duo1Champion2} onValueChange={setDuo1Champion2}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select champion" />
                            </SelectTrigger>
                            <SelectContent>
                              {championOptions
                                .filter((option) => option.value !== duo1Champion1)
                                .map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <ChampionImage championName={option.value} size={20} />
                                      <span>{option.value}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Role</Label>
                          <Select value={duo1Role2} onValueChange={setDuo1Role2}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {STANDARD_POSITIONS.filter((p) => p !== duo1Role1).map((position) => (
                                <SelectItem key={position} value={position}>
                                  {POSITION_DISPLAY[position as keyof typeof POSITION_DISPLAY]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {duo1Champion1 && duo1Champion2 && duo1Role1 && duo1Role2 && (
                        <div className="flex justify-center space-x-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="text-center">
                            <ChampionImage championName={duo1Champion1} size={60} />
                            <p className="text-sm font-medium mt-2">{duo1Champion1}</p>
                            <p className="text-xs text-gray-600">
                              {POSITION_DISPLAY[duo1Role1 as keyof typeof POSITION_DISPLAY]}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="text-center">
                            <ChampionImage championName={duo1Champion2} size={60} />
                            <p className="text-sm font-medium mt-2">{duo1Champion2}</p>
                            <p className="text-xs text-gray-600">
                              {POSITION_DISPLAY[duo1Role2 as keyof typeof POSITION_DISPLAY]}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="text-center">
                        <Badge variant="outline" className="bg-gray-800 text-white border-gray-800 text-lg px-4 py-2">
                          Duo 2
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Champion 1</Label>
                          <Select value={duo2Champion1} onValueChange={setDuo2Champion1}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select champion" />
                            </SelectTrigger>
                            <SelectContent>
                              {championOptions
                                .filter((option) => option.value !== duo1Champion1 && option.value !== duo1Champion2)
                                .map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <ChampionImage championName={option.value} size={20} />
                                      <span>{option.value}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Role</Label>
                          <Select value={duo2Role1} onValueChange={setDuo2Role1}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {STANDARD_POSITIONS.map((position) => (
                                <SelectItem key={position} value={position}>
                                  {POSITION_DISPLAY[position as keyof typeof POSITION_DISPLAY]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Champion 2</Label>
                          <Select value={duo2Champion2} onValueChange={setDuo2Champion2}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select champion" />
                            </SelectTrigger>
                            <SelectContent>
                              {championOptions
                                .filter(
                                  (option) =>
                                    option.value !== duo1Champion1 &&
                                    option.value !== duo1Champion2 &&
                                    option.value !== duo2Champion1,
                                )
                                .map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <ChampionImage championName={option.value} size={20} />
                                      <span>{option.value}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium">Role</Label>
                          <Select value={duo2Role2} onValueChange={setDuo2Role2}>
                            <SelectTrigger className="border-gray-300">
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent>
                              {STANDARD_POSITIONS.filter((p) => p !== duo2Role1).map((position) => (
                                <SelectItem key={position} value={position}>
                                  {POSITION_DISPLAY[position as keyof typeof POSITION_DISPLAY]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {duo2Champion1 && duo2Champion2 && duo2Role1 && duo2Role2 && (
                        <div className="flex justify-center space-x-4 p-4 bg-gray-50 rounded-lg border">
                          <div className="text-center">
                            <ChampionImage championName={duo2Champion1} size={60} />
                            <p className="text-sm font-medium mt-2">{duo2Champion1}</p>
                            <p className="text-xs text-gray-600">
                              {POSITION_DISPLAY[duo2Role1 as keyof typeof POSITION_DISPLAY]}
                            </p>
                          </div>
                          <div className="flex items-center">
                            <Users className="h-6 w-6 text-gray-400" />
                          </div>
                          <div className="text-center">
                            <ChampionImage championName={duo2Champion2} size={60} />
                            <p className="text-sm font-medium mt-2">{duo2Champion2}</p>
                            <p className="text-xs text-gray-600">
                              {POSITION_DISPLAY[duo2Role2 as keyof typeof POSITION_DISPLAY]}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {!duoStats ? (
                <Alert className="border-2 border-dashed border-gray-300">
                  <UserPlus className="h-4 w-4" />
                  <AlertDescription className="text-lg">
                    Select two complete champion duos with their roles to analyze their matchup performance! 👥
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-8">
                  <Card className="bg-black text-white border-0 shadow-2xl">
                    <CardHeader className="text-center pb-2">
                      <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
                        <Users className="h-8 w-8 text-red-500" />
                        DUO SHOWDOWN
                        <Users className="h-8 w-8 text-red-500" />
                      </CardTitle>
                      <CardDescription className="text-xl text-gray-300">
                        Duo Battle Statistics from {duoStats.totalGames} Epic Encounters
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="text-center space-y-4">
                          <div className="flex justify-center space-x-2">
                            <div className="text-center">
                              <ChampionImage championName={duoStats.duo1Champion1} size={80} />
                              <p className="text-xs mt-1">
                                {POSITION_DISPLAY[duoStats.duo1Role1 as keyof typeof POSITION_DISPLAY]}
                              </p>
                            </div>
                            <div className="flex items-center text-2xl font-bold mx-1">+</div>
                            <div className="text-center">
                              <ChampionImage championName={duoStats.duo1Champion2} size={80} />
                              <p className="text-xs mt-1">
                                {POSITION_DISPLAY[duoStats.duo1Role2 as keyof typeof POSITION_DISPLAY]}
                              </p>
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-white">
                            {duoStats.duo1Champion1} & {duoStats.duo1Champion2}
                          </h3>
                          <div className="space-y-3">
                            <div className="text-4xl font-bold text-white">{duoStats.duo1WinRate.toFixed(1)}%</div>
                            <div className="bg-white/20 rounded-full p-1">
                              <Progress value={duoStats.duo1WinRate} className="h-3" />
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Trophy className="h-5 w-5 text-red-500" />
                              <span className="text-lg font-semibold">{duoStats.duo1Wins} Victories</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-center">
                          <div className="text-center space-y-4">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-2xl">
                              <Users className="h-12 w-12 text-black" />
                            </div>
                            <div className="text-3xl font-bold text-white">VERSUS</div>
                            <Badge
                              variant="secondary"
                              className="text-lg px-4 py-2 bg-white/20 text-white border-white/30"
                            >
                              {duoStats.totalGames} Battles
                            </Badge>
                          </div>
                        </div>

                        <div className="text-center space-y-4">
                           <div className="flex justify-center space-x-2">
                            <div className="text-center">
                              <ChampionImage championName={duoStats.duo2Champion1} size={80} />
                              <p className="text-xs mt-1">
                                {POSITION_DISPLAY[duoStats.duo2Role1 as keyof typeof POSITION_DISPLAY]}
                              </p>
                            </div>
                            <div className="flex items-center text-2xl font-bold mx-1">+</div>
                            <div className="text-center">
                              <ChampionImage championName={duoStats.duo2Champion2} size={80} />
                              <p className="text-xs mt-1">
                                {POSITION_DISPLAY[duoStats.duo2Role2 as keyof typeof POSITION_DISPLAY]}
                              </p>
                            </div>
                          </div>
                          <h3 className="text-xl font-bold text-gray-300">
                            {duoStats.duo2Champion1} & {duoStats.duo2Champion2}
                          </h3>
                          <div className="space-y-3">
                            <div className="text-4xl font-bold text-gray-300">{duoStats.duo2WinRate.toFixed(1)}%</div>
                            <div className="bg-white/20 rounded-full p-1">
                              <Progress value={duoStats.duo2WinRate} className="h-3" />
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <Trophy className="h-5 w-5 text-red-500" />
                              <span className="text-lg font-semibold">{duoStats.duo2Wins} Victories</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Trophy className="h-5 w-5 text-black" />
                        League Coverage
                        {duoStats.leaguesFound.length === 1 ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                            Single League
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {duoStats.leaguesFound.length} Leagues
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {duoStats.leaguesFound.length === 1 ? (
                        <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-2xl font-bold text-green-800 mb-2">
                            {duoStats.leaguesFound[0].league}
                          </div>
                          <p className="text-green-700">
                            All {duoStats.totalGames} duo matchups found in this single league, providing consistent
                            competitive context.
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-blue-700 font-medium">
                              Duo matchups found across {duoStats.leaguesFound.length} different leagues
                            </p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                            {duoStats.leaguesFound.map(({ league, games }) => (
                              <div key={league} className="text-center p-3 bg-gray-50 rounded-lg border">
                                <div className="font-semibold text-gray-800">{league}</div>
                                <div className="text-sm text-gray-600">{games} games</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <BarChart3 className="h-5 w-5 text-black" />
                        Combined Duo Performance
                      </CardTitle>
                      <CardDescription>
                        Aggregated performance metrics for each duo in this matchup
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-6">
                           <div className="flex items-center gap-3 mb-4">
                            <div className="flex -space-x-3">
                                <ChampionImage championName={duoStats.duo1Champion1} size={40} />
                                <ChampionImage championName={duoStats.duo1Champion2} size={40} className="border-2 border-white dark:border-black rounded-full" />
                            </div>
                            <h3 className="text-lg font-bold">Duo 1 ({duoStats.duo1Champion1} & {duoStats.duo1Champion2}) Performance</h3>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Combat Performance (Combined)</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">{duoStats.duo1AggregatedStats.avgKills.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">Kills</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">{duoStats.duo1AggregatedStats.avgDeaths.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">Deaths</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">{duoStats.duo1AggregatedStats.avgAssists.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">Assists</div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Economy & Farm (Combined)</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">{duoStats.duo1AggregatedStats.avgCSPM.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">CS/Min</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">{duoStats.duo1AggregatedStats.avgGoldShare.toFixed(1)}%</div>
                                <div className="text-xs text-gray-600">Gold Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">{duoStats.duo1AggregatedStats.avgDamageShare.toFixed(1)}%</div>
                                <div className="text-xs text-gray-600">Damage Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-black">{(duoStats.duo1AggregatedStats.avgGoldAt15 / 1000).toFixed(1)}k</div>
                                <div className="text-xs text-gray-600">Gold .. 15min</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div className="flex items-center gap-3 mb-4">
                             <div className="flex -space-x-3">
                                <ChampionImage championName={duoStats.duo2Champion1} size={40} />
                                <ChampionImage championName={duoStats.duo2Champion2} size={40} className="border-2 border-white dark:border-black rounded-full" />
                            </div>
                            <h3 className="text-lg font-bold">Duo 2 ({duoStats.duo2Champion1} & {duoStats.duo2Champion2}) Performance</h3>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Combat Performance (Combined)</h4>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">{duoStats.duo2AggregatedStats.avgKills.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">Kills</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">{duoStats.duo2AggregatedStats.avgDeaths.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">Deaths</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">{duoStats.duo2AggregatedStats.avgAssists.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">Assists</div>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-semibold text-gray-800">Economy & Farm (Combined)</h4>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">{duoStats.duo2AggregatedStats.avgCSPM.toFixed(1)}</div>
                                <div className="text-xs text-gray-600">CS/Min</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">{duoStats.duo2AggregatedStats.avgGoldShare.toFixed(1)}%</div>
                                <div className="text-xs text-gray-600">Gold Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">{duoStats.duo2AggregatedStats.avgDamageShare.toFixed(1)}%</div>
                                <div className="text-xs text-gray-600">Damage Share</div>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg">
                                <div className="text-xl font-bold text-gray-700">{(duoStats.duo2AggregatedStats.avgGoldAt15 / 1000).toFixed(1)}k</div>
                                <div className="text-xs text-gray-600">Gold .. 15min</div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-2xl">
                        <Clock className="h-6 w-6 text-black" />
                        Duo Timeline Analysis
                        <div className="flex items-center gap-2 ml-auto">
                          <ArrowLeft className="h-4 w-4 text-red-500" />
                          <span className="text-sm font-medium text-red-500">Duo 1 Perspective</span>
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Combined timeline advantages for Duo 1 vs Duo 2
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {[
                          { time: "10 Minutes", goldDiff: duoStats.avgDuoGoldDiffAt10, xpDiff: duoStats.avgDuoXpDiffAt10, csDiff: duoStats.avgDuoCsDiffAt10, goldTotal: duoStats.duo1AggregatedStats.avgGoldAt10, xpTotal: duoStats.duo1AggregatedStats.avgXpAt10, csTotal: duoStats.duo1AggregatedStats.avgCsAt10 },
                          { time: "15 Minutes", goldDiff: duoStats.avgDuoGoldDiffAt15, xpDiff: duoStats.avgDuoXpDiffAt15, csDiff: duoStats.avgDuoCsDiffAt15, goldTotal: duoStats.duo1AggregatedStats.avgGoldAt15, xpTotal: duoStats.duo1AggregatedStats.avgXpAt15, csTotal: duoStats.duo1AggregatedStats.avgCsAt15 },
                          { time: "20 Minutes", goldDiff: duoStats.avgDuoGoldDiffAt20, xpDiff: duoStats.avgDuoXpDiffAt20, csDiff: duoStats.avgDuoCsDiffAt20, goldTotal: duoStats.duo1AggregatedStats.avgGoldAt20, xpTotal: duoStats.duo1AggregatedStats.avgXpAt20, csTotal: duoStats.duo1AggregatedStats.avgCsAt20 },
                          { time: "25 Minutes", goldDiff: duoStats.avgDuoGoldDiffAt25, xpDiff: duoStats.avgDuoXpDiffAt25, csDiff: duoStats.avgDuoCsDiffAt25, goldTotal: duoStats.duo1AggregatedStats.avgGoldAt25, xpTotal: duoStats.duo1AggregatedStats.avgXpAt25, csTotal: duoStats.duo1AggregatedStats.avgCsAt25 },
                        ].map((tp, index) => (
                          <div key={index} className="space-y-4">
                            <div className="text-center"><Badge variant="outline" className="text-lg px-4 py-2 bg-gray-100 border-gray-300">{tp.time}</Badge></div>
                            <div className="space-y-3">
                              <h5 className="text-sm font-semibold text-gray-700">Advantages (Duo 1 vs Duo 2)</h5>
                              <EnhancedStatCard title="Gold Adv." value={tp.goldDiff} icon={Coins} isPositive={tp.goldDiff > 0} suffix="g" championPerspective="Duo 1" />
                              <EnhancedStatCard title="XP Adv." value={tp.xpDiff} icon={Zap} isPositive={tp.xpDiff > 0} championPerspective="Duo 1" />
                              <EnhancedStatCard title="CS Adv." value={tp.csDiff} icon={Target} isPositive={tp.csDiff > 0} championPerspective="Duo 1" />
                            </div>
                             <div className="space-y-3">
                              <h5 className="text-sm font-semibold text-gray-700">Totals for Duo 1</h5>
                              <div className="grid grid-cols-1 gap-2">
                                <div className="text-center p-2 bg-gray-50 rounded"><div className="text-sm font-bold">{(tp.goldTotal / 1000).toFixed(1)}k</div><div className="text-xs text-gray-600">Gold</div></div>
                                <div className="text-center p-2 bg-gray-50 rounded"><div className="text-sm font-bold">{tp.xpTotal.toFixed(0)}</div><div className="text-xs text-gray-600">XP</div></div>
                                <div className="text-center p-2 bg-gray-50 rounded"><div className="text-sm font-bold">{tp.csTotal.toFixed(0)}</div><div className="text-xs text-gray-600">CS</div></div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-white border border-gray-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3 text-xl">
                        <Swords className="h-5 w-5 text-black" />
                        Duo Head-to-Head Comparison
                      </CardTitle>
                      <CardDescription>
                        Direct statistical differences between the two duos (Duo 1 - Duo 2)
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <EnhancedStatCard title="Total Kill Diff." value={duoStats.avgDuoKillDiff} icon={Sword} isPositive={duoStats.avgDuoKillDiff > 0} description="Avg combined kill advantage" championPerspective="Duo 1" />
                        <EnhancedStatCard title="Total Death Diff." value={duoStats.avgDuoDeathDiff} icon={Activity} isPositive={duoStats.avgDuoDeathDiff < 0} description="Avg combined death difference" championPerspective="Duo 1" />
                        <EnhancedStatCard title="Total Assist Diff." value={duoStats.avgDuoAssistDiff} icon={Users} isPositive={duoStats.avgDuoAssistDiff > 0} description="Avg combined assist advantage" championPerspective="Duo 1" />
                        <EnhancedStatCard title="Damage Share Diff." value={duoStats.avgDuoDamageShareDiff} icon={Flame} isPositive={duoStats.avgDuoDamageShareDiff > 0} suffix="%" description="Combined team damage share difference" championPerspective="Duo 1" />
                        <EnhancedStatCard title="Gold Share Diff." value={duoStats.avgDuoGoldShareDiff} icon={Coins} isPositive={duoStats.avgDuoGoldShareDiff > 0} suffix="%" description="Combined team gold share difference" championPerspective="Duo 1" />
                        <EnhancedStatCard title="CS/Min Diff." value={duoStats.avgDuoCSPMDiff} icon={Target} isPositive={duoStats.avgDuoCSPMDiff > 0} description="Combined CS per minute difference" championPerspective="Duo 1" />
                      </div>
                    </CardContent>
                  </Card>

                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}