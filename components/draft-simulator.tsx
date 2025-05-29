"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge" // Still used for simple role badges on picks
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Search, X, RefreshCw, Swords, TrendingUp, Star, Ban, ArrowUpDown } from "lucide-react"
import ChampionImage from "./champion-image" // Ensure this component exists and works as expected
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils" // Ensure this utility exists

// --- TYPE DEFINITIONS (Unchanged) ---
interface ChampionData {
  name: string
  mainPosition?: string
  winRate?: number
  pickRate?: number
  patch?: string
  league?: string
  banRate?: number
  laneCounter?: {
    isLaneCounter: boolean
    laneCounterScore: number
    details: Array<{
      champion: string
      position?: string
      winRateVs: number
    }>
  }
  teamCounter?: {
    isTeamCounter: boolean
    teamCounterScore: number
    details: Array<{
      champion: string
      position?: string
      winRateVs: number
    }>
  }
  roleStats?: {
    [position: string]: {
      pickRate: number
      winRate: number
      gamesPlayed?: number
    }
  }
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
  patches?: string[]
  leagues?: string[]
}
// --- END TYPE DEFINITIONS ---

// --- CONSTANTS (Unchanged) ---
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

const MIN_ALLY_SYNERGY_PICK_RATE = 1.5
const MIN_ALLY_SYNERGY_WIN_RATE = 49.0
const MIN_COUNTER_WIN_RATE = 51.0
const DRAFT_SLOT_PICK_RATE_LOW_THRESHOLD = 1.0
const DRAFT_SLOT_PICK_RATE_HIGH_THRESHOLD = 10.0
const PREMIUM_PICK_ALLY_SCORE_THRESHOLD = 51 * 2.0
const PREMIUM_PICK_COUNTER_SCORE_THRESHOLD = 52.0
const PREMIUM_PICK_SLOT_RATE_THRESHOLD = 3.0
// --- END CONSTANTS ---

export default function DraftSimulator({
  allChampions = [],
  allSynergyData = {},
  matchupData = {},
  draftPositionPickData = { championPickCounts: {}, totalPicksPerSlot: {} },
  patches = [],
  leagues = [],
}: DraftSimulatorProps) {
  // --- STATE HOOKS (Unchanged) ---
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
  const [filterPatch, setFilterPatch] = useState("all")
  const [filterLeague, setFilterLeague] = useState("all")

  // --- MEMOIZED VALUES (Logic Unchanged) ---
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

  const availableChampions = useMemo(() => {
    const unavailableChampions = new Set([...bannedChampions, ...pickedChampions])
    if (!Array.isArray(allChampions)) {
      console.error("allChampions prop is not a valid array:", allChampions)
      return []
    }

    return allChampions.filter((c) => {
      if (!c?.name || unavailableChampions.has(c.name)) return false
      if (filterPatch !== "all" && c.patch && c.patch !== filterPatch) return false
      if (filterLeague !== "all" && c.league && c.league !== filterLeague) return false
      return true
    })
  }, [allChampions, bannedChampions, pickedChampions, filterPatch, filterLeague])

  const filteredChampions = useMemo(() => {
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
        .sort((a, b) => a.name.localeCompare(b.name))
    )
  }, [availableChampions, searchQuery, filterPosition])

  // --- Recommendation Logic (Unchanged) ---
   const recommendedChampions = useMemo(() => {
    if (!currentDraftPosition) return []

    const isBlueTeam = currentDraftPosition.team === "blue"
    const teamPicks = isBlueTeam ? draftState.bluePicks : draftState.redPicks
    const enemyPicks = isBlueTeam ? draftState.redPicks : draftState.bluePicks

    const teamPickedChampions = teamPicks.filter((p) => p.champion).map((p) => p.champion)
    const enemyPickedChampions = enemyPicks.filter((p) => p.champion).map((p) => p.champion)

    const teamPickedPositions = new Set(teamPicks.filter((p) => p.champion && p.position).map((p) => p.position))
    const enemyPickedPositions = new Set(enemyPicks.filter((p) => p.champion && p.position).map((p) => p.position))
    
    const filteredForRecs = availableChampions.filter(champion => 
      !champion.mainPosition || !teamPickedPositions.has(champion.mainPosition)
    )

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
            reason = "High general impact"
          }

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
        .filter((c) => !c.mainPosition || !enemyPickedPositions.has(c.mainPosition))
        .sort((a, b) => b.score - a.score)

      return banCandidates.slice(0, 5)
    }

    const availablePositions = STANDARD_POSITIONS.filter((pos) => !teamPickedPositions.has(pos))
    const pickOrderLabel = currentDraftPosition
      ? DRAFT_POSITIONS.find((p) => p.order === currentDraftPosition.order)?.label
      : ""
    const currentPickLabel = pickOrderLabel ? (pickOrderLabel.split(" ")[1] ?? "") : "" 

    const candidateChampions = [...filteredForRecs].filter(
      (champion) =>
        champion.mainPosition &&
        (filterPosition === "all" || 
          champion.mainPosition === filterPosition ||
          availablePositions.includes(champion.mainPosition)),
    )

    const getFilterContextString = () => {
      if (filterPatch === "all" && filterLeague === "all") return ""
      let context = " (Data from "
      if (filterPatch !== "all") context += `Patch ${filterPatch}`
      if (filterPatch !== "all" && filterLeague !== "all") context += ", "
      if (filterLeague !== "all") context += `${filterLeague} League`
      context += ")"
      return context
    }
    const filterContext = getFilterContextString()

    if (teamPickedChampions.length === 0) {
      return candidateChampions
        .map((champion) => {
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
          
          let suggestedRole = champion.mainPosition ?? ""

          return {
            ...champion,
            recommendReason: reason + filterContext,
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

    const championsWithScores = candidateChampions
      .map((champion) => {
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
        
        const laneCounterDetails: { champion: string; position?: string; winRateVs: number }[] = []
        let laneCounterScoreNum = 0
        let isLaneCounter = false
        const championPosition = champion.mainPosition || "" // Use mainPosition for logic
        
        const enemyLaneOpponents = enemyPicks
          .filter(p => p.champion && p.position === championPosition)
          .map(p => p.champion)
        
        if (enemyLaneOpponents.length > 0) {
          let laneWinRateSum = 0
          let laneMatchupCount = 0
          enemyLaneOpponents.forEach(enemyChamp => {
            const matchup = matchupData?.[champion.name]?.[enemyChamp]
            if (matchup?.winRateVs) {
              if (matchup.winRateVs >= MIN_COUNTER_WIN_RATE + 2) {
                laneWinRateSum += matchup.winRateVs
                laneCounterDetails.push({
                  champion: enemyChamp,
                  position: championPosition,
                  winRateVs: matchup.winRateVs
                })
                laneMatchupCount++
              }
            }
          })
          if (laneMatchupCount > 0) {
            laneCounterScoreNum = laneWinRateSum / laneMatchupCount
            isLaneCounter = laneCounterScoreNum >= MIN_COUNTER_WIN_RATE + 2
          }
        }
        
        const teamCounterDetails: { champion: string; position?: string; winRateVs: number }[] = []
        let teamCounterScoreNum = 0
        let isTeamCounter = false
        const enemyTeamOpponents = enemyPicks
          .filter(p => p.champion && p.position !== championPosition)
          .map(p => ({ champion: p.champion, position: p.position }))
        
        if (enemyTeamOpponents.length > 0) {
          let teamWinRateSum = 0
          let teamMatchupCount = 0
          enemyTeamOpponents.forEach(enemy => {
            const matchup = matchupData?.[champion.name]?.[enemy.champion]
            if (matchup?.winRateVs) {
              if (matchup.winRateVs >= MIN_COUNTER_WIN_RATE + 1) {
                teamWinRateSum += matchup.winRateVs
                teamCounterDetails.push({
                  champion: enemy.champion,
                  position: enemy.position,
                  winRateVs: matchup.winRateVs
                })
                teamMatchupCount++
              }
            }
          })
          if (teamMatchupCount > 0) {
            teamCounterScoreNum = teamWinRateSum / teamMatchupCount
            isTeamCounter = teamCounterScoreNum >= MIN_COUNTER_WIN_RATE + 1
          }
        }

        const picksInSlot = draftPositionPickData?.championPickCounts?.[champion.name]?.[currentPickLabel] ?? 0
        const totalPicksOverallInSlot = draftPositionPickData?.totalPicksPerSlot?.[currentPickLabel] ?? 0
        const pickRateInSlot = totalPicksOverallInSlot > 0 ? (picksInSlot / totalPicksOverallInSlot) * 100 : 0
        let draftPosContext = ""
        if (totalPicksOverallInSlot > 10) {
          if (pickRateInSlot < DRAFT_SLOT_PICK_RATE_LOW_THRESHOLD && pickRateInSlot > 0)
            draftPosContext = `(Rare in ${currentPickLabel})`
          else if (pickRateInSlot > DRAFT_SLOT_PICK_RATE_HIGH_THRESHOLD)
            draftPosContext = `(Common in ${currentPickLabel})`
        }

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
        if (isLaneCounter && laneCounterDetails.length > 0) {
          const bestLaneCounter = [...laneCounterDetails].sort((a, b) => b.winRateVs - a.winRateVs)[0]
          if (bestLaneCounter) reasonParts.push(`Lane counter vs ${bestLaneCounter.champion}`)
        }
        if (isTeamCounter && teamCounterDetails.length > 0) {
          const bestTeamCounter = [...teamCounterDetails].sort((a, b) => b.winRateVs - a.winRateVs)[0]
          if (bestTeamCounter) reasonParts.push(`Team counter vs ${bestTeamCounter.champion}`)
        }
        
        let suggestedRole = champion.mainPosition ?? ""
        if (!availablePositions.includes(suggestedRole) && availablePositions.length > 0) {
            // Try to find an alternative role with good stats if main role is taken
            const champRoleStats = champion.roleStats || {};
            let bestAlternativeRole = "";
            let maxAlternativeScore = 0;

            for (const pos of availablePositions) {
                if (champRoleStats[pos] && champRoleStats[pos].gamesPlayed && champRoleStats[pos].gamesPlayed > 20) { // Min games played for alt role
                    const roleScore = (champRoleStats[pos].winRate || 0) * (champRoleStats[pos].pickRate || 0);
                    if (roleScore > maxAlternativeScore) {
                        maxAlternativeScore = roleScore;
                        bestAlternativeRole = pos;
                    }
                }
            }
            if (bestAlternativeRole) {
                suggestedRole = bestAlternativeRole;
            } else { // If no good alternative, pick first available
                 suggestedRole = availablePositions[0];
            }
        } else if (availablePositions.length === 0 && !teamPickedPositions.has(suggestedRole)) {
            // This case should ideally not happen if logic is correct, means no roles available
            // but current champ's role is also not picked (paradox). Fallback to its main role.
        }


        if (reasonParts.length === 0) {
          reasonParts.push(suggestedRole ? `Solid ${suggestedRole.toUpperCase()} fit` : "Solid pick");
        }


        if (draftPosContext) reasonParts.push(draftPosContext)
        const recommendReason = reasonParts.join(" | ")

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
          laneCounter: { isLaneCounter, laneCounterScore: laneCounterScoreNum, details: laneCounterDetails },
          teamCounter: { isTeamCounter, teamCounterScore: teamCounterScoreNum, details: teamCounterDetails },
          draftPos: { pickRateInSlot, context: draftPosContext },
          recommendReason: recommendReason + filterContext,
          finalScore,
          isPremiumPick,
          suggestedPosition: suggestedRole,
        }
      })
      .sort((a, b) => b.finalScore - a.finalScore)

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
            recommendReason: `General pick ${bestFitRole ? `(Fits ${bestFitRole.toUpperCase()})` : ""}` + filterContext,
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

    return finalRecommendations
      .map((rec) => ({
        ...rec,
        mainPosition: rec.suggestedPosition || rec.mainPosition || STANDARD_POSITIONS[0], 
      }))
      .slice(0, 5)
  }, [
    currentDraftPosition,
    availableChampions, 
    draftState.bluePicks,
    draftState.redPicks,
    draftState.blueBans,
    draftState.redBans,
    filterPosition,
    filterPatch, 
    filterLeague, 
    allSynergyData,
    matchupData,
    draftPositionPickData,
  ])
  // --- END Recommendation Logic ---

  // --- EVENT HANDLERS (Logic Unchanged) ---
  const handleChampionSelect = (champion: ChampionData | any) => {
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
        }
      } else {
        const teamPickIndex = currentDraftPosition.teamPickIndex
        if (teamPickIndex !== undefined && teamPickIndex >= 0 && teamPickIndex < 5) {
          const targetArray = team === "blue" ? newDraftState.bluePicks : newDraftState.redPicks
          if (!targetArray[teamPickIndex].champion) {
            const position = champion.suggestedPosition || champion.mainPosition || ""
            targetArray[teamPickIndex] = { champion: champName, position: position }
            actionTaken = true
          }
        }
      }

      if (actionTaken) {
        newDraftState.currentStep = prevDraftState.currentStep + 1
      }
      return newDraftState
    })
    setSearchQuery("")
  }

  const handlePositionChange = (team: "blue" | "red", index: number, position: string) => {
    setDraftState((prevDraftState) => {
      const newDraftState = structuredClone(prevDraftState)
      const targetArray = team === "blue" ? newDraftState.bluePicks : newDraftState.redPicks
      const otherPicks = team === "blue" ? newDraftState.bluePicks : newDraftState.redPicks

      if (index >= 0 && index < targetArray.length && targetArray[index].champion) {
        if (!STANDARD_POSITIONS.includes(position)) {
          return prevDraftState
        }
        const isPositionTaken = otherPicks.some((pick, i) => i !== index && pick.position === position && pick.champion)
        if (isPositionTaken) {
          return prevDraftState
        }
        if (targetArray[index].position !== position) {
          targetArray[index].position = position
          return newDraftState
        }
      }
      return prevDraftState
    })
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
    setFilterPatch("all")
    setFilterLeague("all")
  }
  // --- END EVENT HANDLERS ---

  // --- DERIVED VALUES FOR RENDER (Logic Unchanged) ---
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
    <Card className="w-full bg-black text-white border border-gray-800 shadow-2xl shadow-red-900/30 rounded-xl">
      <CardHeader className="border-b border-red-700/30 pb-4 pt-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-red-400 text-center">
            Draft Simulator
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            className="bg-red-600 text-white border-red-700 hover:bg-red-700 hover:border-red-500 rounded-md shadow-md hover:shadow-lg transition-all duration-150"
            onClick={resetDraft}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Reset Draft
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 md:p-6">
        <div className="flex flex-col lg:flex-row gap-4 md:gap-6">
          {/* === Blue Team Column (Left) === */}
          <div className="lg:w-[260px] xl:w-[300px] shrink-0 bg-gray-950 border border-blue-700/50 rounded-lg p-3 space-y-3 order-1 shadow-lg">
            <h3 className="text-xl font-bold text-white text-center bg-blue-600 py-2 rounded-t-md -mx-3 -mt-3 mb-3 border-b border-blue-400/50">
              Blue Side
            </h3>
            {/* Blue Bans */}
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Ban className="h-4 w-4 text-red-400" /> Bans
              </h4>
              <div className="flex justify-center gap-2 flex-wrap bg-black/30 p-2 rounded-md border border-gray-700/50">
                {draftState.blueBans.map((ban, index) => {
                  const isCurrentBan =
                    currentDraftPosition?.phase === "ban" &&
                    currentDraftPosition.team === "blue" &&
                    currentDraftPosition.teamBanIndex === index
                  return (
                    <div
                      key={`blue-ban-${index}`}
                      className={cn(
                        `w-11 h-11 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden border-2 transition-all duration-150`,
                        ban ? "bg-gray-800 border-gray-600" : "bg-gray-800/60 border-dashed border-gray-700",
                        isCurrentBan && "border-yellow-400 ring-2 ring-yellow-400/70 shadow-lg shadow-yellow-500/30 scale-105",
                      )}
                    >
                      {ban ? (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group w-full h-full">
                                <ChampionImage championName={ban} size={44} className="object-cover w-full h-full" />
                                <div className="absolute inset-0 bg-black/75 flex items-center justify-center opacity-100">
                                  <X className="h-6 w-6 text-red-500" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border border-gray-700 rounded-md shadow-lg">
                              <p className="font-semibold">{ban} (Banned)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-gray-500">B{index + 1}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Blue Picks */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider text-center pt-1">Picks</h4>
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
                      "flex items-center gap-2 p-2 rounded-lg transition-all duration-200 h-[68px] border-2", 
                      pick.champion ? "bg-gradient-to-r from-blue-900/50 via-gray-900/30 to-gray-900/20" : "bg-black/30 border-gray-700/50",
                      isActivePick
                        ? "border-blue-500 shadow-lg shadow-blue-500/30 scale-[1.02]"
                        : pick.champion ? "border-blue-700/60" : "border-gray-700/50",
                    )}
                  >
                    <div
                      className={cn(
                        "w-12 h-12 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden border-2",
                        pick.champion ? "bg-gray-800 border-gray-600" : "bg-gray-800/60 border-dashed border-gray-700",
                      )}
                    >
                      {pick.champion ? (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group w-full h-full">
                                <ChampionImage championName={pick.champion} size={48} className="object-cover w-full h-full"/>
                                {pick.position && (
                                  <Badge
                                    variant="secondary"
                                    className="absolute -bottom-1.5 -right-1.5 bg-black/80 border border-gray-500 text-white text-[10px] px-1.5 py-0.5 pointer-events-none leading-tight font-semibold rounded-sm shadow-md"
                                  >
                                    {pick.position.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border border-gray-700 rounded-md shadow-lg">
                              <p className="font-semibold">{pick.champion}</p>
                              {pick.position && <p className="text-xs text-gray-400">{pick.position.toUpperCase()}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-gray-500">B{index + 1}</span>
                      )}
                    </div>
                    <div className="flex-grow min-w-0 space-y-1">
                      {pick.champion ? (
                        <>
                          <p className="text-sm font-semibold truncate text-white leading-tight">{pick.champion}</p>
                          <Select
                            value={pick.position || ""}
                            onValueChange={(value) => handlePositionChange("blue", index, value)}
                            disabled={!pick.champion}
                          >
                            <SelectTrigger
                              className={cn(
                                "h-7 text-xs w-full max-w-[90px] rounded-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-black flex items-center gap-1.5 pl-2 pr-1 shadow",
                                pick.champion
                                  ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700/70"
                                  : "bg-gray-700/60 border-gray-600/60 text-gray-500",
                              )}
                            >
                              <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              <SelectValue placeholder="Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-900 border-gray-700 text-white min-w-[90px] shadow-xl rounded-md">
                              {STANDARD_POSITIONS.map((pos) => (
                                <SelectItem key={`blue-pos-${index}-${pos}`} value={pos} className="text-xs hover:bg-blue-600 focus:bg-blue-600">
                                  {pos.toUpperCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic h-10 flex items-center">Waiting...</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* === Center Column (Selection Area) === */}
          <div className="flex-grow space-y-4 md:space-y-6 min-w-0 order-2 lg:order-2">
            {!isDraftComplete && (
              <div className="p-3 bg-gray-900 rounded-lg border-2 border-red-600/70 text-center sticky top-2 z-20 backdrop-blur-md shadow-xl shadow-red-900/20">
                <h3 className="text-lg font-bold text-red-300">{getDraftPhaseDescription()}</h3>
              </div>
            )}
            {!isDraftComplete && currentDraftPosition && (
              <div className="space-y-4 p-1 bg-gray-950/50 rounded-lg border border-gray-800">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-gray-900/70 rounded-md border border-gray-700/50">
                  <h3 className="text-xl font-semibold text-gray-200 hidden sm:block">
                    Select Champion
                  </h3>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
                    <div className="relative flex-grow sm:flex-grow-0 sm:w-48">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
                      <Input
                        type="search"
                        placeholder="Search..."
                        className="pl-9 bg-gray-800 border-gray-700 text-white w-full focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 focus:ring-offset-black h-10 rounded-md shadow-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    <Select value={filterPosition} onValueChange={setFilterPosition}>
                      <SelectTrigger className="w-full sm:w-[120px] bg-gray-800 border-gray-700 text-white shrink-0 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 focus:ring-offset-black h-10 rounded-md shadow-sm">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-gray-700 text-white shadow-xl rounded-md">
                        <SelectItem value="all" className="hover:bg-red-600 focus:bg-red-600">All Roles</SelectItem>
                        {STANDARD_POSITIONS.map((pos) => (
                          <SelectItem key={pos} value={pos} className="hover:bg-red-600 focus:bg-red-600">
                            {pos.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {patches && patches.length > 0 && (
                      <Select value={filterPatch} onValueChange={setFilterPatch}>
                        <SelectTrigger className="w-full sm:w-[110px] bg-gray-800 border-gray-700 text-white shrink-0 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 focus:ring-offset-black h-10 rounded-md shadow-sm">
                          <SelectValue placeholder="Patch" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-[200px] overflow-y-auto shadow-xl rounded-md">
                          <SelectItem value="all" className="hover:bg-red-600 focus:bg-red-600">All Patches</SelectItem>
                          {patches.map((patch) => (
                            <SelectItem key={patch} value={patch} className="hover:bg-red-600 focus:bg-red-600">
                              {patch}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}

                    {leagues && leagues.length > 0 && (
                      <Select value={filterLeague} onValueChange={setFilterLeague}>
                        <SelectTrigger className="w-full sm:w-[110px] bg-gray-800 border-gray-700 text-white shrink-0 focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:ring-offset-0 focus:ring-offset-black h-10 rounded-md shadow-sm">
                          <SelectValue placeholder="League" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-900 border-gray-700 text-white max-h-[200px] overflow-y-auto shadow-xl rounded-md">
                          <SelectItem value="all" className="hover:bg-red-600 focus:bg-red-600">All Leagues</SelectItem>
                          {leagues.map((league) => (
                            <SelectItem key={league} value={league} className="hover:bg-red-600 focus:bg-red-600">
                              {league}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <Tabs defaultValue="recommended" className="w-full">
                  <TabsList className="bg-gray-900 border border-gray-700 inline-flex h-10 items-center justify-center rounded-lg p-1 text-gray-300 shadow-md">
                    <TabsTrigger
                      value="all"
                      className="px-4 py-1.5 text-sm font-medium data-[state=active]:bg-gray-700 data-[state=active]:text-white data-[state=active]:shadow-inner rounded-md transition-colors"
                    >
                      All Champions
                    </TabsTrigger>
                    <TabsTrigger
                      value="recommended"
                      className="px-4 py-1.5 text-sm font-medium data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-md flex items-center gap-1.5 transition-colors"
                    >
                      <Star className="h-4 w-4" /> Recommended
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-4">
                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-8 xl:grid-cols-9 gap-2.5">
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
                                    "relative rounded-md overflow-hidden transition-all object-cover group border-2 shadow-sm",
                                    isUnavailable
                                      ? "opacity-30 cursor-not-allowed grayscale border-transparent"
                                      : "cursor-pointer bg-gray-800 border-gray-700/70 hover:border-red-500 focus:border-red-500 focus:outline-none hover:scale-105 focus:scale-105 hover:shadow-md focus:shadow-md",
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
                                    size={50} 
                                    className="rounded-full aspect-square object-cover aspect-ratio"
                                  />
                                  {isUnavailable && (
                                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center pointer-events-none">
                                      <X className="h-6 w-6 text-red-500" />
                                    </div>
                                  )}
                                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-1.5 pt-3 pb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <p className="text-white text-xs font-semibold truncate text-center leading-tight">
                                      {champion.name}
                                    </p>
                                  </div>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent className="bg-black text-white border-2 border-red-700/80 p-2.5 rounded-md shadow-xl text-xs">
                                <p className="font-bold text-sm text-red-300">{champion.name}</p>
                                {champion.mainPosition && (
                                  <p className="text-gray-400">{champion.mainPosition.toUpperCase()}</p>
                                )}
                                {champion.patch && filterPatch === "all" && (
                                  <p className="text-xs text-gray-500">P: {champion.patch}</p>
                                )}
                                {champion.league && filterLeague === "all" && (
                                  <p className="text-xs text-gray-500">L: {champion.league}</p>
                                )}
                                {isUnavailable && <p className="text-xs text-red-400 mt-1">(Unavailable)</p>}
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )
                      })}
                      {filteredChampions.length === 0 && (
                        <p className="text-gray-400 col-span-full text-center py-8 text-lg">No champions match filters.</p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="recommended" className="mt-4">
                    <div className="bg-black/30 p-4 rounded-lg border border-gray-800/60 shadow-inner">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                        {recommendedChampions.map((champion) => {
                          if (!champion) return null
                          const isUnavailable = bannedChampions.has(champion.name) || pickedChampions.has(champion.name)
                          const hasAllySynergy = champion.synergy?.details?.length > 0 && champion.synergy?.score >= MIN_ALLY_SYNERGY_WIN_RATE 
                          const isGoodCounter = champion.counter?.score > MIN_COUNTER_WIN_RATE
                          const isRarePick =
                            champion.draftPos?.pickRateInSlot < DRAFT_SLOT_PICK_RATE_LOW_THRESHOLD &&
                            champion.draftPos?.pickRateInSlot > 0

                          return (
                            <TooltipProvider
                              key={`${champion.name}-rec-${champion.patch}-${champion.league}`}
                              delayDuration={150}
                            >
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div
                                    tabIndex={isUnavailable ? -1 : 0}
                                    role="button"
                                    aria-label={`Select recommended ${champion.name}`}
                                    aria-disabled={isUnavailable}
                                    className={cn(
                                      "bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-lg overflow-hidden border-2 flex flex-col group relative shadow-xl hover:shadow-2xl focus:shadow-2xl",
                                      isUnavailable
                                        ? "opacity-40 cursor-not-allowed grayscale border-transparent"
                                        : "cursor-pointer transition-all duration-200 ease-out",
                                      champion.isPremiumPick && !isUnavailable
                                        ? "border-yellow-400 shadow-yellow-500/40 hover:border-yellow-300 hover:shadow-yellow-400/50 transform hover:-translate-y-1 focus:-translate-y-1"
                                        : "border-gray-700/60 hover:border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/30",
                                      !champion.isPremiumPick && !isUnavailable
                                        ? "hover:shadow-red-500/25 focus:shadow-red-500/25 transform hover:-translate-y-1 focus:-translate-y-1"
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
                                    {champion.isPremiumPick && !isUnavailable && (
                                      <div
                                        className="absolute -top-3 -right-3 z-20 bg-gradient-to-br from-red-600 via-red-700 to-yellow-500 text-black text-xs px-3 py-1.5 font-extrabold uppercase tracking-wider border-2 border-black shadow-lg shadow-yellow-600/50 transform rotate-[10deg] flex items-center gap-1 rounded-md"
                                      >
                                        <Star className="h-4 w-4 text-yellow-900 fill-current" /> PRIME
                                      </div>
                                    )}
                                    <div className="relative aspect-[16/10] w-full flex items-center justify-center bg-gradient-to-b from-gray-800/50 to-black/50 overflow-hidden">
                                      <ChampionImage
                                        championName={champion.name}
                                        type="splash"
                                        className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-40 transition-opacity duration-300 ease-in-out"
                                      />
                                      <ChampionImage
                                        championName={champion.name}
                                        size={80}
                                        className="z-10 drop-shadow-xl group-hover:scale-105 group-hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition-all duration-300 ease-in-out"
                                      />
                                      {isUnavailable && (
                                        <div className="absolute inset-0 bg-black/80 flex items-center justify-center pointer-events-none z-20">
                                          <X className="h-8 w-8 text-red-500" />
                                        </div>
                                      )}
                                      {(champion.suggestedPosition || champion.mainPosition) && (
                                        <Badge
                                          variant="secondary"
                                          className="absolute bottom-2 right-2 bg-black/80 border border-gray-600 text-white text-[10px] px-2 py-1 pointer-events-none z-10 font-semibold rounded shadow-md"
                                        >
                                          {(champion.suggestedPosition || champion.mainPosition)?.toUpperCase()}
                                        </Badge>
                                      )}
                                      <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-10">
                                        {hasAllySynergy && (
                                          <div className="bg-green-600 border border-green-500/70 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 shadow-md">
                                            <TrendingUp className="h-3.5 w-3.5" /> Synergy
                                          </div>
                                        )}
                                        {isGoodCounter && (
                                          <div className="bg-red-600 border border-red-500/70 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 shadow-md">
                                            <Swords className="h-3.5 w-3.5" /> Counter
                                          </div>
                                        )}
                                        {champion.laneCounter?.isLaneCounter && (
                                          <div className="bg-purple-600 border border-purple-500/70 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 shadow-md">
                                            <Swords className="h-3.5 w-3.5" /> Lane Cntr
                                          </div>
                                        )}
                                        {champion.teamCounter?.isTeamCounter && (
                                          <div className="bg-orange-600 border border-orange-500/70 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 shadow-md">
                                            <Swords className="h-3.5 w-3.5" /> Team Cntr
                                          </div>
                                        )}
                                        {isRarePick && (
                                          <div className="bg-sky-600 border border-sky-500/70 text-white text-[10px] px-2 py-1 rounded font-bold flex items-center gap-1 shadow-md">
                                            Rare Pick
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                    <div className="p-3 text-center bg-black/50 backdrop-blur-sm border-t-2 border-red-600/50 flex-grow flex flex-col justify-between">
                                      <div>
                                        <p className="text-lg font-extrabold truncate mb-1 text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-red-500 to-white tracking-tight">
                                          {champion.name}
                                        </p>
                                        <p className="text-xs text-gray-300 italic mb-2 h-8 line-clamp-2 leading-tight">
                                          {champion.recommendReason || "Solid pick"}
                                        </p>
                                      </div>
                                      <div className="flex justify-center items-center gap-x-4 gap-y-1 text-xs border-t border-gray-700/40 pt-2 mt-2 font-medium flex-wrap">
                                        {hasAllySynergy && champion.synergy?.score ? (
                                          <span
                                            className="inline-flex items-center text-green-400"
                                            title={`Avg WR with Team: ${champion.synergy.score.toFixed(1)}%`}
                                          >
                                            <TrendingUp className="h-4 w-4 mr-1" /> {champion.synergy.score.toFixed(0)}%
                                          </span>
                                        ) : isGoodCounter && champion.counter?.avgWinRateVs ? (
                                          <span
                                            className="inline-flex items-center text-red-400"
                                            title={`Avg WR vs Enemy: ${champion.counter.avgWinRateVs.toFixed(1)}%`}
                                          >
                                            <Swords className="h-4 w-4 mr-1" />
                                            {champion.counter.avgWinRateVs.toFixed(0)}%
                                          </span>
                                        ) : typeof champion.winRate === "number" ? (
                                          <span
                                            className="inline-flex items-center text-sky-400"
                                            title={`Overall WR: ${champion.winRate.toFixed(1)}%`}
                                          >
                                            WR {champion.winRate.toFixed(0)}%
                                          </span>
                                        ) : (
                                          <span className="text-gray-500">N/A</span>
                                        )}
                                      </div>
                                      {isUnavailable && <p className="text-xs text-red-400 mt-1">(Unavailable)</p>}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="bg-black border-2 border-red-600/80 text-white p-4 max-w-md text-xs shadow-2xl shadow-red-900/40 rounded-lg">
                                  <div className="space-y-2.5">
                                    <p className="text-xl font-extrabold mb-2 border-b-2 border-red-700/50 pb-2 text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300">
                                      {champion.name}
                                    </p>
                                    {champion.recommendReason && (
                                      <p className="text-sm text-gray-200 italic mb-3 leading-relaxed">{champion.recommendReason}</p>
                                    )}
                                    {hasAllySynergy &&
                                      champion.synergy?.details &&
                                      champion.synergy.details.length > 0 && (
                                        <div className="border-t border-red-800/60 pt-2.5 mt-2.5">
                                          <p className="text-sm text-green-400 font-semibold mb-1.5 flex items-center gap-1.5">
                                            <TrendingUp className="h-4 w-4" /> Ally Synergy:
                                          </p>
                                          <div className="space-y-1">
                                            {champion.synergy.details.slice(0, 3).map((detail, idx) => (
                                              <div key={idx} className="flex justify-between gap-2">
                                                <span className="text-gray-400">w/ {detail.champion}</span>
                                                <div className="text-right font-semibold">
                                                  <span className="text-green-300">
                                                    {detail.synergyScore.toFixed(1)}% WR
                                                  </span>
                                                  <span className="text-gray-600 mx-1.5">|</span>
                                                  <span className="text-sky-300">
                                                    {detail.pickRateTogether.toFixed(1)}% PR
                                                  </span>
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    {champion.counter?.details && champion.counter.details.length > 0 && (
                                      <div className="border-t border-red-800/60 pt-2.5 mt-2.5">
                                        <p className="text-sm text-red-400 font-semibold mb-1.5 flex items-center gap-1.5">
                                          <Swords className="h-4 w-4" /> Matchup vs Enemy:
                                        </p>
                                        <div className="space-y-1">
                                          {champion.counter.details.slice(0, 3).map((detail, idx) => (
                                            <div key={idx} className="flex justify-between gap-2">
                                              <span className="text-gray-400">vs {detail.champion}</span>
                                              <div className="text-right font-semibold">
                                                <span
                                                  className={detail.winRateVs >= 50 ? "text-green-300" : "text-red-300"}
                                                >
                                                  {detail.winRateVs.toFixed(1)}% WR
                                                </span>
                                                <span className="text-gray-600 mx-1.5">|</span>
                                                <span className="text-sky-300">{detail.pickRateVs.toFixed(1)}% PR</span>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {champion.laneCounter?.isLaneCounter && champion.laneCounter.details.length > 0 && (
                                      <div className="border-t border-red-800/60 pt-2.5 mt-2.5">
                                        <p className="text-sm text-purple-400 font-semibold mb-1.5 flex items-center gap-1.5">
                                          <Swords className="h-4 w-4" /> Lane Counter:
                                        </p>
                                        <div className="space-y-1">
                                          {champion.laneCounter.details.slice(0, 2).map((detail, idx) => (
                                            <div key={idx} className="flex justify-between gap-2">
                                              <span className="text-gray-400">
                                                vs {detail.champion} ({detail.position?.toUpperCase()})
                                              </span>
                                              <span className="text-purple-300 font-semibold">
                                                {detail.winRateVs.toFixed(1)}% WR
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {champion.teamCounter?.isTeamCounter && champion.teamCounter.details.length > 0 && (
                                      <div className="border-t border-red-800/60 pt-2.5 mt-2.5">
                                        <p className="text-sm text-orange-400 font-semibold mb-1.5 flex items-center gap-1.5">
                                          <Swords className="h-4 w-4" /> Team Counter:
                                        </p>
                                        <div className="space-y-1">
                                          {champion.teamCounter.details.slice(0, 2).map((detail, idx) => (
                                            <div key={idx} className="flex justify-between gap-2">
                                              <span className="text-gray-400">
                                                vs {detail.champion} ({detail.position?.toUpperCase()})
                                              </span>
                                              <span className="text-orange-300 font-semibold">
                                                {detail.winRateVs.toFixed(1)}% WR
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {(typeof champion.winRate === "number" || typeof champion.pickRate === "number") && (
                                      <div className="border-t border-red-800/60 pt-2.5 mt-2.5">
                                        <p className="text-sm text-red-300 font-semibold mb-1.5">Overall Stats:</p>
                                        {typeof champion.winRate === "number" && (
                                          <div className="flex justify-between gap-2 text-gray-400">
                                            <span>Win Rate:</span> <span className="font-semibold text-white">{champion.winRate.toFixed(1)}%</span>
                                          </div>
                                        )}
                                        {typeof champion.pickRate === "number" && (
                                          <div className="flex justify-between gap-2 text-gray-400">
                                            <span>Pick Rate:</span> <span className="font-semibold text-white">{champion.pickRate.toFixed(1)}%</span>
                                          </div>
                                        )}
                                        {typeof champion.banRate === "number" && (
                                          <div className="flex justify-between gap-2 text-gray-400">
                                            <span>Ban Rate:</span> <span className="font-semibold text-white">{champion.banRate.toFixed(1)}%</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                    {champion.draftPos?.context && (
                                      <p className="text-sky-300 text-xs mt-2.5 italic">
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
                          <p className="text-gray-400 col-span-full text-center py-8 text-lg">
                            No recommendations for current state/filters.
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}

            {isDraftComplete && (
              <div className="text-center py-10">
                <h3 className="text-3xl font-bold mb-4 text-green-400">Draft Complete!</h3>
                <p className="text-gray-300 mb-8 text-lg">Review the final teams or start a new draft.</p>
                <Button
                  size="lg"
                  className="bg-red-600 text-white border-red-700 hover:bg-red-700 hover:border-red-500 rounded-md shadow-lg hover:shadow-xl transition-all duration-150 px-8 py-3 text-base"
                  onClick={resetDraft}
                >
                  <RefreshCw className="h-5 w-5 mr-2.5" /> New Draft
                </Button>
              </div>
            )}
          </div>

          {/* === Red Team Column (Right) === */}
          <div className="lg:w-[260px] xl:w-[300px] shrink-0 bg-gray-950 border border-red-700/50 rounded-lg p-3 space-y-3 order-3 shadow-lg">
            <h3 className="text-xl font-bold text-white text-center bg-red-600 py-2 rounded-t-md -mx-3 -mt-3 mb-3 border-b border-red-400/50">
              Red Side
            </h3>
            {/* Red Bans */}
            <div className="space-y-1.5">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Ban className="h-4 w-4 text-red-400" /> Bans
              </h4>
              <div className="flex justify-center gap-2 flex-wrap bg-black/30 p-2 rounded-md border border-gray-700/50">
                {draftState.redBans.map((ban, index) => {
                  const isCurrentBan =
                    currentDraftPosition?.phase === "ban" &&
                    currentDraftPosition.team === "red" &&
                    currentDraftPosition.teamBanIndex === index
                  return (
                    <div
                      key={`red-ban-${index}`}
                       className={cn(
                        `w-11 h-11 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden border-2 transition-all duration-150`,
                        ban ? "bg-gray-800 border-gray-600" : "bg-gray-800/60 border-dashed border-gray-700",
                        isCurrentBan && "border-yellow-400 ring-2 ring-yellow-400/70 shadow-lg shadow-yellow-500/30 scale-105",
                      )}
                    >
                      {ban ? (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group w-full h-full">
                                <ChampionImage championName={ban} size={44} className="object-cover w-full h-full"/>
                                <div className="absolute inset-0 bg-black/75 flex items-center justify-center opacity-100">
                                  <X className="h-6 w-6 text-red-500" />
                                </div>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border border-gray-700 rounded-md shadow-lg">
                              <p className="font-semibold">{ban} (Banned)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-gray-500">R{index + 1}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
            {/* Red Picks */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider text-center pt-1">Picks</h4>
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
                      "flex items-center gap-2 p-2 rounded-lg transition-all duration-200 h-[68px] border-2", 
                      pick.champion ? "bg-gradient-to-l from-red-900/50 via-gray-900/30 to-gray-900/20" : "bg-black/30 border-gray-700/50",
                      isActivePick
                        ? "border-red-500 shadow-lg shadow-red-500/30 scale-[1.02]"
                        : pick.champion ? "border-red-700/60" : "border-gray-700/50",
                    )}
                  >
                    <div className="flex-grow min-w-0 space-y-1 text-right">
                      {pick.champion ? (
                        <>
                          <p className="text-sm font-semibold truncate text-white leading-tight">{pick.champion}</p>
                          <div className="flex items-center justify-end">
                            <Select
                              value={pick.position || ""}
                              onValueChange={(value) => handlePositionChange("red", index, value)}
                              disabled={!pick.champion}
                            >
                              <SelectTrigger
                                 className={cn(
                                  "h-7 text-xs w-full max-w-[90px] rounded-md focus:ring-2 focus:ring-red-500 focus:ring-offset-0 focus:ring-offset-black flex items-center justify-end gap-1.5 pr-2 pl-1 shadow",
                                  pick.champion
                                    ? "bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700/70"
                                    : "bg-gray-700/60 border-gray-600/60 text-gray-500",
                                )}
                              >
                                <SelectValue placeholder="Role" className="mr-1" />
                                <ArrowUpDown className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                              </SelectTrigger>
                              <SelectContent className="bg-gray-900 border-gray-700 text-white min-w-[90px] shadow-xl rounded-md">
                                {STANDARD_POSITIONS.map((pos) => (
                                  <SelectItem key={`red-pos-${index}-${pos}`} value={pos} className="text-xs hover:bg-red-600 focus:bg-red-600">
                                    {pos.toUpperCase()}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm text-gray-500 italic h-10 flex items-center justify-end">Waiting...</p>
                      )}
                    </div>
                    <div
                      className={cn(
                        "w-12 h-12 rounded-md flex items-center justify-center shrink-0 relative overflow-hidden border-2",
                        pick.champion ? "bg-gray-800 border-gray-600" : "bg-gray-800/60 border-dashed border-gray-700",
                      )}
                    >
                      {pick.champion ? (
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="relative group w-full h-full">
                                <ChampionImage championName={pick.champion} size={48} className="object-cover w-full h-full"/>
                                {pick.position && (
                                  <Badge
                                    variant="secondary"
                                    className="absolute -bottom-1.5 -left-1.5 bg-black/80 border border-gray-500 text-white text-[10px] px-1.5 py-0.5 pointer-events-none leading-tight font-semibold rounded-sm shadow-md"
                                  >
                                    {pick.position.toUpperCase()}
                                  </Badge>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-black text-white border border-gray-700 rounded-md shadow-lg">
                              <p className="font-semibold">{pick.champion}</p>
                              {pick.position && <p className="text-xs text-gray-400">{pick.position.toUpperCase()}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="text-xs text-gray-500">R{index + 1}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}