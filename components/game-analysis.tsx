"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Search, ChevronDown, ChevronUp } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import ChampionImage from "./champion-image"

interface GameAnalysisProps {
  data: any
  searchQuery: string
}

export default function GameAnalysis({ data, searchQuery }: GameAnalysisProps) {
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")
  const [filterLeague, setFilterLeague] = useState("all")
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)

  // We'll use a local search query state
  useState(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  // Process game data
  const gameData = useMemo(() => {
    // Group by game ID
    const games: Record<string, any> = {}

    // Get team data first
    data.teamData.forEach((row: any) => {
      const gameId = row.gameid
      if (!gameId) return

      if (!games[gameId]) {
        games[gameId] = {
          id: gameId,
          date: row.date,
          league: row.league,
          patch: row.patch,
          duration: row.gamelength,
          durationFormatted: formatTime(row.gamelength),
          teams: {},
          players: [],
          blueTeam: null,
          redTeam: null,
        }
      }

      const side = row.side
      games[gameId].teams[side] = {
        name: row.teamname,
        side: side,
        result: row.result,
        kills: row.kills,
        deaths: row.deaths,
        dragons: row.dragons,
        barons: row.barons,
        towers: row.towers,
        inhibitors: row.inhibitors,
        goldAt15: row.goldat15,
        goldAt20: row.goldat20,
        goldAt25: row.goldat25,
      }

      if (side === "Blue") {
        games[gameId].blueTeam = row.teamname
      } else if (side === "Red") {
        games[gameId].redTeam = row.teamname
      }
    })

    // Add player data
    data.playerData.forEach((row: any) => {
      const gameId = row.gameid
      if (!gameId || !games[gameId]) return

      games[gameId].players.push({
        name: row.playername,
        team: row.teamname,
        side: row.side,
        position: row.position,
        champion: row.champion,
        kills: row.kills,
        deaths: row.deaths,
        assists: row.assists,
        kda:
          row.deaths > 0 ? ((row.kills + row.assists) / row.deaths).toFixed(2) : (row.kills + row.assists).toFixed(2),
        damageShare: row.damageshare,
        goldShare: row.earnedgoldshare,
        cspm: row.cspm,
      })
    })

    return Object.values(games)
  }, [data])

  // Helper function to format time in seconds to MM:SS
  function formatTime(seconds: number) {
    if (!seconds) return "00:00"
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Filter and sort games
  const filteredGames = useMemo(() => {
    return gameData
      .filter((game: any) => {
        const matchesSearch =
          (game.blueTeam && game.blueTeam.toLowerCase().includes(localSearchQuery.toLowerCase())) ||
          (game.redTeam && game.redTeam.toLowerCase().includes(localSearchQuery.toLowerCase()))

        const matchesLeague = filterLeague === "all" || game.league === filterLeague

        return matchesSearch && matchesLeague
      })
      .sort((a: any, b: any) => {
        let comparison = 0

        switch (sortBy) {
          case "date":
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
            break
          case "duration":
            comparison = a.duration - b.duration
            break
          case "patch":
            comparison = String(a.patch || "").localeCompare(String(b.patch || ""))
            break
          default:
            comparison = new Date(a.date).getTime() - new Date(b.date).getTime()
        }

        return sortOrder === "asc" ? comparison : -comparison
      })
  }, [gameData, localSearchQuery, sortBy, sortOrder, filterLeague])

  // Selected game for detailed view
  const [selectedGame, setSelectedGame] = useState<string | null>(null)
  const gameDetail = useMemo(() => {
    if (!selectedGame) return null
    return gameData.find((game: any) => game.id === selectedGame)
  }, [selectedGame, gameData])

  // Game timeline data for charts
  const gameTimelineData = useMemo(() => {
    if (!gameDetail) return []

    const blueTeam = gameDetail.teams["Blue"]
    const redTeam = gameDetail.teams["Red"]

    if (!blueTeam || !redTeam) return []

    return [
      {
        time: "15:00",
        blueGold: blueTeam.goldAt15,
        redGold: redTeam.goldAt15,
        goldDiff: blueTeam.goldAt15 - redTeam.goldAt15,
      },
      {
        time: "20:00",
        blueGold: blueTeam.goldAt20,
        redGold: redTeam.goldAt20,
        goldDiff: blueTeam.goldAt20 - redTeam.goldAt20,
      },
      {
        time: "25:00",
        blueGold: blueTeam.goldAt25,
        redGold: redTeam.goldAt25,
        goldDiff: blueTeam.goldAt25 - redTeam.goldAt25,
      },
    ]
  }, [gameDetail])

  // Toggle sort order
  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
  }

  // Add pagination for the game table
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Get paginated games
  const paginatedGames = useMemo(() => {
    const start = page * rowsPerPage
    return filteredGames.slice(start, start + rowsPerPage)
  }, [filteredGames, page, rowsPerPage])

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search teams..."
              className="pl-10 bg-white border-vasco-black/20 text-vasco-black"
              value={localSearchQuery}
              onChange={(e) => setLocalSearchQuery(e.target.value)}
            />
          </div>

          <Select value={filterLeague} onValueChange={setFilterLeague}>
            <SelectTrigger className="w-full sm:w-40 bg-vasco-black border-vasco-black/20 text-white">
              <SelectValue placeholder="League" />
            </SelectTrigger>
            <SelectContent className="bg-vasco-black border-vasco-black/20 text-white">
              <SelectItem value="all">All Leagues</SelectItem>
              {data.uniqueValues.leagues.map((league: string, index: number) => (
                <SelectItem key={index} value={league}>
                  {league}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40 bg-vasco-black border-vasco-black/20 text-white">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent className="bg-vasco-black border-vasco-black/20 text-white">
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="duration">Duration</SelectItem>
                <SelectItem value="patch">Patch</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={toggleSortOrder}
              className="p-2 bg-vasco-black border border-vasco-black/20 rounded-md text-white"
            >
              {sortOrder === "asc" ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {selectedGame && gameDetail && (
        <Card className="bg-white border-vasco-black/20">
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-2xl">
                  {gameDetail.blueTeam} vs {gameDetail.redTeam}
                </CardTitle>
                <CardDescription>
                  {new Date(gameDetail.date).toLocaleDateString()} • {gameDetail.league} • Patch {gameDetail.patch} •{" "}
                  {gameDetail.durationFormatted}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  className={`${gameDetail.teams["Blue"].result === 1 ? "bg-vasco-red text-white" : "bg-vasco-black text-white"}`}
                >
                  {gameDetail.teams["Blue"].result === 1 ? "VICTORY" : "DEFEAT"}
                </Badge>
                <span className="text-xl font-bold">
                  {gameDetail.teams["Blue"].kills} - {gameDetail.teams["Red"].kills}
                </span>
                <Badge
                  className={`${gameDetail.teams["Red"].result === 1 ? "bg-vasco-red" : "bg-vasco-black"} text-white`}
                >
                  {gameDetail.teams["Red"].result === 1 ? "VICTORY" : "DEFEAT"}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Gold Timeline</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={gameTimelineData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="time" />
                      <YAxis />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px" }}
                        itemStyle={{ color: "#ffffff" }}
                        formatter={(value) => [Number(value).toFixed(1), ""]}
                      />
                      <Legend />
                      <Area
                        type="monotone"
                        dataKey="blueGold"
                        name={`${gameDetail.blueTeam} Gold`}
                        stroke="#000000"
                        fill="#000000"
                        fillOpacity={0.3}
                      />
                      <Area
                        type="monotone"
                        dataKey="redGold"
                        name={`${gameDetail.redTeam} Gold`}
                        stroke="#CC0000"
                        fill="#CC0000"
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Player Performance</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-vasco-black text-white">
                        <TableHead>Team</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Position</TableHead>
                        <TableHead>Champion</TableHead>
                        <TableHead>KDA</TableHead>
                        <TableHead>Damage Share</TableHead>
                        <TableHead>Gold Share</TableHead>
                        <TableHead>CS/min</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gameDetail.players
                        .sort((a: any, b: any) => {
                          // Sort by side first (Blue then Red)
                          if (a.side !== b.side) {
                            return a.side === "Blue" ? -1 : 1
                          }

                          // Then sort by position
                          const posOrder: Record<string, number> = {
                            top: 1,
                            jng: 2,
                            mid: 3,
                            bot: 4,
                            sup: 5,
                          }
                          return posOrder[a.position] - posOrder[b.position]
                        })
                        .map((player: any, index: number) => (
                          <TableRow
                            key={index}
                            className={player.side === "Blue" ? "bg-vasco-black/10" : "bg-vasco-red/10"}
                          >
                            <TableCell>{player.team}</TableCell>
                            <TableCell className="font-medium">{player.name}</TableCell>
                            <TableCell>{player.position}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <ChampionImage championName={player.champion} size={24} />
                                <span>{player.champion}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {player.kills}/{player.deaths}/{player.assists} ({player.kda})
                            </TableCell>
                            <TableCell>{(player.damageShare * 100).toFixed(1)}%</TableCell>
                            <TableCell>{(player.goldShare * 100).toFixed(1)}%</TableCell>
                            <TableCell>{player.cspm}</TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-vasco-black/20">
        <CardHeader>
          <CardTitle>Game History</CardTitle>
          <CardDescription>Browse and analyze past games</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-vasco-black text-white">
                  <TableHead>Date</TableHead>
                  <TableHead>League</TableHead>
                  <TableHead>Blue Team</TableHead>
                  <TableHead>Red Team</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Patch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedGames.map((game: any, index: number) => {
                  const blueTeam = game.teams["Blue"]
                  const redTeam = game.teams["Red"]

                  return (
                    <TableRow
                      key={index}
                      className={`${index % 2 === 0 ? "bg-vasco-black/5" : "bg-white"} cursor-pointer hover:bg-vasco-red/10`}
                      onClick={() => setSelectedGame(game.id)}
                    >
                      <TableCell>{new Date(game.date).toLocaleDateString()}</TableCell>
                      <TableCell>{game.league}</TableCell>
                      <TableCell className={blueTeam.result === 1 ? "text-vasco-red font-medium" : ""}>
                        {game.blueTeam}
                      </TableCell>
                      <TableCell className={redTeam.result === 1 ? "text-vasco-red font-medium" : ""}>
                        {game.redTeam}
                      </TableCell>
                      <TableCell>
                        {blueTeam.kills} - {redTeam.kills}
                      </TableCell>
                      <TableCell>{game.durationFormatted}</TableCell>
                      <TableCell>{game.patch}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-vasco-gray">
          Showing {Math.min(filteredGames.length, (page + 1) * rowsPerPage)} of {filteredGames.length} games
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
            disabled={(page + 1) * rowsPerPage >= filteredGames.length}
            className="border-vasco-black text-vasco-black hover:bg-vasco-black hover:text-white"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
