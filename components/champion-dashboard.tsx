"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader } from "../components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts"
import { Badge } from "../components/ui/badge"
import ChampionImage from "./champion-image"
import {
  Shield,
  Sword,
  Target,
  Award,
  Activity,
  Users,
  Percent,
  Gamepad2,
  TrendingUp,
  TrendingDown, // Added for negative WR indication
  BarChart2,
  Zap, // Added for Dmg Share icon
  Coins, // Added for Gold Share icon
} from "lucide-react"
import type { ChampionStat, SynergyDataMap, MatchupDataMap, MatchupData, SynergyData } from "../types" // Import types

// Helper Function for Win Rate Color
const getWinRateColor = (winRate: number | undefined): string => {
  if (winRate === undefined || isNaN(winRate)) return "text-gray-400"
  if (winRate > 52) return "text-green-400" // Good WR
  if (winRate < 48) return "text-red-400"   // Bad WR
  return "text-yellow-400" // Neutral WR
}

// --- Updated Matchup Tooltip (Includes Specific Matchup WR) ---
interface MatchupTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  selectedChampionName: string
  tooltipType: "counteredBy" | "thisCounters"
  matchupDetails?: MatchupData | null // Specific data for this opponent
}

const MatchupTooltip = ({ active, payload, label, selectedChampionName, tooltipType, matchupDetails }: MatchupTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload // Data for the hovered bar (the opponent/target)
    const barValue = payload[0].value // The value represented by the bar's length

    // Opponent's general stats
    const opponentGeneralWinRate = data.generalWinRate || 0
    const opponentGeneralGames = data.generalGamesPlayed || 0
    const rateShownInBar = barValue

    // Specific matchup stats
    const specificWinRate = matchupDetails?.winRateVs
    const specificGames = matchupDetails?.gamesPlayedVs

    let title = ""
    let explanation = ""
    let rateLabel = ""
    let rateValue = rateShownInBar?.toFixed(1) + "%"
    let specificWinRateLabel = ""
    let specificWinRateIcon = Activity // Default icon

    if (tooltipType === "counteredBy") {
      title = `${data.name} vs ${selectedChampionName}`
      rateLabel = `Opponent Counter Rate:`
      explanation = `${data.name} is picked after ${selectedChampionName} in ${rateValue} of their games.`
      specificWinRateLabel = `${data.name}'s WR vs ${selectedChampionName}:`
    } else { // tooltipType === "thisCounters"
      title = `${selectedChampionName} vs ${data.name}`
      rateLabel = `Target's Blind Rate:`
      explanation = `${selectedChampionName} often picked vs ${data.name}. Target is blind picked ${rateValue}.`
      specificWinRateLabel = `${selectedChampionName}'s WR vs ${data.name}:`
    }

    // Adjust icon based on the specific win rate value
    if (specificWinRate !== undefined) {
        if (specificWinRate < 48) specificWinRateIcon = TrendingDown;
        else if (specificWinRate > 52) specificWinRateIcon = TrendingUp;
    }

    return (
      <div className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-lg border border-red-800/50 shadow-xl text-xs font-sans max-w-xs z-50">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 border-b border-red-700/30 pb-1.5">
          <ChampionImage championName={data.name} size={32} />
          <div>
            <div className="text-sm font-semibold text-white">{data.name}</div>
            <div className="text-xs text-gray-400">{title}</div>
          </div>
        </div>
        {/* Body */}
        <div className="space-y-1.5 text-white/95">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 flex items-center gap-1"><TrendingUp size={13} className="text-blue-400" />{rateLabel}</span>
            <span className="font-bold text-blue-300">{rateValue}</span>
          </div>
          {/* --- Specific Matchup Win Rate --- */}
          {specificWinRate !== undefined && specificGames !== undefined && specificGames > 0 ? (
             <div className="flex justify-between items-center">
                 <span className="text-gray-300 flex items-center gap-1">
                     <specificWinRateIcon size={13} className={getWinRateColor(specificWinRate)} /> {specificWinRateLabel}
                 </span>
                 <span className={`font-bold ${getWinRateColor(specificWinRate)}`}>
                     {specificWinRate.toFixed(1)}% <span className="text-gray-500 text-[10px]">({specificGames} G)</span>
                 </span>
             </div>
          ) : (
              <div className="flex justify-between items-center text-gray-500 italic text-xs">
                  <span>Specific Matchup WR:</span>
                  <span>N/A</span>
              </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-300 flex items-center gap-1"><BarChart2 size={13} className={getWinRateColor(opponentGeneralWinRate)} /> Opponent General WR:</span>
            <span className={`font-bold ${getWinRateColor(opponentGeneralWinRate)}`}>{opponentGeneralWinRate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300 flex items-center gap-1"><Gamepad2 size={13} className="text-gray-400" /> Opponent General Games:</span>
            <span className="font-bold">{opponentGeneralGames.toLocaleString()}</span>
          </div>
          <div className="pt-1.5 mt-1.5 border-t border-red-700/30 text-xs text-gray-400">
            {explanation}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

// --- Updated Pairing Tooltip (Includes Specific Pairing WR) ---
interface PairingTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string | number
  selectedChampionName: string
  synergyDetails?: SynergyData | null // Specific data for this ally
}

const PairingTooltip = ({ active, payload, label, selectedChampionName, synergyDetails }: PairingTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload // Data for the hovered bar (the paired champion)
    const barValueGames = payload[0].value // Games together from the basic pairing count (bar length)

    // Use specific synergy data if available, fallback to bar data for games count
    const gamesTogether = synergyDetails?.gamesPlayed ?? barValueGames ?? 0
    const winRateTogether = synergyDetails?.winRate // Specific WR from synergy data
    const pickRateTogether = synergyDetails?.pickRate // Specific PR from synergy data

    let winRateIcon = Activity;
    if (winRateTogether !== undefined) {
        if (winRateTogether < 48) winRateIcon = TrendingDown;
        else if (winRateTogether > 52) winRateIcon = TrendingUp;
    }

    return (
       <div className="bg-gradient-to-br from-gray-900 to-black p-3 rounded-lg border border-green-800/50 shadow-xl text-xs font-sans max-w-xs z-50">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2 border-b border-green-700/30 pb-1.5">
          <ChampionImage championName={data.name} size={32} />
          <div>
            <div className="text-sm font-semibold text-white">{data.name}</div>
            <div className="text-xs text-gray-400">Synergy with {selectedChampionName}</div>
          </div>
        </div>
        {/* Body */}
        <div className="space-y-1.5 text-white/95">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 flex items-center gap-1"><Users size={13} className="text-purple-400" />Games Together:</span>
            <span className="font-bold text-purple-300">{gamesTogether.toLocaleString()}</span>
          </div>
          {/* --- Win Rate Together --- */}
          {winRateTogether !== undefined ? (
            <div className="flex justify-between items-center">
              <span className="text-gray-300 flex items-center gap-1">
                 <winRateIcon size={13} className={getWinRateColor(winRateTogether)} />Win Rate Together:
              </span>
              <span className={`font-bold ${getWinRateColor(winRateTogether)}`}>{winRateTogether.toFixed(1)}%</span>
            </div>
          ) : (
             <div className="flex justify-between items-center text-gray-500 italic text-xs">
                 <span>Win Rate Together:</span><span>N/A</span>
             </div>
          )}
          {/* Pick Rate Together */}
           {pickRateTogether !== undefined ? (
            <div className="flex justify-between items-center">
              <span className="text-gray-300 flex items-center gap-1"><Percent size={13} className="text-yellow-400" />Pick Rate Together:</span>
              <span className="font-bold text-yellow-300">{pickRateTogether.toFixed(1)}%</span>
            </div>
          ) : (
               <div className="flex justify-between items-center text-gray-500 italic text-xs">
                   <span>Pick Rate Together:</span><span>N/A</span>
               </div>
           )}
          <div className="pt-1.5 mt-1.5 border-t border-green-700/30 text-xs text-gray-400">
            Stats for when {selectedChampionName} and {data.name} are on the same team.
            {pickRateTogether !== undefined ? " Pick Rate is % of total filtered games." : ""}
          </div>
        </div>
      </div>
    );
  }
  return null;
};

interface ChampionDashboardProps {
  champion: ChampionStat
  isOpen: boolean
  onClose: () => void
  allChampions: ChampionStat[] // List of all champions' *general* stats for context
  allSynergyData: SynergyDataMap // Detailed synergy data for all pairs
  matchupData: MatchupDataMap // Detailed matchup data for all pairs
  filterPatch?: string
  filterLeague?: string
  showTopLeagues?: boolean
}

// Helper constant needed in ChampionDashboard
const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"];

export default function ChampionDashboard({
  champion,
  isOpen,
  onClose,
  allChampions, // General stats of all champions (used for opponent context in tooltips)
  allSynergyData, // Map containing specific Win Rates for pairings
  matchupData, // Map containing specific Win Rates for matchups
  filterPatch = "all",
  filterLeague = "all",
  showTopLeagues = false,
}: ChampionDashboardProps) {
  // Early return if no champion data
  if (!champion) return null

  const championName = champion.name
  const mainPosition = champion.mainPosition || "unknown"

  // --- Data Lookup Helpers ---
  const getMatchupDetails = (opponentName: string): MatchupData | null => {
      return matchupData?.[championName]?.[opponentName] || null;
  }
  const getOpponentMatchupDetails = (opponentName: string): MatchupData | null => {
       // Get matchup data from the opponent's perspective vs the selected champion
       return matchupData?.[opponentName]?.[championName] || null;
  }
  const getSynergyDetails = (allyName: string): SynergyData | null => {
      return allSynergyData?.[championName]?.[allyName] || null;
  }

  // --- Data Processing Memos ---

  // Champions that counter the selected champion (based on high counter-pick rate vs selected champ)
  const countersToThisChampion = useMemo(() => {
    if (!allChampions || mainPosition === 'unknown') return [];

    // Filter all champions to find potential counters in the same main role
    return allChampions
      .filter(c =>
          c.name !== championName &&
          (c.mainPosition === mainPosition || (c.positions && Object.keys(c.positions).includes(mainPosition))) &&
          c.picks >= 1 && // Ensure champ has been picked
          (c.counterPickRate ?? 0) > 0 // Use the opponent's general counter pick rate as the primary sort metric
      )
      .sort((a, b) => (b.counterPickRate ?? 0) - (a.counterPickRate ?? 0)) // Sort by opponent's counter rate
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        value: c.counterPickRate || 0, // Value for the bar = Opponent's Counter Pick Rate %
        // Add general opponent stats for context in the tooltip
        generalWinRate: c.winRate || 0,
        generalGamesPlayed: c.picks || 0,
        opponentName: c.name, // Pass name for specific matchup lookup in tooltip
      }));
  }, [allChampions, championName, mainPosition]);

  // Champions the selected champion is strong against (based on high blind-pick rate of the opponent)
  const championsThisCounters = useMemo(() => {
     if (!allChampions || mainPosition === 'unknown') return [];

    // Filter all champions to find potential targets in the same main role
    return allChampions
      .filter(c =>
          c.name !== championName &&
          (c.mainPosition === mainPosition || (c.positions && Object.keys(c.positions).includes(mainPosition))) &&
          c.picks >= 1 && // Ensure champ has been picked
          (c.blindPickRate ?? 0) > 0 // Use the target's general blind pick rate as the primary sort metric
      )
      .sort((a, b) => (b.blindPickRate ?? 0) - (a.blindPickRate ?? 0)) // Sort by target's blind rate
      .slice(0, 5)
      .map(c => ({
        name: c.name,
        value: c.blindPickRate || 0, // Value for the bar = Target's Blind Pick Rate %
        // Add general target stats for context in the tooltip
        generalWinRate: c.winRate || 0,
        generalGamesPlayed: c.picks || 0,
        opponentName: c.name, // Pass name for specific matchup lookup in tooltip
      }));
  }, [allChampions, championName, mainPosition]);

  // Common pairings (based on games played together from champion.pairings)
  const pairingData = useMemo(() => {
     // Use the pairings pre-calculated and sorted by count in champion-stats
     if (!champion || !Array.isArray(champion.pairings)) {
       return [];
     }

     return champion.pairings
       .slice(0, 5) // Already sorted by count
       .map(pairing => ({
         name: pairing.name, // Ally's name
         count: pairing.count || 0, // Games played together (value for the bar)
         allyName: pairing.name // Pass name for specific synergy lookup in tooltip
       }));
   }, [champion]);

  // Position distribution (based on the selected champion's data)
  const positionData = useMemo(() => {
    if (!champion || !champion.positions) return [];
    return Object.entries(champion.positions)
      .map(([name, value]) => ({ name: name.toLowerCase(), value: value as number }))
      .filter((p) => STANDARD_POSITIONS.includes(p.name)) // Ensure only standard positions
      .sort((a, b) => b.value - a.value); // Sort by games played in that position
  }, [champion]);

  // Performance Radar Data (Includes Damage Share)
  const performanceData = useMemo(() => {
    if (!champion) return [];

    // Helper to safely parse potential string numbers
    const safeParse = (val: any): number => {
        const num = Number.parseFloat(val);
        return isNaN(num) ? 0 : num;
    };

    // Calculate KDA Score (0-100)
    let kdaScore: number;
    if (champion.kda === 'Perfect') {
        kdaScore = 100;
    } else {
        const numericKda = typeof champion.kda === 'number' ? champion.kda : 0;
        // Scale KDA: e.g., KDA of 5 maps to 50, capping at 10 (maps to 100)
        kdaScore = Math.min(Math.max(numericKda * 10, 0), 100);
    }

    // Function to get stat value, handling potential undefined/NaN
    const getStat = (key: keyof ChampionStat): number => {
        const val = champion[key];
        if (typeof val === 'number' && !isNaN(val)) {
            return val;
        }
        if (typeof val === 'string') {
            const num = parseFloat(val);
            return isNaN(num) ? 0 : num;
        }
        return 0; // Default to 0 if not a valid number
    };

    // Define radar subjects and map values
    return [
      { subject: "Win Rate", A: getStat('winRate'), fullMark: 100 },
      { subject: "KDA Score", A: kdaScore, fullMark: 100 }, // Use calculated KDA Score
      { subject: "Pick Rate", A: getStat('pickRate'), fullMark: 100 },
      // *** ADDED DAMAGE SHARE TO RADAR ***
      { subject: "Dmg Share", A: getStat('avgDamageShare'), fullMark: 100 },
      { subject: "Gold Share", A: getStat('avgGoldShare'), fullMark: 100 },
    ].map(item => ({
      ...item,
      // Clamp value between 0 and fullMark
      A: Math.min(Math.max(item.A || 0, 0), item.fullMark)
    }));

  }, [champion]);

  // Draft Strategy Pie Data (remains the same)
  const draftData = useMemo(() => {
    if (!champion) return [];
    const blind = champion.blindPickRate || 0;
    const counter = champion.counterPickRate || 0;
    const total = blind + counter;
    // Filter out tiny slices if both rates are very low
    if (total < 0.1) return [];
     return [
       { name: "Blind Pick", value: blind },
       { name: "Counter Pick", value: counter },
     ].filter(d => d.value > 0.1); // Filter out extremely small values for clarity
  }, [champion]);

  // Colors and Filter Description (remain the same)
  const PIE_COLORS = ["#0088FE", "#FF8042"]; // Blue for Blind, Orange for Counter
  const PAIRING_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1"];
  const COUNTERED_BY_COLOR = "#FF8042"; // Orange/Red for counters
  const THIS_COUNTERS_COLOR = "#00C49F"; // Teal/Green for strong against

  const filterDescription = useMemo(() => {
    const parts = [];
    if (filterPatch && filterPatch !== "all") parts.push(`Patch ${filterPatch}`);
    if (showTopLeagues) parts.push("Top Leagues");
    else if (filterLeague && filterLeague !== "all") parts.push(filterLeague);
    return parts.length > 0 ? `Filtered by: ${parts.join(", ")}` : "Global Data";
  }, [filterPatch, filterLeague, showTopLeagues]);

  // Formatting Helpers
  const formatKdaString = (): string => {
      const kills = champion.avgKills?.toFixed(1) ?? 'N/A';
      const deaths = champion.avgDeaths?.toFixed(1) ?? 'N/A';
      const assists = champion.avgAssists?.toFixed(1) ?? 'N/A';
      return `${kills} / ${deaths} / ${assists}`;
  }
  const formatStatPercent = (value: number | undefined | null): string => {
      return (typeof value === 'number' && !isNaN(value)) ? `${value.toFixed(1)}%` : 'N/A';
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl bg-gradient-to-b from-gray-950 to-black text-white border border-red-900/30 overflow-y-auto max-h-[95vh] p-0 scrollbar-thin scrollbar-thumb-red-800 scrollbar-track-black/50">
        {/* Header Section */}
        <DialogHeader className="p-6 bg-black/30 border-b border-red-800/40 sticky top-0 z-10">
          <div className="flex items-start sm:items-center gap-4 flex-col sm:flex-row">
            <div className="flex-shrink-0 rounded-md overflow-hidden border-2 border-red-700/50">
              <ChampionImage championName={championName} size={64} />
            </div>
            <div className="flex-grow">
              <h2 className="text-3xl font-bold text-red-500 tracking-tight">{championName}</h2>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="destructive" className="bg-red-700/80 text-white border border-red-500/50 shadow-sm">{mainPosition.toUpperCase()}</Badge>
                {/* Use getWinRateColor for dynamic styling */}
                <Badge variant="outline" className={`border-opacity-60 text-white shadow-sm ${getWinRateColor(champion.winRate).includes('green') ? "bg-green-800/50 border-green-500" : getWinRateColor(champion.winRate).includes('red') ? "bg-red-800/50 border-red-500" : "bg-gray-700/50 border-gray-500"}`}>
                    {formatStatPercent(champion.winRate)} WR
                </Badge>
                <Badge variant="outline" className="bg-blue-800/50 text-white border-blue-500/60 shadow-sm">{formatStatPercent(champion.blindPickRate)} Blind</Badge>
                <Badge variant="outline" className="bg-orange-800/50 text-white border-orange-500/60 shadow-sm">{formatStatPercent(champion.counterPickRate)} Counter</Badge>
                <Badge variant="outline" className="bg-purple-800/50 text-white border-purple-500/60 shadow-sm">{(champion.picks || 0).toLocaleString()} Picks</Badge>
              </div>
              <div className="text-sm text-gray-400 mt-2">{filterDescription}</div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Grid */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Performance Stats (Radar with Dmg Share) */}
          <Card className="bg-black/20 border border-red-800/30 shadow-lg text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-400"><Activity className="h-5 w-5" /> Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                    <PolarGrid stroke="#555" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: "#e0e0e0", fontSize: 12 }} />
                    {/* Adjusted Radius Axis for better readability */}
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tickCount={6} tick={{ fill: "#aaa", fontSize: 10 }} />
                    <Radar name={championName} dataKey="A" stroke="#CC0000" fill="#CC0000" fillOpacity={0.6} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "rgba(10,0,0,0.9)", border: "1px solid #660000", color: "white", fontSize: "12px", borderRadius: '6px' }}
                      itemStyle={{ color: "#eee" }}
                      labelStyle={{ color: "white", fontWeight: "bold" }}
                      formatter={(value, name, props) => {
                          const subject = props.payload.subject;
                          const formattedValue = Number(value).toFixed(1);
                          const unit = subject.includes('Rate') || subject.includes('Share') ? '%' : '';
                          const label = subject === "KDA Score" ? `${subject} (Scaled KDA)` : subject;
                          return [`${formattedValue}${unit}`, label];
                      }}
                      position={{ y: 10 }}
                      isAnimationActive={false}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              {/* KDA and Damage Share Boxes */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col items-center justify-center p-3 bg-red-950/30 rounded-lg border border-red-800/50">
                  <span className="text-sm text-gray-300 flex items-center gap-1"><Target size={14} /> Avg KDA</span>
                  <span className="text-xl font-bold text-white">{champion.kda === 'Perfect' ? 'Perfect' : champion.kda?.toFixed(2) ?? 'N/A'}</span>
                  <span className="text-xs text-gray-400">{formatKdaString()}</span>
                </div>
                 {/* *** ADDED DAMAGE SHARE BOX *** */}
                <div className="flex flex-col items-center justify-center p-3 bg-red-950/30 rounded-lg border border-red-800/50">
                  <span className="text-sm text-gray-300 flex items-center gap-1"><Zap size={14} className="text-yellow-400"/> Avg Dmg Share</span>
                  <span className={`text-xl font-bold text-white`}>{formatStatPercent(champion.avgDamageShare)}</span>
                     <span className="text-xs text-gray-400">(% of team damage)</span>
                </div>
                {/* Optional: Add Gold Share Box similarly */}
                {/*
                <div className="flex flex-col items-center justify-center p-3 bg-red-950/30 rounded-lg border border-red-800/50">
                  <span className="text-sm text-gray-300 flex items-center gap-1"><Coins size={14} className="text-amber-400"/> Avg Gold Share</span>
                  <span className="text-xl font-bold text-white">{formatStatPercent(champion.avgGoldShare)}</span>
                  <span className="text-xs text-gray-400">(% of team gold)</span>
                </div>
                */}
              </div>
            </CardContent>
          </Card>

          {/* Draft Strategy (Pie - No changes needed) */}
          <Card className="bg-black/20 border border-red-800/30 shadow-lg text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-400"><Target className="h-5 w-5" /> Draft Strategy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {draftData.length > 0 ? (
                    <PieChart>
                      <Pie
                        data={draftData}
                        cx="50%" cy="50%"
                        labelLine={false}
                        outerRadius={90} innerRadius={45}
                        fill="#8884d8" dataKey="value"
                        label={({ name, percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                        stroke="#333" paddingAngle={2}
                      >
                        {draftData.map((entry, index) => (<Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name]}
                        contentStyle={{ backgroundColor: "rgba(10,0,0,0.9)", border: "1px solid #660000", fontSize: "12px", borderRadius: '6px' }}
                        itemStyle={{ color: "#eee" }}
                        labelStyle={{ color: "white" }}
                        cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                         position={{ y: 10 }}
                         isAnimationActive={false}
                      />
                      <Legend wrapperStyle={{ color: "#e0e0e0", paddingTop: "15px", fontSize: '13px' }} />
                    </PieChart>
                  ) : (<div className="flex items-center justify-center h-full text-gray-500 italic">No significant draft data</div>)}
                </ResponsiveContainer>
              </div>
              {/* Blind/Counter Pick Rate Boxes */}
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="flex flex-col items-center justify-center p-3 bg-blue-950/30 rounded-lg border border-blue-800/50">
                  <span className="text-sm text-gray-300">Blind Pick Rate</span>
                  <span className="text-xl font-bold text-white">{formatStatPercent(champion.blindPickRate)}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 bg-orange-950/30 rounded-lg border border-orange-800/50">
                  <span className="text-sm text-gray-300">Counter Pick Rate</span>
                  <span className="text-xl font-bold text-white">{formatStatPercent(champion.counterPickRate)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Countered By (Uses specific matchup WR in tooltip) */}
          <Card className="bg-black/20 border border-red-800/30 shadow-lg text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-400"><Shield className="h-5 w-5" /> Countered By <span className="text-xs text-gray-400">({mainPosition.toUpperCase()})</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {countersToThisChampion.length > 0 ? (
                    <BarChart data={countersToThisChampion} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                      <XAxis type="number" domain={[0, "auto"]} tick={{ fill: "#ccc", fontSize: 11 }} tickFormatter={(tick) => `${tick}%`} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "#e0e0e0", fontSize: 12 }} width={80} interval={0} tickFormatter={(value) => (value.length > 10 ? `${value.substring(0, 9)}…` : value)} />
                      <Tooltip
                        allowEscapeViewBox={{ x: true, y: true }} // Prevent tooltip clipping
                        content={({ active, payload, label }) => (
                            <MatchupTooltip
                                active={active}
                                payload={payload}
                                label={label}
                                selectedChampionName={championName}
                                tooltipType="counteredBy"
                                // *** Fetch specific matchup data (opponent's perspective) ***
                                matchupDetails={getOpponentMatchupDetails(payload?.[0]?.payload?.opponentName)}
                            />
                        )}
                        cursor={{ fill: "rgba(255, 128, 66, 0.1)" }}
                        position={{ y: 0 }} // Adjust position slightly if needed
                        isAnimationActive={false}
                      />
                      <Bar dataKey="value" fill={COUNTERED_BY_COLOR} name="Opponent Counter Rate" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  ) : (<div className="flex items-center justify-center h-full text-gray-500 italic text-center px-4">No significant counters found...</div>)}
                </ResponsiveContainer>
              </div>
               <div className="text-xs text-gray-400 mt-2 text-center px-2 italic">Champs often picked <span className="text-orange-400">after</span> {championName}. Bar = Opponent's Counter Pick %. Tooltip shows specific matchup WR.</div>
            </CardContent>
          </Card>

          {/* Strong Against (Uses specific matchup WR in tooltip) */}
          <Card className="bg-black/20 border border-red-800/30 shadow-lg text-white">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-red-400"><Sword className="h-5 w-5" /> Strong Against <span className="text-xs text-gray-400">({mainPosition.toUpperCase()})</span></CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {championsThisCounters.length > 0 ? (
                    <BarChart data={championsThisCounters} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                      <XAxis type="number" domain={[0, "auto"]} tick={{ fill: "#ccc", fontSize: 11 }} tickFormatter={(tick) => `${tick}%`} />
                      <YAxis dataKey="name" type="category" tick={{ fill: "#e0e0e0", fontSize: 12 }} width={80} interval={0} tickFormatter={(value) => (value.length > 10 ? `${value.substring(0, 9)}…` : value)} />
                      <Tooltip
                         allowEscapeViewBox={{ x: true, y: true }}
                         content={({ active, payload, label }) => (
                            <MatchupTooltip
                                active={active}
                                payload={payload}
                                label={label}
                                selectedChampionName={championName}
                                tooltipType="thisCounters"
                                // *** Fetch specific matchup data (selected champ's perspective) ***
                                matchupDetails={getMatchupDetails(payload?.[0]?.payload?.opponentName)}
                            />
                        )}
                        cursor={{ fill: "rgba(0, 196, 159, 0.1)" }}
                        position={{ y: 0 }}
                        isAnimationActive={false}
                      />
                      <Bar dataKey="value" fill={THIS_COUNTERS_COLOR} name="Target Blind Rate" barSize={20} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  ) : (<div className="flex items-center justify-center h-full text-gray-500 italic text-center px-4">No common blind pick targets found...</div>)}
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-gray-400 mt-2 text-center px-2 italic">Champs often picked <span className="text-teal-400">before</span> {championName}. Bar = Target's Blind Pick %. Tooltip shows specific matchup WR.</div>
            </CardContent>
          </Card>

          {/* Position Distribution (No changes needed) */}
          {positionData.length > 0 && (
            <Card className="bg-black/20 border border-red-800/30 shadow-lg text-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-400"><Award className="h-5 w-5" /> Position Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[230px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={positionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                      <XAxis dataKey="name" tick={{ fill: "#e0e0e0", fontSize: 12 }} tickFormatter={(label) => label.toUpperCase()} />
                      <YAxis tick={{ fill: "#ccc", fontSize: 11 }} />
                      <Tooltip
                        formatter={(value, name) => [`${Number(value).toLocaleString()} games`, name]}
                        labelFormatter={(label) => `Position: ${label.toUpperCase()}`}
                        contentStyle={{ backgroundColor: "rgba(10,0,0,0.9)", border: "1px solid #660000", fontSize: "12px", borderRadius: '6px' }}
                        itemStyle={{ color: "#eee" }}
                        labelStyle={{ color: "white" }}
                        cursor={{ fill: "rgba(255, 255, 255, 0.1)" }}
                         position={{ y: 0 }}
                         isAnimationActive={false}
                      />
                      <Bar dataKey="value" fill="#0088FE" name="Games Played" barSize={35} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Common Pairings (Uses specific pairing WR in tooltip) */}
           {pairingData.length > 0 && (
            <Card className="bg-black/20 border border-red-800/30 shadow-lg text-white">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-400"><Users className="h-5 w-5" /> Common Pairings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[230px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    {/* Bar chart shows games played together */}
                    <BarChart data={pairingData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                      <XAxis type="number" domain={[0, "auto"]} tick={{ fill: "#ccc", fontSize: 11 }} tickFormatter={(tick) => tick.toLocaleString()} />
                      {/* *** YAxis dataKey MUST be 'name' for the labels *** */}
                      <YAxis dataKey="name" type="category" tick={{ fill: "#e0e0e0", fontSize: 12 }} width={80} interval={0} tickFormatter={(value) => (value.length > 10 ? `${value.substring(0, 9)}…` : value)} />
                      <Tooltip
                         allowEscapeViewBox={{ x: true, y: true }}
                        content={({ active, payload, label }) => (
                            <PairingTooltip
                                active={active}
                                payload={payload}
                                label={label}
                                selectedChampionName={championName}
                                // *** Fetch specific synergy details ***
                                synergyDetails={getSynergyDetails(payload?.[0]?.payload?.allyName)}
                             />
                         )}
                        cursor={{ fill: "rgba(136, 132, 216, 0.1)" }}
                        position={{ y: 0 }}
                        isAnimationActive={false}
                      />
                      {/* Bar dataKey is 'count' (games together) */}
                      <Bar dataKey="count" name="Games Together" barSize={18} radius={[0, 4, 4, 0]}>
                        {pairingData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PAIRING_COLORS[index % PAIRING_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                 <div className="text-xs text-gray-400 mt-2 text-center px-2 italic">Top allies by games played. Tooltip shows specific synergy WR & Pick %.</div>
              </CardContent>
            </Card>
          )}

          {/* Fill empty grid cells if one of the bottom two cards is missing */}
          { positionData.length === 0 && pairingData.length > 0 && <div className="hidden lg:block"></div> }
          { pairingData.length === 0 && positionData.length > 0 && <div className="hidden lg:block"></div> }


        </div>
      </DialogContent>
    </Dialog>
  )
}
