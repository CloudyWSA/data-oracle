"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { Search, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import ChampionImage from "./champion-image"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface PlayerStatsProps {
  data: any
  searchQuery: string
}

export default function PlayerStats({ data, searchQuery }: PlayerStatsProps) {
  const [sortBy, setSortBy] = useState("games")
  const [filterPosition, setFilterPosition] = useState("all")
  const [localSearchQuery, setLocalSearchQuery] = useState("")
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [filterPatch, setFilterPatch] = useState("all")
  const [filterLeague, setFilterLeague] = useState("all")
  const [showTopLeagues, setShowTopLeagues] = useState(false)

  // Define top leagues
  const topLeagues = ["LCK", "LPL", "LEC", "LTA"]

  // Calculate player statistics
  const playerStats = useMemo(() => {
    const stats: Record<string, any> = {}

    // Filter data based on selected filters
    const filteredPlayerData = data.playerData.filter((row: any) => {
      const matchesPatch = filterPatch === "all" || String(row.patch) === String(filterPatch)
      const matchesLeague =
        filterLeague === "all" ? (showTopLeagues ? topLeagues.includes(row.league) : true) : row.league === filterLeague
      return matchesPatch && matchesLeague
    })

    // Initialize stats for each player
    data.uniqueValues.players.forEach((player: string) => {
      stats[player] = {
        name: player,
        games: 0,
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        champions: {},
        positions: {},
        damageShare: 0,
        goldShare: 0,
        cspm: 0,
        vspm: 0,
        dpm: 0,
      }
    })

    // Populate stats
    filteredPlayerData.forEach((game: any) => {
      const player = game.playername
      if (!player) return

      stats[player].games++

      if (game.result === 1) {
        stats[player].wins++
      } else {
        stats[player].losses++
      }

      stats[player].kills += game.kills || 0
      stats[player].deaths += game.deaths || 0
      stats[player].assists += game.assists || 0

      // Track champions
      const champion = game.champion
      if (champion) {
        if (!stats[player].champions[champion]) {
          stats[player].champions[champion] = 0
        }
        stats[player].champions[champion]++
      }

      // Track position
      const position = game.position || "unknown"
      if (!stats[player].positions[position]) {
        stats[player].positions[position] = 0
      }
      stats[player].positions[position]++

      // Track other stats
      stats[player].damageShare += game.damageshare || 0
      stats[player].goldShare += game.earnedgoldshare || 0
      stats[player].cspm += game.cspm || 0
      stats[player].vspm += game.vspm || 0
      stats[player].dpm += game.dpm || 0
    })

    // Calculate averages and rates
    Object.values(stats).forEach((player: any) => {
      player.winRate = player.games > 0 ? (player.wins / player.games) * 100 : 0
      player.kda =
        player.deaths > 0
          ? ((player.kills + player.assists) / player.deaths).toFixed(2)
          : (player.kills + player.assists).toFixed(2)

      player.avgKills = player.games > 0 ? (player.kills / player.games).toFixed(1) : 0
      player.avgDeaths = player.games > 0 ? (player.deaths / player.games).toFixed(1) : 0
      player.avgAssists = player.games > 0 ? (player.assists / player.games).toFixed(1) : 0

      player.avgDamageShare = player.games > 0 ? (player.damageShare / player.games).toFixed(1) : 0
      player.avgGoldShare = player.games > 0 ? (player.goldShare / player.games).toFixed(1) : 0
      player.avgCspm = player.games > 0 ? (player.cspm / player.games).toFixed(1) : 0
      player.avgVspm = player.games > 0 ? (player.vspm / player.games).toFixed(1) : 0
      player.avgDpm = player.games > 0 ? (player.dpm / player.games).toFixed(0) : 0

      // Find main position and champion
      let maxPosCount = 0
      let mainPosition = "unknown"
      Object.entries(player.positions).forEach(([position, count]: [string, any]) => {
        if (count > maxPosCount) {
          maxPosCount = count
          mainPosition = position
        }
      })
      player.mainPosition = mainPosition

      let maxChampCount = 0
      let mainChampion = "unknown"
      Object.entries(player.champions).forEach(([champion, count]: [string, any]) => {
        if (count > maxChampCount) {
          maxChampCount = count
          mainChampion = champion
        }
      })
      player.mainChampion = mainChampion

      // Calculate unique champions count
      player.uniqueChampions = Object.keys(player.champions).length
    })

    return Object.values(stats)
  }, [data, filterPatch, filterLeague, showTopLeagues])

  // Filter and sort players
  const filteredPlayers = useMemo(() => {
    return playerStats
      .filter((player: any) => {
        const matchesSearch = player.name.toLowerCase().includes(localSearchQuery.toLowerCase())
        const matchesPosition = filterPosition === "all" || player.mainPosition === filterPosition
        return matchesSearch && matchesPosition && player.games > 0
      })
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case "games":
            return b.games - a.games
          case "winRate":
            return b.winRate - a.winRate
          case "kda":
            return Number.parseFloat(b.kda) - Number.parseFloat(a.kda)
          case "dpm":
            return Number.parseFloat(b.avgDpm) - Number.parseFloat(a.avgDpm)
          default:
            return b.games - a.games
        }
      })
  }, [playerStats, localSearchQuery, sortBy, filterPosition])

  // Top 5 players for charts (limited to 5 for better visibility)
  const topPlayers = filteredPlayers.slice(0, 5)

  // Get paginated players
  const paginatedPlayers = useMemo(() => {
    const start = page * rowsPerPage
    return filteredPlayers.slice(start, start + rowsPerPage)
  }, [filteredPlayers, page, rowsPerPage])

  // Selected player for detailed view
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const playerDetail = useMemo(() => {
    if (!selectedPlayer) return null
    return playerStats.find((player: any) => player.name === selectedPlayer)
  }, [selectedPlayer, playerStats])

  // Player champion data for radar chart
  const playerChampionData = useMemo(() => {
    if (!playerDetail) return []

    return Object.entries(playerDetail.champions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5) // Limit to top 5 champions
      .map(([name, count]: [string, any]) => ({
        champion: name,
        games: count,
        winRate: 0, // We would need to calculate this separately
      }))
  }, [playerDetail])

  // Player performance metrics for radar chart
  const playerPerformanceData = useMemo(() => {
    if (!playerDetail) return []

    return [
      {
        subject: "KDA",
        A: Number.parseFloat(playerDetail.kda),
        fullMark: 10,
      },
      {
        subject: "CS/min",
        A: Number.parseFloat(playerDetail.avgCspm),
        fullMark: 10,
      },
      {
        subject: "Vision",
        A: Number.parseFloat(playerDetail.avgVspm),
        fullMark: 3,
      },
      {
        subject: "Damage",
        A: Number.parseFloat(playerDetail.avgDamageShare) * 100,
        fullMark: 30,
      },
      {
        subject: "Gold",
        A: Number.parseFloat(playerDetail.avgGoldShare) * 100,
        fullMark: 30,
      },
    ]
  }, [playerDetail])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search players..."
              className="pl-10 bg-white border-vasco-black/20 text-vasco-black"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filterPosition} onValueChange={setFilterPosition}>
            <SelectTrigger className="w-full sm:w-40 bg-vasco-black border-vasco-black/20 text-white">
              <SelectValue placeholder="Position" />
            </SelectTrigger>
            <SelectContent className="bg-vasco-black border-vasco-black/20 text-white">
              <SelectItem value="all">All Positions</SelectItem>
              <SelectItem value="top">Top</SelectItem>
              <SelectItem value="jng">Jungle</SelectItem>
              <SelectItem value="mid">Mid</SelectItem>
              <SelectItem value="bot">Bot</SelectItem>
              <SelectItem value="sup">Support</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40 bg-vasco-black border-vasco-black/20 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-vasco-black border-vasco-black/20 text-white">
              <SelectItem value="games">Games Played</SelectItem>
              <SelectItem value="winRate">Win Rate</SelectItem>
              <SelectItem value="kda">KDA</SelectItem>
              <SelectItem value="dpm">DPM</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterPatch} onValueChange={setFilterPatch}>
            <SelectTrigger className="w-full sm:w-40 bg-vasco-black border-vasco-black/20 text-white">
              <SelectValue placeholder="Patch" />
            </SelectTrigger>
            <SelectContent className="bg-vasco-black border-vasco-black/20 text-white">
              <SelectItem value="all">All Patches</SelectItem>
              {data.uniqueValues.patches.sort().map((patch: string, index: number) => (
                <SelectItem key={index} value={patch}>
                  {patch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterLeague} onValueChange={setFilterLeague}>
            <SelectTrigger className="w-full sm:w-40 bg-vasco-black border-vasco-black/20 text-white">
              <SelectValue placeholder="League" />
            </SelectTrigger>
            <SelectContent className="bg-vasco-black border-vasco-black/20 text-white">
              <SelectItem value="all">All Leagues</SelectItem>
              {data.uniqueValues.leagues.sort().map((league: string, index: number) => (
                <SelectItem key={index} value={league}>
                  {league}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showTopLeagues ? "default" : "outline"}
                  className={`${
                    showTopLeagues
                      ? "bg-vasco-red hover:bg-vasco-red/90 text-white"
                      : "border-vasco-black text-vasco-black hover:bg-vasco-black hover:text-white"
                  }`}
                  onClick={() => setShowTopLeagues(!showTopLeagues)}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Top Leagues
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filter for LCK, LPL, LEC, and LTA leagues only</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      </div>

      {selectedPlayer && playerDetail && (
        <Card className="bg-white border-vasco-black/20">
          <CardHeader className="flex flex-row items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarFallback className="bg-vasco-red text-white text-xl">
                {playerDetail.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-2xl">{playerDetail.name}</CardTitle>
              <CardDescription>
                {playerDetail.mainPosition} • {playerDetail.games} Games • {playerDetail.winRate.toFixed(1)}% Win Rate
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Performance Metrics</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={playerPerformanceData}>
                      <PolarGrid stroke="#444" />
                      <PolarAngleAxis dataKey="subject" />
                      <PolarRadiusAxis angle={30} domain={[0, "auto"]} />
                      <Radar name={playerDetail.name} dataKey="A" stroke="#CC0000" fill="#CC0000" fillOpacity={0.6} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px" }}
                        itemStyle={{ color: "#ffffff" }}
                        formatter={(value) => [Number(value).toFixed(1), ""]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Champion Pool</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={playerChampionData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="champion" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px" }}
                        itemStyle={{ color: "#ffffff" }}
                        formatter={(value) => [Number(value).toFixed(1), ""]}
                      />
                      <Legend />
                      <Bar dataKey="games" name="Games Played" fill="#000000" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Player Statistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="bg-vasco-black border-vasco-black/20 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">KDA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{playerDetail.kda}</div>
                    <div className="text-sm text-gray-300">
                      {playerDetail.avgKills}/{playerDetail.avgDeaths}/{playerDetail.avgAssists}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-vasco-black border-vasco-black/20 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Damage Per Minute</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{playerDetail.avgDpm}</div>
                    <div className="text-sm text-gray-300">{playerDetail.avgDamageShare}% team damage</div>
                  </CardContent>
                </Card>

                <Card className="bg-vasco-black border-vasco-black/20 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">CS Per Minute</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{playerDetail.avgCspm}</div>
                    <div className="text-sm text-gray-300">{playerDetail.avgGoldShare}% team gold</div>
                  </CardContent>
                </Card>

                <Card className="bg-vasco-black border-vasco-black/20 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Champion Pool</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{playerDetail.uniqueChampions}</div>
                    <div className="text-sm text-gray-300">Unique champions played</div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-vasco-black/20">
        <CardHeader>
          <CardTitle>Player Statistics</CardTitle>
          <CardDescription>Detailed performance metrics for all players</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-vasco-black text-white">
                  <TableHead>Player</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>KDA</TableHead>
                  <TableHead>Avg K/D/A</TableHead>
                  <TableHead>DPM</TableHead>
                  <TableHead>Main Champion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPlayers.map((player: any, index: number) => (
                  <TableRow
                    key={index}
                    className={`${index % 2 === 0 ? "bg-vasco-black/5" : "bg-white"} cursor-pointer hover:bg-vasco-red/10`}
                    onClick={() => setSelectedPlayer(player.name)}
                  >
                    <TableCell className="font-medium">{player.name}</TableCell>
                    <TableCell>{player.mainPosition}</TableCell>
                    <TableCell>{player.games}</TableCell>
                    <TableCell>{player.winRate.toFixed(1)}%</TableCell>
                    <TableCell>{player.kda}</TableCell>
                    <TableCell>
                      {player.avgKills}/{player.avgDeaths}/{player.avgAssists}
                    </TableCell>
                    <TableCell>{player.avgDpm}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ChampionImage championName={player.mainChampion} size={32} />
                        <span>{player.mainChampion}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-vasco-gray">
              Showing {Math.min(filteredPlayers.length, (page + 1) * rowsPerPage)} of {filteredPlayers.length} players
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="border-vasco-black text-vasco-black hover:bg-vasco-black hover:text-white"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * rowsPerPage >= filteredPlayers.length}
                className="border-vasco-black text-vasco-black hover:bg-vasco-black hover:text-white"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
