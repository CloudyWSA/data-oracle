"use client"

import { useMemo } from "react"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts"
import { Badge } from "@/components/ui/badge"
import ChampionImage from "./champion-image"
import { Shield, Sword, Target, Award, Activity, Users } from "lucide-react" // Added Users icon

interface ChampionDashboardProps {
  champion: any // Includes pairings: { name: string, count: number }[]
  isOpen: boolean
  onClose: () => void
  allChampions: any[] // All calculated champion stats from ChampionStats
}

// Updated Tooltip for Counter Charts
const CustomBarTooltip = ({ active, payload, label, selectedChampionName, tooltipType, champion }: any) => {
    // Need champion prop passed for the "thisCounters" context
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Data for the hovered bar (opponent champion)
      const barValue = payload[0].value; // The value shown on the bar

      return (
        <div className="bg-black p-2 rounded border border-white/20 bg-opacity-90 text-sm shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ChampionImage championName={data.name} size={24} />
            <span className="text-white font-medium">{data.name}</span> {/* Opponent Name */}
          </div>
          <div className="text-white/90 space-y-0.5">
            {/* Opponent's Win Rate */}
            <div>{data.name}'s Win Rate: <span className="font-bold">{data.winRate?.toFixed(1)}%</span></div>

            {/* Bar Value Explanation based on type */}
            {tooltipType === 'counteredBy' && (
                 <div>{data.name}'s Counter Rate: <span className="font-bold">{barValue?.toFixed(1)}%</span></div>
            )}
            {tooltipType === 'thisCounters' && (
                 <div>{data.name}'s Blind Rate: <span className="font-bold">{barValue?.toFixed(1)}%</span></div> // Updated label
            )}

             {/* Add selected champion's counter rate in the "This Counters" tooltip for context */}
             {tooltipType === 'thisCounters' && champion?.counterPickRateFormatted && (
                <div className="pt-1 mt-1 border-t border-white/10">{selectedChampionName}'s Counter Rate: <span className="font-bold">{parseFloat(champion.counterPickRateFormatted).toFixed(1)}%</span></div>
             )}
          </div>
        </div>
      );
    }
    return null;
};

// Tooltip for Pairings Chart
const CustomPairingTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Data for the hovered bar (paired champion)
      return (
        <div className="bg-black p-2 rounded border border-white/20 bg-opacity-90 text-sm shadow-lg">
          <div className="flex items-center gap-2 mb-1">
            <ChampionImage championName={data.name} size={24} />
            <span className="text-white font-medium">{data.name}</span>
          </div>
          <div className="text-white/90">
            Games Together: <span className="font-bold">{data.count?.toLocaleString()}</span>
          </div>
        </div>
      );
    }
    return null;
};

export default function ChampionDashboard({ champion, isOpen, onClose, allChampions }: ChampionDashboardProps) {
  // Early return if no champion data or required fields
  if (!champion || !champion.mainPosition) return null;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];
  const PAIRING_COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff8042", "#8dd1e1", "#a4de6c", "#d0ed57"]; // Different colors for pairings

  // --- Countered By Logic ---
  const countersToThisChampion = useMemo(() => {
    if (!allChampions || !champion || !champion.mainPosition) return [];
    return allChampions
      .filter((c) =>
        c.name !== champion.name &&
        c.mainPosition === champion.mainPosition &&
        c.picks >= 3 &&
        c.counterPickRate > 0
      )
      .sort((a, b) => b.counterPickRate - a.counterPickRate)
      .slice(0, 5)
      .map((c) => ({
        name: c.name,
        value: parseFloat(c.counterPickRateFormatted),
        winRate: parseFloat(c.winRateFormatted),
      }));
  }, [champion, allChampions]);

  // --- This Counters Logic (Updated) ---
  const championsThisCounters = useMemo(() => {
    if (!allChampions || !champion || !champion.mainPosition) return [];
    return allChampions
      .filter((c) =>
        c.name !== champion.name &&
        c.mainPosition === champion.mainPosition &&
        c.picks >= 3 &&
        c.blindPickRate > 0
      )
      .sort((a, b) => b.blindPickRate - a.blindPickRate)
      .slice(0, 5)
      .map((c) => ({
        name: c.name, // Opponent's name
        value: parseFloat(c.blindPickRateFormatted), // Use opponent's blind rate for bar value
        winRate: parseFloat(c.winRateFormatted), // Opponent's win rate
      }));
  }, [champion, allChampions]);


  // --- Pairings Data ---
  const pairingData = useMemo(() => {
     if (!champion || !Array.isArray(champion.pairings) || champion.pairings.length === 0) {
         return [];
     }
     // Take top 5 pairings for the chart
     return champion.pairings.slice(0, 5);
  }, [champion]);

  // --- Position Distribution Data ---
  const positionData = useMemo(() => {
    if (!champion || !champion.positions) return []
    return Object.entries(champion.positions)
      .map(([name, value]: [string, any]) => ({ name, value: value as number }))
      .filter(p => STANDARD_POSITIONS.includes(p.name)) // Filter for standard positions if needed
      .sort((a, b) => b.value - a.value);
  }, [champion]);

  // --- Performance Data ---
  const performanceData = useMemo(() => {
    if (!champion) return []
    // Ensure values are numbers and handle potential NaN/Infinity
    const safeParse = (val: any) => { const num = parseFloat(val); return isNaN(num) ? 0 : num; };
    const kdaVal = safeParse(champion.kdaFormatted);
    const kdaScore = isFinite(kdaVal) ? Math.min(kdaVal * 15, 100) : 100; // Cap KDA score

    return [
      { subject: "Win Rate", A: safeParse(champion.winRateFormatted), fullMark: 100 },
      { subject: "KDA", A: kdaScore, fullMark: 100 },
      { subject: "Pick Rate", A: safeParse(champion.pickRateFormatted), fullMark: 100 },
      { subject: "Dmg Share", A: safeParse(champion.avgDamageShareFormatted), fullMark: 100 },
      { subject: "Gold Share", A: safeParse(champion.avgGoldShareFormatted), fullMark: 100 },
    ]
  }, [champion]);

  // --- Draft Strategy Data ---
  const draftData = useMemo(() => {
    if (!champion) return []
    const blind = parseFloat(champion.blindPickRateFormatted);
    const counter = parseFloat(champion.counterPickRateFormatted);
    return [
      { name: "Blind Pick", value: isNaN(blind) ? 0 : blind },
      { name: "Counter Pick", value: isNaN(counter) ? 0 : counter },
    ].filter(d => d.value >= 0); // Ensure value is valid number >= 0
  }, [champion]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl bg-vasco-black text-white border-vasco-black/20 overflow-y-auto max-h-[90vh]"> {/* Increased max-width */}
        {/* Header */}
        <DialogHeader>
           <div className="flex items-start sm:items-center gap-3 text-2xl mb-4 flex-col sm:flex-row">
            <div className="flex-shrink-0">
              <ChampionImage championName={champion.name} size={60} />
            </div>
            <div className="flex-grow">
              <h2 className="text-2xl font-bold text-red-500">{champion.name}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {/* Badges - Ensure text/borders are light */}
                <Badge variant="outline" className="bg-gray-700/50 text-white border-gray-600/80">{champion.mainPosition.toUpperCase()}</Badge>
                <Badge variant="outline" className={`${parseFloat(champion.winRateFormatted) > 50 ? "bg-green-900/50 border-green-600/60" : "bg-red-900/50 border-red-600/60"} text-white`}>{champion.winRateFormatted}% WR</Badge>
                <Badge variant="outline" className="bg-gray-700/50 text-white border-gray-600/80">{champion.blindPickRateFormatted}% Blind</Badge>
                <Badge variant="outline" className="bg-gray-700/50 text-white border-gray-600/80">{champion.counterPickRateFormatted}% Counter</Badge>
                <Badge variant="outline" className="bg-blue-900/50 text-white border-blue-600/60">{champion.picks.toLocaleString()} Picks</Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Grid - Now potentially 3 rows of 2 cols */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Row 1: Performance & Draft */}
          {/* Performance Stats (Radar) */}
          <Card className="bg-gray-800/40 border-gray-700/50">
             <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-400"><Activity className="h-5 w-5 text-red-400"/> Performance Stats</CardTitle></CardHeader>
             <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={performanceData}>
                            <PolarGrid stroke="#555" />
                            <PolarAngleAxis dataKey="subject" tick={{ fill: "#e0e0e0", fontSize: 12 }} />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: "#aaa", fontSize: 10 }} />
                            <Radar name={champion.name} dataKey="A" stroke="#CC0000" fill="#CC0000" fillOpacity={0.6}/>
                            <Legend wrapperStyle={{ color: '#e0e0e0', paddingTop: '10px' }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid #444', color: 'white', fontSize: '12px' }} itemStyle={{ color: '#eee' }} labelStyle={{ color: 'white', fontWeight: 'bold' }} formatter={(value, name, props) => [`${Number(value).toFixed(1)}`, props.payload.subject]}/>
                        </RadarChart>
                    </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                      <span className="text-sm text-gray-300">KDA</span>
                      <span className="text-xl font-bold text-white">{champion.kdaFormatted}</span>
                      <span className="text-xs text-gray-400">{champion.avgKillsFormatted}/{champion.avgDeathsFormatted}/{champion.avgAssistsFormatted}</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                      <span className="text-sm text-gray-300">Damage Share</span>
                      <span className="text-xl font-bold text-white">{champion.avgDamageShareFormatted}%</span>
                    </div>
                </div>
             </CardContent>
          </Card>

          {/* Draft Strategy (Pie) */}
          <Card className="bg-gray-800/40 border-gray-700/50">
             <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-400"><Target className="h-5 w-5 text-red-400"/> Draft Strategy</CardTitle></CardHeader>
             <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {(draftData.length > 0 && draftData.reduce((sum, d) => sum + d.value, 0) > 0.1) ? ( // Check sum > threshold
                            <PieChart>
                                <Pie data={draftData} cx="50%" cy="50%" labelLine={false} outerRadius={80} fill="#8884d8" dataKey="value" label={({ name, percent }) => percent > 0.02 ? `${(percent * 100).toFixed(0)}%` : ''} /* label fill needs to be white */ fillText="white" stroke="#333">
                                    {draftData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${Number(value).toFixed(1)}%`, undefined]} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid #444', fontSize: '12px' }} itemStyle={{ color: '#eee' }} labelStyle={{ color: 'white' }} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
                                <Legend wrapperStyle={{ color: '#e0e0e0', paddingTop: '10px' }} />
                            </PieChart>
                        ) : ( <div className="flex items-center justify-center h-full text-gray-400">No draft data available</div> )}
                    </ResponsiveContainer>
                </div>
                 <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                      <span className="text-sm text-gray-300">Blind Pick Rate</span>
                      <span className="text-xl font-bold text-white">{champion.blindPickRateFormatted}%</span>
                    </div>
                    <div className="flex flex-col items-center justify-center p-3 bg-gray-700/30 rounded-lg border border-gray-600/50">
                      <span className="text-sm text-gray-300">Counter Pick Rate</span>
                      <span className="text-xl font-bold text-white">{champion.counterPickRateFormatted}%</span>
                    </div>
                 </div>
             </CardContent>
          </Card>

          {/* Row 2: Counters */}
          {/* Countered By */}
          <Card className="bg-gray-800/40 border-gray-700/50">
             <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-400"><Shield className="h-5 w-5 text-red-400"/> Countered By ({champion.mainPosition.toUpperCase()})</CardTitle></CardHeader>
             <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       {countersToThisChampion.length > 0 ? (
                          <BarChart data={countersToThisChampion} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                            <XAxis type="number" domain={[0, 'auto']} tick={{ fill: "#ccc", fontSize: 11 }} tickFormatter={(tick) => `${tick}%`} unit="%"/>
                            <YAxis dataKey="name" type="category" tick={{ fill: "#e0e0e0", fontSize: 12 }} width={80} interval={0} tickFormatter={(value) => (value.length > 10 ? `${value.substring(0, 9)}…` : value)}/>
                            <Tooltip content={<CustomBarTooltip selectedChampionName={champion.name} tooltipType="counteredBy" champion={champion}/>} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
                            <Bar dataKey="value" fill="#FF8042" name="Opponent Counter Rate" barSize={20} radius={[0, 4, 4, 0]}/>
                          </BarChart>
                        ) : ( <div className="flex items-center justify-center h-full text-gray-400 text-center px-4">No common counters found...</div> )}
                    </ResponsiveContainer>
                </div>
                <div className="text-sm text-gray-300 mt-2 text-center px-2">
                    Champions in the same role often picked after {champion.name} (Sorted by their Counter Pick Rate).
                </div>
             </CardContent>
          </Card>

          {/* This Counters (Updated Name & Logic) */}
          <Card className="bg-gray-800/40 border-gray-700/50">
             <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-400"><Sword className="h-5 w-5 text-red-400"/> This Counters ({champion.mainPosition.toUpperCase()})</CardTitle></CardHeader>
             <CardContent>
                <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                       {championsThisCounters.length > 0 ? (
                        <BarChart data={championsThisCounters} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                          <XAxis type="number" domain={[0, 'auto']} tick={{ fill: "#ccc", fontSize: 11 }} tickFormatter={(tick) => `${tick}%`} unit="%"/>
                          <YAxis dataKey="name" type="category" tick={{ fill: "#e0e0e0", fontSize: 12 }} width={80} interval={0} tickFormatter={(value) => (value.length > 10 ? `${value.substring(0, 9)}…` : value)}/>
                          <Tooltip content={<CustomBarTooltip selectedChampionName={champion.name} tooltipType="thisCounters" champion={champion}/>} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
                          <Bar dataKey="value" fill="#00C49F" name="Opponent Blind Rate" barSize={20} radius={[0, 4, 4, 0]}/>
                        </BarChart>
                      ) : ( <div className="flex items-center justify-center h-full text-gray-400 text-center px-4">No common blind pick targets found...</div> )}
                    </ResponsiveContainer>
                </div>
                <div className="text-sm text-gray-300 mt-2 text-center px-2">
                   Champions in the same role often picked blind (Sorted by their Blind Pick Rate). Bar shows opponent's Blind Rate.
                </div>
             </CardContent>
          </Card>

          {/* Row 3: Distribution & Pairings */}
          {/* Position Distribution */}
          {positionData.length > 0 && (
            <Card className="bg-gray-800/40 border-gray-700/50"> {/* Takes half width now */}
              <CardHeader><CardTitle className="text-lg flex items-center gap-2 text-red-400"><Award className="h-5 w-5 text-red-400"/> Position Distribution</CardTitle></CardHeader>
              <CardContent>
                 <div className="h-[200px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={positionData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                      <XAxis dataKey="name" tick={{ fill: "#e0e0e0", fontSize: 12 }} tickFormatter={(label) => label.toUpperCase()}/>
                      <YAxis tick={{ fill: "#ccc", fontSize: 11 }} />
                      <Tooltip formatter={(value) => [`${value.toLocaleString()} games`, undefined]} labelFormatter={(label) => `Position: ${label.toUpperCase()}`} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid #444', fontSize: '12px' }} itemStyle={{ color: '#eee' }} labelStyle={{ color: 'white' }} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
                      <Bar dataKey="value" fill="#0088FE" name="Games Played" barSize={30} radius={[4, 4, 0, 0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                 </div>
              </CardContent>
            </Card>
          )}

          {/* Common Pairings (NEW) */}
          {pairingData.length > 0 && (
            <Card className="bg-gray-800/40 border-gray-700/50">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-red-400">
                  <Users className="h-5 w-5 text-red-400" /> Common Pairings
                </CardTitle>
              </CardHeader>
              <CardContent>
                 <div className="h-[200px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                     <BarChart data={pairingData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                       <CartesianGrid strokeDasharray="3 3" stroke="#555" />
                       <XAxis type="number" domain={[0, 'auto']} tick={{ fill: "#ccc", fontSize: 11 }} />
                       <YAxis dataKey="name" type="category" tick={{ fill: "#e0e0e0", fontSize: 12 }} width={80} interval={0} tickFormatter={(value) => (value.length > 10 ? `${value.substring(0, 9)}…` : value)}/>
                       <Tooltip content={<CustomPairingTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}/>
                       <Bar dataKey="count" name="Games Together" barSize={15} radius={[0, 4, 4, 0]}>
                          {pairingData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={PAIRING_COLORS[index % PAIRING_COLORS.length]} /> ))}
                       </Bar>
                     </BarChart>
                   </ResponsiveContainer>
                 </div>
                 <div className="text-sm text-gray-300 mt-2 text-center px-2">
                     Champions most frequently played on the same team as {champion.name}.
                 </div>
              </CardContent>
            </Card>
          )}
          {/* Fill empty grid cell if one chart exists but not the other */}
           {(positionData.length === 0 && pairingData.length > 0 || positionData.length > 0 && pairingData.length === 0 ) && <div />}


        </div>
      </DialogContent>
    </Dialog>
  )
}

// Helper constant needed in ChampionDashboard
const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"];