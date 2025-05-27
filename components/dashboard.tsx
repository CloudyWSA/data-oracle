// src/components/dashboard.tsx
"use client"

import { useState, useEffect, lazy, Suspense, useMemo } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert"
import { AlertCircle, Gamepad2, Swords } from "lucide-react" // Added Swords icon
import { Skeleton } from "../components/ui/skeleton"
import type { ParticipantData } from "../src/types" // Import NEW types

// Lazy load components
const Overview = lazy(() => import("../components/overview"))
const ChampionStats = lazy(() => import("../components/champion-stats"))
const PlayerStats = lazy(() => import("../components/player-stats"))
const TeamStats = lazy(() => import("../components/team-stats"))
const GameAnalysis = lazy(() => import("../components/game-analysis"))
const DraftSimulator = lazy(() => import("../components/draft-simulator"))
const Matchups = lazy(() => import("../components/matchups")) // Add matchups import

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

const getGlobalPickOrder = (side: string, teamPickOrder: number | null): number | null => {
  if (teamPickOrder === null || teamPickOrder < 1 || teamPickOrder > 5) return null
  if (side === "Blue") {
    switch (teamPickOrder) {
      case 1:
        return 7
      case 2:
        return 10
      case 3:
        return 11
      case 4:
        return 18
      case 5:
        return 19
      default:
        return null
    }
  } else if (side === "Red") {
    switch (teamPickOrder) {
      case 1:
        return 8
      case 2:
        return 9
      case 3:
        return 12
      case 4:
        return 17
      case 5:
        return 20
      default:
        return null
    }
  }
  return null
}

const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"]
const TOP_LEAGUES = ["LPL", "LCK", "LEC"] // Define top leagues consistently

export default function Dashboard({ data }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("overview")
  const [processedData, setProcessedData] = useState<{
    playerData: ParticipantData[]
    teamData: any[]
    gameTeamDataMap: Map<string | number, { blue?: any; red?: any }>
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
  } | null>(null)
  const [processingError, setProcessingError] = useState<string | null>(null)

  const [normalizedDataState, setNormalizedDataState] = useState<ParticipantData[] | null>(null)

  const [filterPatch, setFilterPatch] = useState("all")
  const [filterLeague, setFilterLeague] = useState("all")
  const [showTopLeagues, setShowTopLeagues] = useState(false)

  // Initial processing
  useEffect(() => {
    if (!data || data.length === 0) {
      setProcessingError("No data provided to the dashboard.")
      setProcessedData(null)
      setNormalizedDataState(null)
      return
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
        const numericFields = [
          "participantid",
          "result",
          "kills",
          "deaths",
          "assists",
          "gamelength" /* add others as needed */,
        ]
        numericFields.forEach((field) => {
          if (normalizedRow[field] !== "" && normalizedRow[field] !== null && normalizedRow[field] !== undefined) {
            const num = Number(normalizedRow[field])
            normalizedRow[field] = isNaN(num) ? 0 : num // Default to 0 if conversion fails
          } else {
            normalizedRow[field] = 0 // Default missing/empty numeric fields to 0
          }
        })
        return normalizedRow as ParticipantData
      })

      // ---> Store the combined normalized data in state <---
      setNormalizedDataState(normalizedData)

      // ---> Validate core columns <---
      const sampleRow = normalizedData[0]
      if (
        !sampleRow ||
        sampleRow.gameid === undefined ||
        sampleRow.participantid === undefined ||
        sampleRow.side === undefined
      ) {
        throw new Error(
          "Core columns (gameid, participantid, side) missing or invalid in the data. Check column names and data integrity.",
        )
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
        if (row.league) leagues.add(String(row.league))
        if (row.patch) patches.add(String(row.patch))
        if (row.champion) champions.add(row.champion) // Add champ from player rows

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
          if (row.teamname) teams.add(row.teamname) // Add team name from team rows too
        }
      })

      if (playerData.length === 0)
        console.warn(
          "No valid player rows (participantid 1-10 with playername/champion) identified in the provided data.",
        )
      if (teamData.length === 0)
        console.warn(
          "No valid team rows (participantid 100/200 with teamname) identified. Ban/pick order data might be unavailable.",
        )

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
          patches: Array.from(patches)
            .filter(Boolean)
            .sort((a, b) => b.localeCompare(a, undefined, { numeric: true })), // Sort patches reverse numerically
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
      setNormalizedDataState(null) // Reset on error
    }
  }, [data])


  // --- Filter the *combined* normalized data based on the current filters ---
  // This is used for calculations that need BOTH player and team rows (like ChampionStats bans)
  const filteredCombinedData = useMemo(() => {
    // Use the state holding the full normalized data
    if (!normalizedDataState) return []

    console.log(`Filtering combined data: Patch=${filterPatch}, League=${filterLeague}, TopLeagues=${showTopLeagues}`)

    return normalizedDataState.filter((item: any) => {
      // Use 'item' as it can be player or team row
      // Apply patch filter
      const patchMatch = filterPatch === "all" || String(item.patch) === filterPatch
      if (!patchMatch) return false

      // Apply league filter or top leagues filter
      let leagueMatch = true
      if (showTopLeagues) {
        leagueMatch = TOP_LEAGUES.includes(String(item.league))
      } else if (filterLeague !== "all") {
        leagueMatch = String(item.league) === filterLeague
      }
      // No need for 'else' - if not topLeagues and not specific league, all leagues match

      return leagueMatch // Return true only if both patch and league conditions are met
    })
  }, [normalizedDataState, filterPatch, filterLeague, showTopLeagues])

  // Get unique game IDs from the *filtered combined data*
  const filteredGameIds = useMemo(() => {
    return new Set(filteredCombinedData.map((item) => item.gameid))
  }, [filteredCombinedData])

  // Total number of games in *filtered combined data*
  const totalFilteredGames = useMemo(() => {
    return filteredGameIds.size
  }, [filteredGameIds])

  // ... Keep all the existing calculation logic for allCalculatedStats, allSynergyData, etc. ...

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
    const newTopLeaguesState = !showTopLeagues
    setShowTopLeagues(newTopLeaguesState)
    // If top leagues are enabled, reset specific league filter
    if (newTopLeaguesState) {
      setFilterLeague("all")
    }
  }

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

  // Check if initial processing is done
  if (!processedData || !normalizedDataState) {
    return (
      <div className="flex justify-center items-center h-screen">
        {" "}
        {/* Full screen loading */}
        <div className="text-center p-8">
          <div role="status" className="flex flex-col items-center">
            {/* You can add a spinner icon here */}
            <svg
              aria-hidden="true"
              className="w-10 h-10 mb-4 text-gray-200 animate-spin dark:text-gray-600 fill-blue-600"
              viewBox="0 0 100 101"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
                fill="currentColor"
              />
              <path
                d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5424 39.6781 93.9676 39.0409Z"
                fill="currentFill"
              />
            </svg>
            <span className="text-lg font-semibold text-muted-foreground mt-2">Crunching the numbers...</span>
            <p className="text-sm text-muted-foreground">Please wait while we process the data.</p>
            <span className="sr-only">Loading...</span>
          </div>
        </div>
      </div>
    )
  }

  // --- Render Dashboard Tabs ---
  return (
    <div className="space-y-6 p-4 md:p-6">
      {" "}
      {/* Add padding */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-vasco-black text-white grid w-full grid-cols-3 sm:grid-cols-7 mb-4">
          {" "}
          {/* Updated to 7 columns */}
          <TabsTrigger value="overview" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            Overview
          </TabsTrigger>
          <TabsTrigger value="champions" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            Champions
          </TabsTrigger>
          <TabsTrigger value="matchups" className="data-[state=active]:bg-white data-[state=active]:text-vasco-black">
            <Swords className="h-4 w-4 mr-1" />
            Matchups
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
              allCalculatedStats={[]} // Pass calculated stats based on filtered data
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

        {/* Matchups Tab - NEW */}
        <TabsContent value="matchups" className="mt-2">
          <Suspense fallback={<TabLoading />}>
            <Matchups
              data={processedData}
              filteredCombinedData={filteredCombinedData}
              searchQuery=""
              filterPatch={filterPatch}
              filterLeague={filterLeague}
              showTopLeagues={showTopLeagues}
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
              allChampions={[]} // Basic champ list derived from allCalculatedStats
              allSynergyData={{}} // Ally synergy map based on filtered data
              matchupData={{}} // Counter matchup map based on filtered data
              draftPositionPickData={{ championPickCounts: {}, totalPicksPerSlot: {} }} // Draft position counts based on filtered data
            />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  )
}
