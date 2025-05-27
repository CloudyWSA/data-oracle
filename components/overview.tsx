"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Bar, BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Users, Trophy, Gamepad2, Swords, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Button } from "../components/ui/button"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip"

interface OverviewProps {
  data: any
}

export default function Overview({ data }: OverviewProps) {
  const [filterPatch, setFilterPatch] = useState("all")
  const [filterLeague, setFilterLeague] = useState("all")
  const [showTopLeagues, setShowTopLeagues] = useState(false)

  // Define top leagues
  const topLeagues = ["LCK", "LPL", "LEC", "LTA"]

  // Filter data based on selected filters
  const filteredData = {
    playerData: data.playerData.filter((row: any) => {
      const matchesPatch = filterPatch === "all" || String(row.patch) === String(filterPatch)
      const matchesLeague =
        filterLeague === "all" ? (showTopLeagues ? topLeagues.includes(row.league) : true) : row.league === filterLeague
      return matchesPatch && matchesLeague
    }),
    teamData: data.teamData.filter((row: any) => {
      const matchesPatch = filterPatch === "all" || String(row.patch) === String(filterPatch)
      const matchesLeague =
        filterLeague === "all" ? (showTopLeagues ? topLeagues.includes(row.league) : true) : row.league === filterLeague
      return matchesPatch && matchesLeague
    }),
  }

  // Calculate win rates by side
  const sideStats = filteredData.teamData.reduce((acc: any, game: any) => {
    const side = game.side
    const result = game.result === 1 ? "win" : "loss"

    if (!acc[side]) {
      acc[side] = { win: 0, loss: 0, total: 0 }
    }

    acc[side][result]++
    acc[side].total++

    return acc
  }, {})

  const sideWinRates = Object.entries(sideStats).map(([side, stats]: [string, any]) => ({
    name: side,
    winRate: (stats.win / stats.total) * 100,
    games: stats.total,
  }))

  // Calculate most played champions
  const championCounts = filteredData.playerData.reduce((acc: any, game: any) => {
    const champion = game.champion
    if (!acc[champion]) {
      acc[champion] = 0
    }
    acc[champion]++
    return acc
  }, {})

  const topChampions = Object.entries(championCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => ({ name, count }))

  // Calculate position distribution
  const positionCounts = filteredData.playerData.reduce((acc: any, game: any) => {
    const position = game.position
    if (!acc[position]) {
      acc[position] = 0
    }
    acc[position]++
    return acc
  }, {})

  const positionData = Object.entries(positionCounts).map(([name, value]) => ({
    name,
    value,
  }))

  // Vasco da Gama colors
  const COLORS = ["#000000", "#CC0000", "#333333", "#666666", "#999999"]

  // Custom label for pie chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }: any) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius * 1.1
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)

    return (
      <text
        x={x}
        y={y}
        fill="#FFFFFF"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        style={{ fontWeight: "bold", textShadow: "0px 0px 3px #000000" }}
      >
        {`${name} (${(percent * 100).toFixed(0)}%)`}
      </text>
    )
  }

  // Calculate stats based on filtered data
  const totalGames = new Set(filteredData.playerData.map((row: any) => row.gameid)).size
  const totalChampions = new Set(filteredData.playerData.map((row: any) => row.champion)).size
  const totalPlayers = new Set(filteredData.playerData.map((row: any) => row.playername)).size
  const totalTeams = new Set(filteredData.playerData.map((row: any) => row.teamname)).size

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex flex-col sm:flex-row gap-4">
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-vasco-black text-white border-vasco-black/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Total Games</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Gamepad2 className="h-8 w-8 text-white mr-3" />
              <span className="text-3xl font-bold">{totalGames}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-vasco-black/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Champions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Swords className="h-8 w-8 text-vasco-black mr-3" />
              <span className="text-3xl font-bold">{totalChampions}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-vasco-black text-white border-vasco-black/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Players</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Users className="h-8 w-8 text-white mr-3" />
              <span className="text-3xl font-bold">{totalPlayers}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-vasco-black/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium">Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <Trophy className="h-8 w-8 text-vasco-black mr-3" />
              <span className="text-3xl font-bold">{totalTeams}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border-vasco-black/20">
          <CardHeader>
            <CardTitle>Most Played Champions</CardTitle>
            <CardDescription>Top 5 most picked champions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topChampions} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #000000", borderRadius: "8px" }}
                    itemStyle={{ color: "#000000" }}
                    formatter={(value, name) => [`${value.toFixed(1)}`, name]}
                  />
                  <Bar dataKey="count" fill="#CC0000" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-vasco-black text-white border-vasco-black/20">
          <CardHeader>
            <CardTitle>Position Distribution</CardTitle>
            <CardDescription>Games played by position</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={positionData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    outerRadius={100}
                    fill="#FFFFFF"
                    dataKey="value"
                    label={renderCustomizedLabel}
                  >
                    {positionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #000000", borderRadius: "8px" }}
                    itemStyle={{ color: "#000000" }}
                    formatter={(value, name) => [`${value.toFixed(1)}`, name]}
                  />
                  <Legend formatter={(value) => <span style={{ color: "#FFFFFF" }}>{value}</span>} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white border-vasco-black/20">
        <CardHeader>
          <CardTitle>Win Rate by Side</CardTitle>
          <CardDescription>Blue vs Red side performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sideWinRates} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <XAxis dataKey="name" />
                <YAxis label={{ value: "Win Rate (%)", angle: -90, position: "insideLeft" }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#FFFFFF", border: "1px solid #000000", borderRadius: "8px" }}
                  itemStyle={{ color: "#000000" }}
                  formatter={(value, name) => [`${value.toFixed(1)}%`, name]}
                />
                <Bar dataKey="winRate" fill="#CC0000" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
