"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select"
import { Input } from "../components/ui/input"
import { Search, X, RefreshCw, Swords, TrendingUp, Star, Ban, ArrowUpDown } from "lucide-react"
import ChampionImage from "./champion-image" // Ensure this component exists and works as expected
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../components/ui/tooltip"
import { cn } from "../lib/utils" // Ensure this utility exists

// --- TYPE DEFINITIONS ---
interface ChampionData {
  name: string
  mainPosition?: string
  winRate?: number
  pickRate?: number
  patch?: string // Added patch to champion data
  league?: string // Added league to champion data
  banRate?: number
}
interface SynergyPairData {
  winRate: number
  pickRate: number
  gamesPlayed?: number
}
interface SynergyDataMap {
  [championName: string]: { [partnerChampionName: string]: SynergyPairData }
}
interface MatchupPairData {
  winRateVs: number
  pickRateVs: number
  gamesPlayedVs?: number
}
interface MatchupDataMap {
  [championName: string]: { [opponentChampionName: string]: MatchupPairData }
}
interface DraftPositionPickData {
  championPickCounts: {
    [championName: string]: { [draftLabel: string]: number }
  }
  totalPicksPerSlot: {
    [draftLabel: string]: number
  }
}
interface DraftSimulatorProps {
  allChampions: ChampionData[]
  allSynergyData: SynergyDataMap
  matchupData: MatchupDataMap
  draftPositionPickData: DraftPositionPickData
  patches?: string[] // Prop for available patches
  leagues?: string[] // Prop for available leagues
}
// --- END TYPE DEFINITIONS ---

// --- CONSTANTS ---
const DRAFT_POSITIONS = [
  // Ban Phase 1
  { team: "blue", phase: "ban", order: 1, label: "B Ban 1", teamBanIndex: 0 },
  { team: "red", phase: "ban", order: 2, label: "R Ban 1", teamBanIndex: 0 },
  { team: "blue", phase: "ban", order: 3, label: "B Ban 2", teamBanIndex: 1 },
  { team: "red", phase: "ban", order: 4, label: "R Ban 2", teamBanIndex: 1 },
  { team: "blue", phase: "ban", order: 5, label: "B Ban 3", teamBanIndex: 2 },
  { team: "red", phase: "ban", order: 6, label: "R Ban 3", teamBanIndex: 2 },
  // Pick Phase 1
  { team: "blue", phase: "pick", order: 7, label: "B Pick 1", teamPickIndex: 0 },
  { team: "red", phase: "pick", order: 8, label: "R Pick 1", teamPickIndex: 0 },
  { team: "red", phase: "pick", order: 9, label: "R Pick 2", teamPickIndex: 1 },
  { team: "blue", phase: "pick", order: 10, label: "B Pick 2", teamPickIndex: 1 },
  { team: "blue", phase: "pick", order: 11, label: "B Pick 3", teamPickIndex: 2 },
  { team: "red", phase: "pick", order: 12, label: "R Pick 3", teamPickIndex: 2 },
  // Ban Phase 2
  { team: "red", phase: "ban", order: 13, label: "R Ban 4", teamBanIndex: 3 },
  { team: "blue", phase: "ban", order: 14, label: "B Ban 4", teamBanIndex: 3 },
  { team: "red", phase: "ban", order: 15, label: "R Ban 5", teamBanIndex: 4 },
  { team: "blue", phase: "ban", order: 16, label: "B Ban 5", teamBanIndex: 4 },
  // Pick Phase 2
  { team: "red", phase: "pick", order: 17, label: "R Pick 4", teamPickIndex: 3 },
  { team: "blue", phase: "pick", order: 18, label: "B Pick 4", teamPickIndex: 3 },
  { team: "blue", phase: "pick", order: 19, label: "B Pick 5", teamPickIndex: 4 },
  { team: "red", phase: "pick", order: 20, label: "R Pick 5", teamPickIndex: 4 },
]
const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"]
type PickInfo = { champion: string; position: string }

// Thresholds (Keep existing)
const MIN_ALLY_SYNERGY_PICK_RATE = 1.5
const MIN_ALLY_SYNERGY_WIN_RATE = 49.0
const MIN_COUNTER_WIN_RATE = 51.0
const DRAFT_SLOT_PICK_RATE_LOW_THRESHOLD = 1.0
const DRAFT_SLOT_PICK_RATE_HIGH_THRESHOLD = 10.0
const PREMIUM_PICK_ALLY_SCORE_THRESHOLD = 51 * 2.0 // Example, adjust as needed
const PREMIUM_PICK_COUNTER_SCORE_THRESHOLD = 52.0 // Example, adjust as needed
const PREMIUM_PICK_SLOT_RATE_THRESHOLD = 3.0 // Example, adjust as needed
// --- END CONSTANTS ---

export default function DraftSimulator({
  allChampions = [],
  allSynergyData = {},
  matchupData = {},
  draftPositionPickData = { championPickCounts: {}, totalPicksPerSlot: {} },
  patches = [], // Default empty array
  leagues = [], // Default empty array
}: DraftSimulatorProps) {
  // --- STATE HOOKS ---
  const [draftState, setDraftState] = useState<{
    currentStep: number
    blueBans: string[]
    redBans: string[]
    bluePicks: PickInfo[]
    redPicks: PickInfo[]
  }>({
    currentStep: 1,
    blueBans: Array(5).fill(""),
    redBans: Array(5).fill(""),
    bluePicks: Array(5).fill({ champion: "", position: "" }),
    redPicks: Array(5).fill({ champion: "", position: "" }),
  })

  const [searchQuery, setSearchQuery] = useState("")
  const [filterPosition, setFilterPosition] = useState("all")
  const [filterPatch, setFilterPatch] = useState("all") // State for patch filter
  const [filterLeague, setFilterLeague] = useState("all") // State for league filter

  // --- MEMOIZED VALUES ---
  const currentDraftPosition = useMemo(() => {
    if (draftState.currentStep > DRAFT_POSITIONS.length) return null
    return DRAFT_POSITIONS.find((pos) => pos.order === draftState.currentStep) || null
  }, [draftState.currentStep])

  const bannedChampions = useMemo(() => {
    return new Set([...draftState.blueBans, ...draftState.redBans].filter(Boolean))
  }, [draftState.blueBans, draftState.redBans])

  const pickedChampions = useMemo(() => {
    return new Set(
      [...draftState.bluePicks.map((p) => p.champion), ...draftState.redPicks.map((p) => p.champion)].filter(Boolean),
    )
  }, [draftState.bluePicks, draftState.redPicks])

  // Updated availableChampions to include patch and league filters
  const availableChampions = useMemo(() => {
    const unavailableChampions = new Set([...bannedChampions, ...pickedChampions])
    if (!Array.isArray(allChampions)) {
      console.error("allChampions prop is not a valid array:", allChampions)
      return []
    }

    return allChampions.filter((c) => {
      if (!c?.name || unavailableChampions.has(c.name)) return false
      // Apply patch filter if selected and champion has patch data
      if (filterPatch !== "all" && c.patch && c.patch !== filterPatch) return false
      // Apply league filter if selected and champion has league data
      if (filterLeague !== "all" && c.league && c.league !== filterLeague) return false
      return true
    })
  }, [allChampions, bannedChampions, pickedChampions, filterPatch, filterLeague])

  const filteredChampions = useMemo(() => {
    // For the 'All Champions' tab - uses already filtered availableChampions
    return (
      availableChampions
        .filter((champion) => {
          if (!champion?.name) return false
          const nameLower = champion.name.toLowerCase()
          const searchLower = searchQuery.toLowerCase()
          const matchesSearch = nameLower.includes(searchLower)
          const matchesPosition = filterPosition === "all" || champion.mainPosition === filterPosition
          return matchesSearch && matchesPosition
        })
        // Sort alphabetically by champion name
        .sort((a, b) => a.name.localeCompare(b.name))
    )
  }, [availableChampions, searchQuery, filterPosition])

  // --- Recommendation Logic ---
  const recommendedChampions = useMemo(() => {
    if (!currentDraftPosition) return []

    const isBlueTeam = currentDraftPosition.team === "blue"
    const teamPicks = isBlueTeam ? draftState.bluePicks : draftState.redPicks
    const enemyPicks = isBlueTeam ? draftState.redPicks : draftState.bluePicks

    const teamPickedChampions = teamPicks.filter((p) => p.champion).map((p) => p.champion)
    const enemyPickedChampions = enemyPicks.filter((p) => p.champion).map((p) => p.champion)

    // Use the *assigned positions* from draftState
    const teamPickedPositions = new Set(teamPicks.filter((p) => p.champion && p.position).map((p) => p.position))
    const enemyPickedPositions = new Set(enemyPicks.filter((p) => p.champion && p.position).map((p) => p.position))

    // Recommendations now use champions already filtered by Patch/League
    const filteredForRecs = availableChampions

    // --- Ban Phase Recommendations ---
    if (currentDraftPosition.phase === "ban") {
      if (enemyPickedChampions.length === 0) {
        return [...filteredForRecs]
          .sort((a, b) => (b?.pickRate ?? 0) * (b?.winRate ?? 0) - (a?.pickRate ?? 0) * (a?.winRate ?? 0))
          .slice(0, 5)
          .map((champion) => ({
            ...champion,
            recommendReason: "High impact / frequently banned",
            score: (champion?.pickRate ?? 0) * (champion?.winRate ?? 0),
            synergy: null,
            counter: null,
            draftPos: null,
            isPremiumPick: false,
          }))
      }

      const banCandidates = filteredForRecs
        .map((champion) => {
          let enemySynergySum = 0
          let enemySynergyCount = 0
          let enemyPickRateSum = 0
          enemyPickedChampions.forEach((enemyChamp) => {
            const pairData =
              allSynergyData?.[champion.name]?.[enemyChamp] || allSynergyData?.[enemyChamp]?.[champion.name]
            if (pairData?.winRate && pairData?.pickRate) {
              enemySynergySum += pairData.winRate
              enemyPickRateSum += pairData.pickRate
              enemySynergyCount++
            }
          })
          const avgEnemySynergyWR = enemySynergyCount > 0 ? enemySynergySum / enemySynergyCount : 0
          const avgEnemySynergyPR = enemySynergyCount > 0 ? enemyPickRateSum / enemySynergyCount : 0
          const enemySynergyScore = avgEnemySynergyWR * avgEnemySynergyPR
          const overallImpactScore = (champion.winRate ?? 0) * (champion.pickRate ?? 0)
          const finalBanScore =
            (enemySynergyScore > 1 ? enemySynergyScore : 1) * (overallImpactScore > 1 ? overallImpactScore : 1)

          let reason = "Generally strong"
          if (enemySynergyScore > MIN_ALLY_SYNERGY_WIN_RATE * MIN_ALLY_SYNERGY_PICK_RATE) {
            const enemyNames =
              enemyPickedChampions.slice(0, 2).join(" & ") + (enemyPickedChampions.length > 2 ? "..." : "")
            reason = `High synergy with enemy (${enemyNames})`
          } else if (overallImpactScore > 50 * 5) {
            // Example high impact threshold
            reason = "High general impact"
          }

          // Add filter context to ban reason
          let filterInfo = ""
          if (filterPatch !== "all" || filterLeague !== "all") {
            filterInfo = ` (Patch: ${filterPatch !== "all" ? filterPatch : "Any"}, League: ${filterLeague !== "all" ? filterLeague : "Any"})`
          }

          return {
            ...champion,
            recommendReason: reason + filterInfo,
            score: finalBanScore,
            synergy: null,
            counter: null,
            draftPos: null,
            isPremiumPick: false,
          }
        })
        // Filter ban candidates based on *enemy assigned positions*
        .filter((c) => !c.mainPosition || !enemyPickedPositions.has(c.mainPosition))
        .sort((a, b) => b.score - a.score)

      return banCandidates.slice(0, 5)
    }

    // --- Pick Phase Recommendations ---
    const availablePositions = STANDARD_POSITIONS.filter((pos) => !teamPickedPositions.has(pos))
    const pickOrderLabel = currentDraftPosition
      ? DRAFT_POSITIONS.find((p) => p.order === currentDraftPosition.order)?.label
      : ""
    const currentPickLabel = pickOrderLabel ? (pickOrderLabel.split(" ")[1] ?? "") : "" // B1, R2 etc.

    const candidateChampions = [...filteredForRecs].filter(
      (champion) =>
        champion.mainPosition &&
        (filterPosition === "all" || // Or if filter is set to a specific role, prioritize that
          champion.mainPosition === filterPosition ||
          availablePositions.includes(champion.mainPosition)), // Check if champ's default role fits an open slot
    )

    // Helper to generate filter context string
    const getFilterContextString = () => {
      if (filterPatch === "all" && filterLeague === "all") return ""
      let context = " (Based on "
      if (filterPatch !== "all") context += `Patch ${filterPatch}`
      if (filterPatch !== "all" && filterLeague !== "all") context += ", "
      if (filterLeague !== "all") context += `${filterLeague} League`
      context += ")"
      return context
    }
    const filterContext = getFilterContextString()

    if (teamPickedChampions.length === 0) {
      // Early pick logic
      return candidateChampions
        .map((champion) => {
          // Counter logic
          let counterScore = 0
          let avgWinRateVs = 0
          const counterDetails: { champion: string; winRateVs: number; pickRateVs: number }[] = []
          if (enemyPickedChampions.length > 0) {
            let vsWinRateSum = 0
            let vsCount = 0
            enemyPickedChampions.forEach((enemyChamp) => {
              const matchup = matchupData?.[champion.name]?.[enemyChamp]
              if (matchup?.winRateVs && matchup?.pickRateVs) {
                vsWinRateSum += matchup.winRateVs
                counterDetails.push({
                  champion: enemyChamp,
                  winRateVs: matchup.winRateVs,
                  pickRateVs: matchup.pickRateVs,
                })
                vsCount++
              }
            })
            avgWinRateVs = vsCount > 0 ? vsWinRateSum / vsCount : 0
            counterScore = avgWinRateVs
          }
          const overallImpactScore = (champion.winRate ?? 0) * (champion.pickRate ?? 0)
          const finalScore = overallImpactScore + (counterScore > MIN_COUNTER_WIN_RATE ? counterScore : 0)
          let reason = "Strong early pick"
          if (counterScore > MIN_COUNTER_WIN_RATE + 2) reason += ` (Good vs enemy)`

          // Suggest a role based on availability
          const suggestedRole = availablePositions.includes(champion.mainPosition ?? "")
            ? champion.mainPosition
            : availablePositions[0] || champion.mainPosition || ""

          return {
            ...champion,
            recommendReason: reason + filterContext, // Add filter context
            score: finalScore,
            synergy: null,
            counter: { score: counterScore, avgWinRateVs: avgWinRateVs, details: counterDetails },
            draftPos: null,
            isPremiumPick: false,
            suggestedPosition: suggestedRole,
          }
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
    }

    // Mid/Late pick logic
    const championsWithScores = candidateChampions
      .map((champion) => {
        // Synergy logic
        const synergyDetails = teamPickedChampions
          .map((allyChamp) => {
            const pairData =
              allSynergyData?.[champion.name]?.[allyChamp] || allSynergyData?.[allyChamp]?.[champion.name]
            return {
              champion: allyChamp,
              synergyScore: pairData?.winRate ?? 0,
              pickRateTogether: pairData?.pickRate ?? 0,
            }
          })
          .filter((d) => d.synergyScore > 0 && d.pickRateTogether > 0)
        const validSynergyCount = synergyDetails.length
        const avgPickRateTogether =
          validSynergyCount > 0 ? synergyDetails.reduce((sum, d) => sum + d.pickRateTogether, 0) / validSynergyCount : 0
        const avgAllyWR =
          validSynergyCount > 0 ? synergyDetails.reduce((sum, d) => sum + d.synergyScore, 0) / validSynergyCount : 0
        const combinedAllyScore = avgAllyWR * avgPickRateTogether

        // Counter logic
        let counterScore = 0
        let avgWinRateVs = 0
        const counterDetails: { champion: string; winRateVs: number; pickRateVs: number }[] = []
        if (enemyPickedChampions.length > 0) {
          let vsWinRateSum = 0
          let vsCount = 0
          enemyPickedChampions.forEach((enemyChamp) => {
            const matchup = matchupData?.[champion.name]?.[enemyChamp]
            if (matchup?.winRateVs && matchup?.pickRateVs) {
              vsWinRateSum += matchup.winRateVs
              counterDetails.push({
                champion: enemyChamp,
                winRateVs: matchup.winRateVs,
                pickRateVs: matchup.pickRateVs,
              })
              vsCount++
            }
          })
          avgWinRateVs = vsCount > 0 ? vsWinRateSum / vsCount : 0
          counterScore = avgWinRateVs
        }

        // Draft position logic
        const picksInSlot = draftPositionPickData?.championPickCounts?.[champion.name]?.[currentPickLabel] ?? 0
        const totalPicksOverallInSlot = draftPositionPickData?.totalPicksPerSlot?.[currentPickLabel] ?? 0
        const pickRateInSlot = totalPicksOverallInSlot > 0 ? (picksInSlot / totalPicksOverallInSlot) * 100 : 0
        let draftPosContext = ""
        if (totalPicksOverallInSlot > 10) {
          // Only show if enough data
          if (pickRateInSlot < DRAFT_SLOT_PICK_RATE_LOW_THRESHOLD && pickRateInSlot > 0)
            draftPosContext = `(Rare in ${currentPickLabel})`
          else if (pickRateInSlot > DRAFT_SLOT_PICK_RATE_HIGH_THRESHOLD)
            draftPosContext = `(Common in ${currentPickLabel})`
        }

        // Reason generation
        const reasonParts: string[] = []
        if (combinedAllyScore > MIN_ALLY_SYNERGY_WIN_RATE * MIN_ALLY_SYNERGY_PICK_RATE && synergyDetails.length > 0) {
          const bestAlly = [...synergyDetails].sort(
            (a, b) => b.synergyScore * b.pickRateTogether - a.synergyScore * a.pickRateTogether,
          )[0]
          if (bestAlly) reasonParts.push(`Synergy w/ ${bestAlly.champion}`)
        }
        if (counterScore > MIN_COUNTER_WIN_RATE && counterDetails.length > 0) {
          const bestCounter = [...counterDetails].sort((a, b) => b.winRateVs - a.winRateVs)[0]
          if (bestCounter) reasonParts.push(`Counters ${bestCounter.champion}`)
          else reasonParts.push("Good vs enemy")
        }

        const championDefaultRole = champion.mainPosition ?? ""
        let suggestedRole = championDefaultRole
        if (!availablePositions.includes(championDefaultRole) && availablePositions.length > 0) {
          suggestedRole = availablePositions[0]
          if (reasonParts.length === 0) {
            reasonParts.push(`Fits ${suggestedRole.toUpperCase()} role`)
          } else {
            reasonParts.push(`(Fits ${suggestedRole.toUpperCase()})`)
          }
        } else if (reasonParts.length === 0) {
          reasonParts.push("Solid role fit")
        }

        if (draftPosContext) reasonParts.push(draftPosContext)
        const recommendReason = reasonParts.join(" | ")

        // Final scoring and premium pick
        const counterBonus = counterScore > MIN_COUNTER_WIN_RATE ? counterScore / 50 : 1.0
        const finalScore = (combinedAllyScore > 0 ? combinedAllyScore : 1) * counterBonus
        const isPremiumPick =
          avgAllyWR >= MIN_ALLY_SYNERGY_WIN_RATE &&
          avgPickRateTogether >= MIN_ALLY_SYNERGY_PICK_RATE &&
          counterScore >= PREMIUM_PICK_COUNTER_SCORE_THRESHOLD &&
          pickRateInSlot >= PREMIUM_PICK_SLOT_RATE_THRESHOLD

        return {
          ...champion,
          synergy: { score: avgAllyWR, avgPickRateTogether, combinedScore: combinedAllyScore, details: synergyDetails },
          counter: { score: counterScore, avgWinRateVs, details: counterDetails },
          draftPos: { pickRateInSlot, context: draftPosContext },
          recommendReason: recommendReason + filterContext, // Add filter context
          finalScore,
          isPremiumPick,
          suggestedPosition: suggestedRole,
        }
      })
      .sort((a, b) => b.finalScore - a.finalScore)

    // Fallback logic
    let finalRecommendations = championsWithScores.slice(0, 10)
    if (finalRecommendations.length < 5) {
      const numNeeded = 5 - finalRecommendations.length
      const currentRecNames = new Set(finalRecommendations.map((c) => c.name))
      const fallbackPicks = availableChampions
        .filter((c) => !currentRecNames.has(c.name) && c.mainPosition)
        .map((champion) => {
          let bestFitRole = ""
          if (availablePositions.includes(champion.mainPosition ?? "")) {
            bestFitRole = champion.mainPosition ?? ""
          } else if (availablePositions.length > 0) {
            bestFitRole = availablePositions[0]
          }

          return {
            ...champion,
            synergy: null,
            counter: null,
            draftPos: null,
            recommendReason: `General pick ${bestFitRole ? `(Fits ${bestFitRole.toUpperCase()})` : ""}` + filterContext, // Add filter context
            finalScore: (champion.winRate ?? 0) * (champion.pickRate ?? 0),
            isPremiumPick: false,
            suggestedPosition: bestFitRole,
          }
        })
        .filter((c) => c.suggestedPosition)
        .sort((a, b) => b.finalScore - a.finalScore)
        .slice(0, numNeeded)
      finalRecommendations = [...finalRecommendations, ...fallbackPicks]
    }

    // Ensure final list has assigned roles if needed
    return finalRecommendations
      .map((rec) => ({
        ...rec,
        mainPosition: rec.suggestedPosition || rec.mainPosition || STANDARD_POSITIONS[0], // Ultimate fallback
      }))
      .slice(0, 5)
  }, [
    currentDraftPosition,
    availableChampions, // This now correctly depends on filterPatch/filterLeague
    draftState.bluePicks,
    draftState.redPicks,
    draftState.blueBans,
    draftState.redBans,
    filterPosition,
    filterPatch, // Add filterPatch dependency
    filterLeague, // Add filterLeague dependency
    allSynergyData,
    matchupData,
    draftPositionPickData,
  ])
  // --- END Recommendation Logic ---

  // --- EVENT HANDLERS ---
  const handleChampionSelect = (champion: ChampionData | any) => {
    // Use 'any' for recommended champ type
    if (!currentDraftPosition || !champion || !champion.name) return
    const champName = champion.name
    if (bannedChampions.has(champName) || pickedChampions.has(champName)) {
      console.warn(`Attempted to select unavailable champion: ${champName}`)
      return
    }

    setDraftState((prevDraftState) => {
      const newDraftState = structuredClone(prevDraftState)
      const { team, phase } = currentDraftPosition
      let actionTaken = false

      if (phase === "ban") {
        const teamBanIndex = currentDraftPosition.teamBanIndex
        if (teamBanIndex !== undefined && teamBanIndex >= 0 && teamBanIndex < 5) {
          const targetArray = team === "blue" ? newDraftState.blueBans : newDraftState.redBans
          if (!targetArray[teamBanIndex]) {
            targetArray[teamBanIndex] = champName
            actionTaken = true
          }
        } else {
          console.error(`Invalid teamBanIndex for order ${currentDraftPosition.order}`)
        }
      } else {
        // phase === "pick"
        const teamPickIndex = currentDraftPosition.teamPickIndex
        if (teamPickIndex !== undefined && teamPickIndex >= 0 && teamPickIndex < 5) {
          const targetArray = team === "blue" ? newDraftState.bluePicks : newDraftState.redPicks
          if (!targetArray[teamPickIndex].champion) {
            // Use suggestedPosition from recommendations if available, else default mainPosition
            const position = champion.suggestedPosition || champion.mainPosition || "" // Use suggested position first
            targetArray[teamPickIndex] = { champion: champName, position: position }
            actionTaken = true
          }
        } else {
          console.error(`Invalid teamPickIndex for order ${currentDraftPosition.order}`)
        }
      }

      if (actionTaken) {
        newDraftState.currentStep = prevDraftState.currentStep + 1
      } else {
        console.warn("Champion selection failed or slot already filled, step not incremented.")
      }
      return newDraftState
    })
    setSearchQuery("") // Clear search after selection
  }

  const handlePositionChange = (team: "blue" | "red", index: number, position: string) => {
    setDraftState((prevDraftState) => {
      const newDraftState = structuredClone(prevDraftState)
      const targetArray = team === "blue" ? newDraftState.bluePicks : newDraftState.redPicks
      const otherPicks = team === "blue" ? newDraftState.bluePicks : newDraftState.redPicks

      if (index >= 0 && index < targetArray.length && targetArray[index].champion) {
        // Validate position
        if (!STANDARD_POSITIONS.includes(position)) {
          console.warn(`Invalid position selected: ${position}`)
          return prevDraftState // Don't update for invalid position
        }

        // Check if the position is already taken by another teammate (excluding self)
        const isPositionTaken = otherPicks.some((pick, i) => i !== index && pick.position === position && pick.champion)

        if (isPositionTaken) {
          console.warn(`Position ${position} is already taken on ${team} team.`)
          // Optional: Add user feedback here (e.g., toast notification)
          return prevDraftState // Revert if position is taken
        }

        // Only update if the position is actually changing and valid/available
        if (targetArray[index].position !== position) {
          targetArray[index].position = position
          console.log(`Changed ${targetArray[index].champion} position to ${position} for ${team} team index ${index}`)
          return newDraftState // Return the modified state
        }
      }
      // If no change was made (e.g., same position selected, invalid index, no champion)
      return prevDraftState
    })
    // No need for the searchQuery workaround, useMemo dependencies should handle updates.
  }

  const resetDraft = () => {
    setDraftState({
      currentStep: 1,
      blueBans: Array(5).fill(""),
      redBans: Array(5).fill(""),
      bluePicks: Array(5).fill({ champion: "", position: "" }),
      redPicks: Array(5).fill({ champion: "", position: "" }),
    })
    setSearchQuery("")
    setFilterPosition("all")
    setFilterPatch("all") // Reset patch filter
    setFilterLeague("all") // Reset league filter
  }
  // --- END EVENT HANDLERS ---

  // --- DERIVED VALUES FOR RENDER ---
  const isDraftComplete = draftState.currentStep > DRAFT_POSITIONS.length
  const getDraftPhaseDescription = () => {
    if (isDraftComplete) return "Draft Complete"
    if (!currentDraftPosition) return "Draft Phase"
    const { team, phase, label } = currentDraftPosition
    const teamName = team.charAt(0).toUpperCase() + team.slice(1)
    const phaseText = phase.charAt(0).toUpperCase() + phase.slice(1)
    return `${teamName} Team ${phaseText} (${label})`
  }
  // --- END DERIVED VALUES ---

  // --- RENDER ---
  return (
    <Card className="w-full bg-gradient-to-b from-gray-900 to-slate-950 text-white border-gray-700/50 shadow-xl">
      <CardHeader className="border-b border-gray-700/50 pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
            Draft Simulator
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600 hover:text-white"
            onClick={resetDraft}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reset Draft
          </Button>
        </div>
        <CardDescription className="text-gray-400 mt-1">Plan your picks and bans like the pros.</CardDescription>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        {/* Main Layout Container: Using flex for better control over side column widths */}
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* === Blue Team Column (Left) === */}
          <div className="lg:w-[240px] xl:w-[280px] shrink-0 bg-blue-900/10 border border-blue-700/30 rounded-lg p-3 space-y-3 order-1">
            <h3 className="text-lg font-semibold text-blue-400 text-center border-b border-blue-700/30 pb-2">
              Blue Side
            </h3>
            {/* Blue Bans */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Ban className="h-3 w-3" /> Bans
              </h4>
              <div className="flex justify-center gap-2 flex-wrap bg-black/20 p-2 rounded">
                {draftState.blueBans.map((ban, index) => {
                  const isCurrentBan =
                    currentDraftPosition?.phase === "ban" &&
                    currentDraftPosition.team === "blue" &&
                    currentDraftPosition.teamBanIndex === index
                  return (
                    <div
                      key={`blue-ban-${index}`}
                      className={cn(
                        `w-10 h-10 rounded-sm flex items-center justify-center shrink-0 relative overflow-hidden border`,
                        ban ? "bg-gray-800 border-gray-600" : "bg-gray-800/50 border-dashed border-gray-700",
                        isCurrentBan && "border-2 border-yellow-400 ring-2 ring-yellow-400/50 shadow-lg",
                      )}
                    >
                      {ban ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group">
                                <ChampionImage championName={ban} size={40} />
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-100">
                                  <X className="h-5 w-5 text-red-500" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border-gray-700">
                              <p>{ban} (Banned)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[10px] text-gray-500">B{index + 1}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Blue Picks */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center pt-1">Picks</h4>
              {Array.from({ length: 5 }).map((_, index) => {
                const pick = draftState.bluePicks[index]
                const isActivePick =
                  currentDraftPosition?.phase === "pick" &&
                  currentDraftPosition.team === "blue" &&
                  currentDraftPosition.teamPickIndex === index

                return (
                  <div
                    key={`blue-pick-${index}`}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-md transition-colors duration-200 h-[60px]", // Consistent height
                      pick.champion ? "bg-gradient-to-r from-blue-900/40 to-transparent" : "bg-black/20",
                      isActivePick
                        ? "bg-blue-600/30 border border-blue-400 shadow-inner shadow-blue-500/30"
                        : "border border-transparent",
                    )}
                  >
                    {/* Champion Image */}
                    <div
                      className={cn(
                        "w-11 h-11 rounded-sm flex items-center justify-center shrink-0 relative overflow-hidden border",
                        pick.champion ? "bg-gray-800 border-gray-600" : "bg-gray-800/50 border-dashed border-gray-700",
                      )}
                    >
                      {pick.champion ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group">
                                <ChampionImage championName={pick.champion} size={44} />
                                {/* Show Role Badge on Pick Image */}
                                {pick.position && (
                                  <Badge
                                    variant="outline"
                                    className="absolute -bottom-1 -right-1 bg-black/75 border-gray-600/80 text-white text-[9px] px-1 py-0 pointer-events-none leading-tight"
                                  >
                                    {pick.position.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border-gray-700">
                              <p>{pick.champion}</p>
                              {pick.position && <p className="text-xs text-gray-400">{pick.position.toUpperCase()}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[10px] text-gray-500">B{index + 1}</span>
                      )}
                    </div>
                    {/* Champion Name & Role Select */}
                    <div className="flex-grow min-w-0 space-y-0.5">
                      {pick.champion ? (
                        <>
                          <p className="text-[13px] font-medium truncate text-white leading-tight">{pick.champion}</p>
                          {/* --- Role Select --- */}
                          <Select
                            value={pick.position || ""}
                            onValueChange={(value) => handlePositionChange("blue", index, value)}
                            disabled={!pick.champion}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-6 text-[10px] w-[80px] rounded-sm focus:ring-1 focus:ring-blue-400 focus:ring-offset-0 flex items-center gap-1 pl-1.5 pr-1", // Added padding/gap
                                pick.champion
                                  ? "bg-gray-800/80 border-gray-700/80"
                                  : "bg-gray-700/50 border-gray-600/50 text-gray-500",
                              )}
                            >
                              {/* Role Change Icon */}
                              <ArrowUpDown className="h-3 w-3 text-gray-400 shrink-0" />
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700 text-white min-w-[80px]">
                              {STANDARD_POSITIONS.map((pos) => (
                                <SelectItem key={`blue-pos-${index}-${pos}`} value={pos} className="text-xs">
                                  {pos.toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {/* --- End Role Select --- */}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500 italic h-10 flex items-center">Selecting...</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* === Center Column (Selection Area) === */}
          <div className="flex-grow space-y-4 md:space-y-6 min-w-0 order-2 lg:order-2">
            {/* Current Phase Info */}
            {!isDraftComplete && (
              <div className="p-3 bg-gray-800/60 rounded-lg border border-gray-700/50 text-center sticky top-0 z-10 backdrop-blur-sm">
                <h3 className="text-base font-semibold text-yellow-300">{getDraftPhaseDescription()}</h3>
              </div>
            )}
            {/* Champion Selection Area */}
            {!isDraftComplete && currentDraftPosition && (
              <div className="space-y-4">
                {/* Search and Filter */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-1">
                  <h3 className="text-lg font-semibold hidden sm:block text-gray-300">Available Champions</h3>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
                    {/* Search Input */}
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500 pointer-events-none" />
                      <Input
                        type="search"
                        placeholder="Search..."
                        className="pl-8 bg-gray-900/70 border-gray-700 text-white w-full focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 h-9"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {/* Position Filter */}
                    <Select value={filterPosition} onValueChange={setFilterPosition}>
                      <SelectTrigger className="w-[110px] bg-gray-900/70 border-gray-700 text-white shrink-0 focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 h-9">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white">
                        <SelectItem value="all">All Roles</SelectItem>
                        {STANDARD_POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos}>
                            {pos.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Patch Filter */}
                    {patches && patches.length > 0 && (
                      <Select value={filterPatch} onValueChange={setFilterPatch}>
                        <SelectTrigger className="w-[100px] bg-gray-900/70 border-gray-700 text-white shrink-0 focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 h-9">
                          <SelectValue placeholder="Patch" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-[200px] overflow-y-auto">
                          <SelectItem value="all">All Patches</SelectItem>
                          {patches.map((patch) => (
                            <SelectItem key={patch} value={patch}>
                              {patch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {/* League Filter */}
                    {leagues && leagues.length > 0 && (
                      <Select value={filterLeague} onValueChange={setFilterLeague}>
                        <SelectTrigger className="w-[100px] bg-gray-900/70 border-gray-700 text-white shrink-0 focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 h-9">
                          <SelectValue placeholder="League" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-[200px] overflow-y-auto">
                          <SelectItem value="all">All Leagues</SelectItem>
                          {leagues.map((league) => (
                            <SelectItem key={league} value={league}>
                              {league}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                {/* Tabs for All / Recommended */}
                <Tabs defaultValue="recommended" className="w-full">
                  <TabsList className="bg-gray-800/80 border border-gray-700/50 inline-flex h-9 items-center justify-center rounded-lg p-1 text-muted-foreground">
                    <TabsTrigger
                      value="all"
                      className="px-3 py-1 text-sm data-[state=active]:bg-gray-700/80 data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md"
                    >
                      All
                    </TabsTrigger>
                    <TabsTrigger
                      value="recommended"
                      className="px-3 py-1 text-sm data-[state=active]:bg-yellow-600/80 data-[state=active]:text-black data-[state=active]:shadow-md rounded-md flex items-center gap-1"
                    >
                      <Star className="h-4 w-4" /> Recommended
                    </TabsTrigger>
                  </TabsList>

                  {/* All Champions Tab */}
                  <TabsContent value="all" className="mt-4">
                    <div className="grid grid-cols-6 sm:grid-cols-7 md:grid-cols-8 lg:grid-cols-9 xl:grid-cols-10 gap-2">
                      {filteredChampions.map((champion) => {
                        if (!champion) return null
                        const isUnavailable = bannedChampions.has(champion.name) || pickedChampions.has(champion.name)
                        return (
                          <TooltipProvider
                            key={`${champion.name}-all-${champion.patch}-${champion.league}`}
                            delayDuration={150}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  tabIndex={isUnavailable ? -1 : 0}
                                  role="button"
                                  aria-label={`Select ${champion.name}`}
                                  aria-disabled={isUnavailable}
                                  className={cn(
                                    "relative rounded overflow-hidden transition-all aspect-square group border-2",
                                    isUnavailable
                                      ? "opacity-30 cursor-not-allowed grayscale border-transparent"
                                      : "cursor-pointer border-gray-700/50 hover:border-red-500/80 focus:border-red-500/80 focus:outline-none hover:scale-105 focus:scale-105",
                                  )}
                                  onClick={() => {
                                    if (!isUnavailable) handleChampionSelect(champion)
                                  }}
                                  onKeyDown={(e) => {
                                    if (!isUnavailable && (e.key === "Enter" || e.key === " ")) {
                                      e.preventDefault()
                                      handleChampionSelect(champion)
                                    }
                                  }}
                                >
                                  <ChampionImage
                                    championName={champion.name}
                                    size={64}
                                    className="w-full h-full object-contain"
                                  />
                                  {isUnavailable && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                                      <X className="h-5 w-5 text-red-500" />
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-1 pt-2 pb-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <p className="text-white text-[10px] font-semibold truncate text-center leading-tight">
                                      {champion.name}
                                    </p>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-black text-white border-gray-700">
                                <p className="font-semibold">{champion.name}</p>
                                {champion.mainPosition && (
                                  <p className="text-xs text-gray-400">{champion.mainPosition.toUpperCase()}</p>
                                )}
                                {champion.patch && filterPatch === "all" && (
                                  <p className="text-xs text-gray-400">Patch: {champion.patch}</p>
                                )}
                                {champion.league && filterLeague === "all" && (
                                  <p className="text-xs text-gray-400">League: {champion.league}</p>
                                )}
                                {isUnavailable && <p className="text-xs text-red-400 mt-1">(Unavailable)</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                      {filteredChampions.length === 0 && (
                        <p className="text-gray-400 col-span-full text-center py-6">No champions match filters.</p>
                      )}
                    </div>
                  </TabsContent>

                  {/* Recommended Champions Tab */}
                  <TabsContent value="recommended" className="mt-4">
                    {/* Render recommendedChampions */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {recommendedChampions.map((champion) => {
                        if (!champion) return null
                        const isUnavailable = bannedChampions.has(champion.name) || pickedChampions.has(champion.name)
                        const hasAllySynergy = champion.synergy?.details?.length > 0
                        const isGoodCounter = champion.counter?.score > MIN_COUNTER_WIN_RATE
                        const isRarePick =
                          champion.draftPos?.pickRateInSlot < DRAFT_SLOT_PICK_RATE_LOW_THRESHOLD &&
                          champion.draftPos?.pickRateInSlot > 0

                        return (
                          <TooltipProvider
                            key={`${champion.name}-rec-${champion.patch}-${champion.league}`}
                            delayDuration={200}
                          >
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div
                                  tabIndex={isUnavailable ? -1 : 0}
                                  role="button"
                                  aria-label={`Select recommended ${champion.name}`}
                                  aria-disabled={isUnavailable}
                                  className={cn(
                                    "bg-gray-800/70 rounded-lg overflow-hidden border-2 flex flex-col group relative shadow-md",
                                    isUnavailable
                                      ? "opacity-40 cursor-not-allowed grayscale border-transparent"
                                      : "cursor-pointer transition-all duration-200 ease-out",
                                    champion.isPremiumPick && !isUnavailable
                                      ? "border-yellow-400/80 shadow-lg shadow-yellow-500/20 hover:border-yellow-300"
                                      : "border-gray-700/50 hover:border-red-500/70",
                                    !champion.isPremiumPick && !isUnavailable
                                      ? "hover:bg-gray-700/80 focus:outline-none focus:border-red-500/70 focus:bg-gray-700/80 transform hover:-translate-y-1 focus:-translate-y-1"
                                      : "",
                                  )}
                                  onClick={() => {
                                    if (!isUnavailable) handleChampionSelect(champion)
                                  }}
                                  onKeyDown={(e) => {
                                    if (!isUnavailable && (e.key === "Enter" || e.key === " ")) {
                                      e.preventDefault()
                                      handleChampionSelect(champion)
                                    }
                                  }}
                                >
                                  {/* Premium Pick Badge */}
                                  {champion.isPremiumPick && !isUnavailable && (
                                    <Badge
                                      variant="secondary"
                                      className="absolute -top-2 -right-2 z-10 bg-yellow-500 text-black text-[10px] px-1 py-0.5 pointer-events-none transform rotate-12 shadow-md font-semibold"
                                    >
                                      <Star className="h-3 w-3 mr-0.5 text-yellow-900" /> PRIME
                                    </Badge>
                                  )}
                                  {/* Champion Images & Badges */}
                                  <div className="relative aspect-video w-full flex items-center justify-center bg-gradient-to-b from-gray-700/50 to-gray-900/50 overflow-hidden">
                                    <ChampionImage
                                      championName={champion.name}
                                      type="splash"
                                      className="absolute inset-0 w-full h-full object-cover opacity-30 group-hover:opacity-40 transition-opacity"
                                    />
                                    <ChampionImage
                                      championName={champion.name}
                                      size={72}
                                      className="z-10 drop-shadow-lg"
                                    />
                                    {isUnavailable && (
                                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none z-20">
                                        <X className="h-6 w-6 text-red-500" />
                                      </div>
                                    )}
                                    {/* Display Suggested/Main Position */}
                                    {(champion.suggestedPosition || champion.mainPosition) && (
                                      <Badge
                                        variant="outline"
                                        className="absolute bottom-1 right-1 bg-black/70 border-gray-600 text-white text-[10px] px-1 py-0 pointer-events-none z-10"
                                      >
                                        {(champion.suggestedPosition || champion.mainPosition)?.toUpperCase()}
                                      </Badge>
                                    )}
                                    {/* Synergy/Counter/Rare Badges */}
                                    <div className="absolute top-1 left-1 flex flex-col gap-1 z-10">
                                      {hasAllySynergy && champion.synergy?.score >= MIN_ALLY_SYNERGY_WIN_RATE + 1 && (
                                        <Badge
                                          variant="secondary"
                                          className="border-green-600/80 text-green-300 bg-green-900/50 text-[10px] px-1 py-0 pointer-events-none flex items-center gap-1 shadow-sm"
                                        >
                                          <TrendingUp className="h-3 w-3" /> Synergy
                                        </Badge>
                                      )}
                                      {isGoodCounter && (
                                        <Badge
                                          variant="secondary"
                                          className="border-red-600/80 text-red-300 bg-red-900/50 text-[10px] px-1 py-0 pointer-events-none flex items-center gap-1 shadow-sm"
                                        >
                                          <Swords className="h-3 w-3" /> Counter
                                        </Badge>
                                      )}
                                      {isRarePick && (
                                        <Badge
                                          variant="secondary"
                                          className="border-blue-600/80 text-blue-300 bg-blue-900/50 text-[10px] px-1 py-0 pointer-events-none flex items-center gap-1 shadow-sm"
                                        >
                                          Rare Pick
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  {/* Champion Name & Recommendation Reason */}
                                  <div className="p-2 text-center bg-gray-800/50 border-t border-gray-700/50 flex-grow flex flex-col justify-between">
                                    <div>
                                      <p className="text-sm font-semibold truncate mb-1">{champion.name}</p>
                                      <p className="text-[11px] text-gray-400 italic mb-2 h-8 line-clamp-2">
                                        {champion.recommendReason || "No specific reason"}
                                      </p>
                                    </div>
                                    {/* Stat Summary */}
                                    <div className="flex justify-center gap-3 text-xs border-t border-gray-700/30 pt-1 mt-auto">
                                      {hasAllySynergy && champion.synergy?.score && (
                                        <span
                                          className="inline-flex items-center text-green-300"
                                          title={`Avg WR with Team: ${champion.synergy.score.toFixed(1)}%`}
                                        >
                                          <TrendingUp className="h-3 w-3 mr-0.5" /> {champion.synergy.score.toFixed(0)}%
                                        </span>
                                      )}
                                      {isGoodCounter && champion.counter?.avgWinRateVs && (
                                        <span
                                          className="inline-flex items-center text-red-300"
                                          title={`Avg WR vs Enemy: ${champion.counter.avgWinRateVs.toFixed(1)}%`}
                                        >
                                          <Swords className="h-3 w-3 mr-0.5" />
                                          {champion.counter.avgWinRateVs.toFixed(0)}%
                                        </span>
                                      )}
                                      {!hasAllySynergy && !isGoodCounter && typeof champion.winRate === "number" && (
                                        <span
                                          className="inline-flex items-center text-blue-300"
                                          title={`Overall WR: ${champion.winRate.toFixed(1)}%`}
                                        >
                                          WR {champion.winRate.toFixed(0)}%
                                        </span>
                                      )}
                                    </div>
                                    {isUnavailable && <p className="text-xs text-red-400 mt-1">(Unavailable)</p>}
                                  </div>
                                </div>
                              </TooltipTrigger>
                              {/* Detailed Tooltip Content */}
                              <TooltipContent className="bg-black text-white border-gray-700 p-3 max-w-xs text-xs">
                                <div className="space-y-2">
                                  <p className="font-semibold text-base mb-1">{champion.name}</p>
                                  {champion.recommendReason && (
                                    <p className="text-sm text-gray-300 italic mb-2">{champion.recommendReason}</p>
                                  )}
                                  {/* Ally Synergy Details */}
                                  {hasAllySynergy &&
                                    champion.synergy?.details &&
                                    champion.synergy.details.length > 0 && (
                                      <div className="border-t border-gray-600 pt-2">
                                        <p className="text-xs text-green-400 font-semibold mb-1 flex items-center gap-1">
                                          <TrendingUp className="h-3 w-3" /> Ally Synergy:
                                        </p>
                                        <div className="space-y-0.5">
                                          {champion.synergy.details.slice(0, 3).map((detail, idx) => (
                                            <div key={idx} className="flex justify-between gap-2">
                                              <span>w/ {detail.champion}</span>
                                              <div className="text-right">
                                                <span className="text-green-300">
                                                  {detail.synergyScore.toFixed(1)}% WR
                                                </span>
                                                <span className="text-gray-500 mx-1">|</span>
                                                <span className="text-blue-300">
                                                  {detail.pickRateTogether.toFixed(1)}% PR
                                                </span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  {/* Enemy Matchup Details */}
                                  {champion.counter?.details && champion.counter.details.length > 0 && (
                                    <div className="border-t border-gray-600 pt-2">
                                      <p className="text-xs text-red-400 font-semibold mb-1 flex items-center gap-1">
                                        <Swords className="h-3 w-3" /> Matchup vs Enemy:
                                      </p>
                                      <div className="space-y-0.5">
                                        {champion.counter.details.slice(0, 3).map((detail, idx) => (
                                          <div key={idx} className="flex justify-between gap-2">
                                            <span>vs {detail.champion}</span>
                                            <div className="text-right">
                                              <span
                                                className={detail.winRateVs >= 50 ? "text-green-300" : "text-red-300"}
                                              >
                                                {detail.winRateVs.toFixed(1)}% WR
                                              </span>
                                              <span className="text-gray-500 mx-1">|</span>
                                              <span className="text-blue-300">{detail.pickRateVs.toFixed(1)}% PR</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {/* Overall Stats */}
                                  {(typeof champion.winRate === "number" || typeof champion.pickRate === "number") && (
                                    <div className="border-t border-gray-600 pt-2">
                                      <p className="text-xs text-gray-400 font-semibold mb-1">Overall Stats:</p>
                                      {typeof champion.winRate === "number" && (
                                        <div className="flex justify-between gap-2">
                                          <span>Win Rate:</span> <span>{champion.winRate.toFixed(1)}%</span>
                                        </div>
                                      )}
                                      {typeof champion.pickRate === "number" && (
                                        <div className="flex justify-between gap-2">
                                          <span>Pick Rate:</span> <span>{champion.pickRate.toFixed(1)}%</span>
                                        </div>
                                      )}
                                      {typeof champion.banRate === "number" && (
                                        <div className="flex justify-between gap-2">
                                          <span>Ban Rate:</span> <span>{champion.banRate.toFixed(1)}%</span>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  {/* Draft Position Context */}
                                  {champion.draftPos?.context && (
                                    <p className="text-blue-300 text-xs mt-2 italic">
                                      {champion.draftPos.context} ({champion.draftPos.pickRateInSlot?.toFixed(1)}% rate)
                                    </p>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                      {recommendedChampions.length === 0 && (
                        <p className="text-gray-400 col-span-full text-center py-6">
                          No recommendations available for the current state and filters.
                        </p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {/* Draft Complete Message */}
            {isDraftComplete && (
              <div className="text-center py-10">
                <h3 className="text-2xl font-semibold mb-3 text-green-400">Draft Complete!</h3>
                <p className="text-gray-400 mb-6">Review the final teams or start a new draft.</p>
                <Button
                  variant="outline"
                  size="lg"
                  className="bg-green-700 text-white border-green-600 hover:bg-green-600"
                  onClick={resetDraft}
                >
                  <RefreshCw className="h-5 w-5 mr-2" /> New Draft
                </Button>
              </div>
            )}
          </div>

          {/* === Red Team Column (Right) === */}
          <div className="lg:w-[240px] xl:w-[280px] shrink-0 bg-red-900/10 border border-red-700/30 rounded-lg p-3 space-y-3 order-3">
            <h3 className="text-lg font-semibold text-red-400 text-center border-b border-red-700/30 pb-2">Red Side</h3>
            {/* Red Bans */}
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Ban className="h-3 w-3" /> Bans
              </h4>
              <div className="flex justify-center gap-2 flex-wrap bg-black/20 p-2 rounded">
                {draftState.redBans.map((ban, index) => {
                  const isCurrentBan =
                    currentDraftPosition?.phase === "ban" &&
                    currentDraftPosition.team === "red" &&
                    currentDraftPosition.teamBanIndex === index
                  return (
                    <div
                      key={`red-ban-${index}`}
                      className={cn(
                        `w-10 h-10 rounded-sm flex items-center justify-center shrink-0 relative overflow-hidden border`,
                        ban ? "bg-gray-800 border-gray-600" : "bg-gray-800/50 border-dashed border-gray-700",
                        isCurrentBan && "border-2 border-yellow-400 ring-2 ring-yellow-400/50 shadow-lg",
                      )}
                    >
                      {ban ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group">
                                <ChampionImage championName={ban} size={40} />
                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center opacity-100">
                                  <X className="h-5 w-5 text-red-500" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border-gray-700">
                              <p>{ban} (Banned)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[10px] text-gray-500">R{index + 1}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Red Picks */}
            <div className="space-y-1.5">
              <h4 className="text-xs font-medium text-gray-400 uppercase tracking-wider text-center pt-1">Picks</h4>
              {Array.from({ length: 5 }).map((_, index) => {
                const pick = draftState.redPicks[index]
                const isActivePick =
                  currentDraftPosition?.phase === "pick" &&
                  currentDraftPosition.team === "red" &&
                  currentDraftPosition.teamPickIndex === index

                return (
                  <div
                    key={`red-pick-${index}`}
                    className={cn(
                      "flex items-center gap-2 p-1.5 rounded-md transition-colors duration-200 h-[60px]", // Consistent height
                      pick.champion ? "bg-gradient-to-l from-red-900/40 to-transparent" : "bg-black/20",
                      isActivePick
                        ? "bg-red-600/30 border border-red-400 shadow-inner shadow-red-500/30"
                        : "border border-transparent",
                    )}
                  >
                    {/* Info first for Red side */}
                    <div className="flex-grow min-w-0 space-y-0.5 text-right">
                      {pick.champion ? (
                        <>
                          <p className="text-[13px] font-medium truncate text-white leading-tight">{pick.champion}</p>
                          {/* --- Role Select --- */}
                          <div className="flex items-center justify-end gap-1">
                            {" "}
                            {/* Align items to end */}
                            <Select
                              value={pick.position || ""}
                              onValueChange={(value) => handlePositionChange("red", index, value)}
                              disabled={!pick.champion}
                            >
                              <SelectTrigger
                                className={cn(
                                  "h-6 text-[10px] w-[80px] rounded-sm focus:ring-1 focus:ring-red-400 focus:ring-offset-0 flex items-center justify-end gap-1 pr-1.5 pl-1", // Right align trigger content
                                  pick.champion
                                    ? "bg-gray-800/80 border-gray-700/80"
                                    : "bg-gray-700/50 border-gray-600/50 text-gray-500",
                                )}
                              >
                                {/* Icon comes after value for right alignment */}
                                <SelectValue placeholder="Role" className="mr-1" />
                                <ArrowUpDown className="h-3 w-3 text-gray-400 shrink-0" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700 text-white min-w-[80px]">
                                {STANDARD_POSITIONS.map((pos) => (
                                  <SelectItem key={`red-pos-${index}-${pos}`} value={pos} className="text-xs">
                                    {pos.toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          {/* --- End Role Select --- */}
                        </>
                      ) : (
                        <p className="text-xs text-gray-500 italic h-10 flex items-center justify-end">Selecting...</p>
                      )}
                    </div>
                    {/* Image last for Red side */}
                    <div
                      className={cn(
                        "w-11 h-11 rounded-sm flex items-center justify-center shrink-0 relative overflow-hidden border",
                        pick.champion ? "bg-gray-800 border-gray-600" : "bg-gray-800/50 border-dashed border-gray-700",
                      )}
                    >
                      {pick.champion ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group">
                                <ChampionImage championName={pick.champion} size={44} />
                                {/* Show Role Badge on Pick Image */}
                                {pick.position && (
                                  <Badge
                                    variant="outline"
                                    className="absolute -bottom-1 -left-1 bg-black/75 border-gray-600/80 text-white text-[9px] px-1 py-0 pointer-events-none leading-tight"
                                  >
                                    {pick.position.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border-gray-700">
                              <p>{pick.champion}</p>
                              {pick.position && <p className="text-xs text-gray-400">{pick.position.toUpperCase()}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-[10px] text-gray-500">R{index + 1}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>{" "}
        {/* End Main Layout Flex Container */}
      </CardContent>
    </Card>
  )
}
