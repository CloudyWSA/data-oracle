"use client"

import { useState, useMemo, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Search, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import Image from "next/image"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface TeamStatsProps {
  data: any
  searchQuery: string
}

export default function TeamStats({ data, searchQuery }: TeamStatsProps) {
  const [sortBy, setSortBy] = useState("games")
  const [localSearchQuery, setLocalSearchQuery] = useState(searchQuery)
  const [filterPatch, setFilterPatch] = useState("all")
  const [showTopLeagues, setShowTopLeagues] = useState(false)
  const [filterLeague, setFilterLeague] = useState("all")

  // Define top leagues
  const topLeagues = ["LCK", "LPL", "LEC", "LTA"]

  // We'll use a local search query state
  useEffect(() => {
    setLocalSearchQuery(searchQuery)
  }, [searchQuery])

  // Calculate team statistics
  const teamStats = useMemo(() => {
    const stats: Record<string, any> = {}

    // Filter data based on selected filters
    const filteredTeamData = data.teamData.filter((row: any) => {
      const matchesPatch = filterPatch === "all" || String(row.patch) === String(filterPatch)
      const matchesLeague = showTopLeagues
        ? topLeagues.includes(row.league)
        : filterLeague === "all" || row.league === filterLeague
      return matchesPatch && matchesLeague
    })

    // Initialize stats for each team
    data.uniqueValues.teams.forEach((team: string) => {
      stats[team] = {
        name: team,
        games: 0,
        wins: 0,
        losses: 0,
        blueSideGames: 0,
        blueSideWins: 0,
        redSideGames: 0,
        redSideWins: 0,
        firstBloodGames: 0,
        firstBloodWins: 0,
        firstDragonGames: 0,
        firstDragonWins: 0,
        firstBaronGames: 0,
        firstBaronWins: 0,
        avgGameDuration: 0,
        totalGameDuration: 0,
        kills: 0,
        deaths: 0,
        dragons: 0,
        barons: 0,
        towers: 0,
        inhibitors: 0,
      }
    })

    // Populate stats from team data
    filteredTeamData.forEach((game: any) => {
      const team = game.teamname
      if (!team) return

      stats[team].games++

      if (game.result === 1) {
        stats[team].wins++
      } else {
        stats[team].losses++
      }

      // Side stats
      if (game.side === "Blue") {
        stats[team].blueSideGames++
        if (game.result === 1) {
          stats[team].blueSideWins++
        }
      } else if (game.side === "Red") {
        stats[team].redSideGames++
        if (game.result === 1) {
          stats[team].redSideWins++
        }
      }

      // Objective stats
      if (game.firstblood === 1) {
        stats[team].firstBloodGames++
        if (game.result === 1) {
          stats[team].firstBloodWins++
        }
      }

      if (game.firstdragon === 1) {
        stats[team].firstDragonGames++
        if (game.result === 1) {
          stats[team].firstDragonWins++
        }
      }

      if (game.firstbaron === 1) {
        stats[team].firstBaronGames++
        if (game.result === 1) {
          stats[team].firstBaronWins++
        }
      }

      // Game stats
      if (game.gamelength) {
        stats[team].totalGameDuration += game.gamelength
      }

      stats[team].kills += game.kills || 0
      stats[team].deaths += game.deaths || 0
      stats[team].dragons += game.dragons || 0
      stats[team].barons += game.barons || 0
      stats[team].towers += game.towers || 0
      stats[team].inhibitors += game.inhibitors || 0
    })

    // Calculate averages and rates
    Object.values(stats).forEach((team: any) => {
      team.winRate = team.games > 0 ? (team.wins / team.games) * 100 : 0
      team.blueSideWinRate = team.blueSideGames > 0 ? (team.blueSideWins / team.blueSideGames) * 100 : 0
      team.redSideWinRate = team.redSideGames > 0 ? (team.redSideWins / team.redSideGames) * 100 : 0

      team.firstBloodWinRate = team.firstBloodGames > 0 ? (team.firstBloodWins / team.firstBloodGames) * 100 : 0
      team.firstDragonWinRate = team.firstDragonGames > 0 ? (team.firstDragonWins / team.firstDragonGames) * 100 : 0
      team.firstBaronWinRate = team.firstBaronGames > 0 ? (team.firstBaronWins / team.firstBaronGames) * 100 : 0

      team.avgGameDuration = team.games > 0 ? team.totalGameDuration / team.games : 0
      team.avgGameDurationFormatted = formatTime(team.avgGameDuration)

      team.avgKills = team.games > 0 ? (team.kills / team.games).toFixed(1) : 0
      team.avgDeaths = team.games > 0 ? (team.deaths / team.games).toFixed(1) : 0
      team.avgDragons = team.games > 0 ? (team.dragons / team.games).toFixed(1) : 0
      team.avgBarons = team.games > 0 ? (team.barons / team.games).toFixed(1) : 0
      team.avgTowers = team.games > 0 ? (team.towers / team.games).toFixed(1) : 0
      team.avgInhibitors = team.games > 0 ? (team.inhibitors / team.games).toFixed(1) : 0
    })

    return Object.values(stats)
  }, [data, filterPatch, showTopLeagues, topLeagues, filterLeague])

  // Calculate most played champions by position for each team
  const teamChampionsByPosition = useMemo(() => {
    const champsByTeamAndPosition: Record<string, Record<string, Record<string, number>>> = {}

    // Initialize the structure
    data.uniqueValues.teams.forEach((team: string) => {
      champsByTeamAndPosition[team] = {
        top: {},
        jng: {},
        mid: {},
        bot: {},
        sup: {},
      }
    })

    // Filter player data based on selected filters
    const filteredPlayerData = data.playerData.filter((row: any) => {
      const matchesPatch = filterPatch === "all" || String(row.patch) === String(filterPatch)
      const matchesLeague = showTopLeagues
        ? topLeagues.includes(row.league)
        : filterLeague === "all" || row.league === filterLeague
      return matchesPatch && matchesLeague
    })

    // Count champions by position for each team
    filteredPlayerData.forEach((player: any) => {
      const team = player.teamname
      const position = player.position?.toLowerCase()
      const champion = player.champion

      if (!team || !position || !champion || !champsByTeamAndPosition[team] || !champsByTeamAndPosition[team][position])
        return

      if (!champsByTeamAndPosition[team][position][champion]) {
        champsByTeamAndPosition[team][position][champion] = 0
      }

      champsByTeamAndPosition[team][position][champion]++
    })

    // Find most played champion for each position
    const result: Record<string, Record<string, string>> = {}

    Object.entries(champsByTeamAndPosition).forEach(([team, positions]) => {
      result[team] = {
        top: "Unknown",
        jng: "Unknown",
        mid: "Unknown",
        bot: "Unknown",
        sup: "Unknown",
      }

      Object.entries(positions).forEach(([position, champions]) => {
        const entries = Object.entries(champions)
        if (entries.length === 0) {
          result[team][position] = "Unknown"
          return
        }

        const mostPlayed = entries.reduce(
          (max, current) => {
            return current[1] > max[1] ? current : max
          },
          ["Unknown", 0],
        )

        result[team][position] = mostPlayed[0]
      })
    })

    return result
  }, [data, filterPatch, filterLeague, showTopLeagues, topLeagues])

  // Helper function to format time in seconds to MM:SS
  function formatTime(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.floor(seconds % 60)
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }

  // Filter and sort teams
  const filteredTeams = useMemo(() => {
    return teamStats
      .filter((team: any) => {
        const matchesSearch = team.name.toLowerCase().includes(localSearchQuery.toLowerCase())
        return matchesSearch && team.games > 0
      })
      .sort((a: any, b: any) => {
        switch (sortBy) {
          case "games":
            return b.games - a.games
          case "winRate":
            return b.winRate - a.winRate
          case "kills":
            return Number.parseFloat(b.avgKills) - Number.parseFloat(a.avgKills)
          default:
            return b.games - a.games
        }
      })
  }, [teamStats, localSearchQuery, sortBy])

  // Limit topTeams to 5 instead of 10
  const topTeams = filteredTeams.slice(0, 5)

  // Selected team for detailed view
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const teamDetail = useMemo(() => {
    if (!selectedTeam) return null
    return teamStats.find((team: any) => team.name === selectedTeam)
  }, [selectedTeam, teamStats])

  // Team objective data for charts
  const teamObjectiveData = useMemo(() => {
    if (!teamDetail) return []

    return [
      {
        name: "First Blood",
        winRate: teamDetail.firstBloodWinRate,
        games: teamDetail.firstBloodGames,
      },
      {
        name: "First Dragon",
        winRate: teamDetail.firstDragonWinRate,
        games: teamDetail.firstDragonGames,
      },
      {
        name: "First Baron",
        winRate: teamDetail.firstBaronWinRate,
        games: teamDetail.firstBaronGames,
      },
      {
        name: "Blue Side",
        winRate: teamDetail.blueSideWinRate,
        games: teamDetail.blueSideGames,
      },
      {
        name: "Red Side",
        winRate: teamDetail.redSideWinRate,
        games: teamDetail.redSideGames,
      },
    ]
  }, [teamDetail])

  // Add pagination for the team table
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  // Get paginated teams
  const paginatedTeams = useMemo(() => {
    const start = page * rowsPerPage
    return filteredTeams.slice(start, start + rowsPerPage)
  }, [filteredTeams, page, rowsPerPage])

  // Get latest game version for champion images
  const [gameVersion, setGameVersion] = useState("13.10.1")

  // Function to get champion image URL
  const getChampionImageUrl = (championName: string) => {
    if (!championName || championName === "Unknown") return "/placeholder.svg?height=40&width=40"

    // Handle special cases
    if (championName === "K'Sante")
      return `https://ddragon.leagueoflegends.com/cdn/${gameVersion}/img/champion/KSante.png`
    if (championName === "Kai'Sa")
      return `https://ddragon.leagueoflegends.com/cdn/${gameVersion}/img/champion/Kaisa.png`
    if (championName === "Vel'Koz")
      return `https://ddragon.leagueoflegends.com/cdn/${gameVersion}/img/champion/Velkoz.png`
    if (championName === "Kha'Zix")
      return `https://ddragon.leagueoflegends.com/cdn/${gameVersion}/img/champion/Khazix.png`
    if (championName === "Rek'Sai")
      return `https://ddragon.leagueoflegends.com/cdn/${gameVersion}/img/champion/RekSai.png`

    return `https://ddragon.leagueoflegends.com/cdn/${gameVersion}/img/champion/${championName}.png`
  }

  // Position display names mapping
  const positionDisplayNames: Record<string, string> = {
    top: "Top",
    jng: "Jungle",
    mid: "Mid",
    bot: "Bot",
    sup: "Support",
  }

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

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-40 bg-vasco-black border-vasco-black/20 text-white">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent className="bg-vasco-black border-vasco-black/20 text-white">
              <SelectItem value="games">Games Played</SelectItem>
              <SelectItem value="winRate">Win Rate</SelectItem>
              <SelectItem value="kills">Avg Kills</SelectItem>
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

      {selectedTeam && teamDetail && (
        <Card className="bg-white border-vasco-black/20">
          <CardHeader>
            <CardTitle className="text-2xl">{teamDetail.name}</CardTitle>
            <CardDescription>
              {teamDetail.games} Games • {teamDetail.winRate.toFixed(1)}% Win Rate •{" "}
              {teamDetail.avgGameDurationFormatted} Avg Game Time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Objective Win Rates</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={teamObjectiveData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                      <XAxis dataKey="name" />
                      <YAxis label={{ value: "Win Rate (%)", angle: -90, position: "insideLeft" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#1e293b", border: "none", borderRadius: "8px" }}
                        itemStyle={{ color: "#ffffff" }}
                        formatter={(value) => [Number(value).toFixed(1) + "%", ""]}
                      />
                      <Legend />
                      <Bar dataKey="winRate" name="Win Rate %" fill="#CC0000" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-medium mb-4">Team Performance</h3>
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-vasco-black border-vasco-black/20 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Kills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamDetail.avgKills}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-vasco-black border-vasco-black/20 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Deaths</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamDetail.avgDeaths}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-vasco-black border-vasco-black/20 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Dragons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamDetail.avgDragons}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-vasco-black border-vasco-black/20 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Barons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamDetail.avgBarons}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-vasco-black border-vasco-black/20 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Towers</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamDetail.avgTowers}</div>
                    </CardContent>
                  </Card>

                  <Card className="bg-vasco-black border-vasco-black/20 text-white">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Avg Inhibitors</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{teamDetail.avgInhibitors}</div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>

            {/* Most played champions by position */}
            <div className="mt-6">
              <h3 className="text-lg font-medium mb-4">Most Played Champions by Position</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {teamChampionsByPosition[selectedTeam] &&
                  Object.entries(teamChampionsByPosition[selectedTeam] || {}).map(([position, champion]) => {
                    // Skip if position doesn't exist in the mapping
                    if (!positionDisplayNames[position]) return null

                    return (
                      <Card key={position} className="bg-white border-vasco-black/20">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm font-medium">{positionDisplayNames[position]}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col items-center">
                          <div className="relative w-16 h-16 mb-2">
                            <Image
                              src={getChampionImageUrl(champion) || "/placeholder.svg?height=40&width=40"}
                              alt={champion || "Unknown"}
                              width={64}
                              height={64}
                              className="rounded-full object-cover border-2 border-vasco-black"
                            />
                          </div>
                          <div className="text-center font-medium">{champion}</div>
                        </CardContent>
                      </Card>
                    )
                  })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-white border-vasco-black/20">
        <CardHeader>
          <CardTitle>Team Statistics</CardTitle>
          <CardDescription>Detailed performance metrics for all teams</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-vasco-black text-white">
                  <TableHead>Team</TableHead>
                  <TableHead>Games</TableHead>
                  <TableHead>Win Rate</TableHead>
                  <TableHead>Avg Game Time</TableHead>
                  <TableHead>Blue Side WR</TableHead>
                  <TableHead>Red Side WR</TableHead>
                  <TableHead>Avg Kills</TableHead>
                  <TableHead>Avg Dragons</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedTeams.map((team: any, index: number) => (
                  <TableRow
                    key={index}
                    className={`${index % 2 === 0 ? "bg-vasco-black/5" : "bg-white"} cursor-pointer hover:bg-vasco-red/10`}
                    onClick={() => setSelectedTeam(team.name)}
                  >
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>{team.games}</TableCell>
                    <TableCell>{team.winRate.toFixed(1)}%</TableCell>
                    <TableCell>{team.avgGameDurationFormatted}</TableCell>
                    <TableCell>{team.blueSideWinRate.toFixed(1)}%</TableCell>
                    <TableCell>{team.redSideWinRate.toFixed(1)}%</TableCell>
                    <TableCell>{team.avgKills}</TableCell>
                    <TableCell>{team.avgDragons}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-vasco-gray">
          Showing {Math.min(filteredTeams.length, (page + 1) * rowsPerPage)} of {filteredTeams.length} teams
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
            disabled={(page + 1) * rowsPerPage >= filteredTeams.length}
            className="border-vasco-black text-vasco-black hover:bg-vasco-black hover:text-white"
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
