// src/components/champion-stats.tsx
"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { Search, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import ChampionImage from "./champion-image"
import ChampionDashboard from "./champion-dashboard"
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ChampionStatsProps {
  data: { // Contains unique values etc needed for filters
    uniqueValues: {
        champions: string[];
        patches: string[];
        leagues: string[];
        // Add others if needed by filters
    }
    // Include playerData/teamData if filters *directly* need them,
    // otherwise they are processed into allCalculatedStats
  };
  allCalculatedStats: ChampionStat[]; // Receive pre-calculated stats
  searchQuery: string;
}

// Helper to get global pick order (1-10) - NO LONGER NEEDED HERE
// const getGlobalPickOrder = (...)

const STANDARD_POSITIONS = ["top", "jng", "mid", "bot", "sup"];

export default function ChampionStats({ data, allCalculatedStats, searchQuery }: ChampionStatsProps) {
  const [sortBy, setSortBy] = useState("pickRate")
  const [filterPosition, setFilterPosition] = useState("all")
  const [filterPatch, setFilterPatch] = useState("all") // Keep patch filter UI, but calculation is done before this component
  const [filterLeague, setFilterLeague] = useState("all") // Keep league filter UI
  const [showTopLeagues, setShowTopLeagues] = useState(false) // Keep top league UI
  const [search, setSearchQuery] = useState(searchQuery)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [selectedChampion, setSelectedChampion] = useState<ChampionStat | null>(null) // Use ChampionStat type

  const topLeagues = useMemo(() => ["LCK", "LPL", "LEC", "LTA"], []); // Keep this for the UI filter toggle

  // REMOVED: The large useMemo hook calculating 'calculatedStats' is GONE.

  // --- Filtering & Sorting based on PROPS and local UI state ---
  const filteredAndSortedChampions = useMemo(() => {
    // Start with the pre-calculated stats passed as props
    let filtered = allCalculatedStats;

    // Apply UI filters (Position and Search)
    // Note: Patch and League filters are primarily handled *before* this point during the main calculation
    // If you *need* to re-filter by patch/league here based on UI selection AFTER initial calc,
    // you'd need the raw data rows associated with each stat or re-run parts of the calc.
    // For simplicity, we assume the main calculation in Dashboard handles the dataset scope.
    // Filters here primarily affect display.

    if (filterPosition !== "all") {
        // Filter based on the 'mainPosition' calculated earlier
        filtered = filtered.filter((champion) => champion.mainPosition === filterPosition);
    }
    if (search) {
        filtered = filtered.filter((champion) => champion.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Apply Sorting
    return [...filtered].sort((a: ChampionStat, b: ChampionStat) => { // Use ChampionStat type
        switch (sortBy) {
          case "pickRate": return b.pickRate - a.pickRate;
          case "winRate": return b.winRate - a.winRate;
          case "kda":
             // Handle 'Perfect' KDA
             const kdaA = a.kda === 'Perfect' ? Infinity : (a.kda || 0);
             const kdaB = b.kda === 'Perfect' ? Infinity : (b.kda || 0);
             return kdaB - kdaA;
          case "blindPickRate": return b.blindPickRate - a.blindPickRate;
          case "counterPickRate": return b.counterPickRate - a.counterPickRate;
          case "picks": return b.picks - a.picks; // Add sort by picks if needed
          default: return b.pickRate - a.pickRate; // Default sort
        }
      });
  }, [allCalculatedStats, search, filterPosition, sortBy]); // Dependencies: pre-calculated stats + UI filters

  // Top champions for charts (derived from filtered/sorted)
  const topChampionsForChart = useMemo(() => filteredAndSortedChampions.slice(0, 10), [filteredAndSortedChampions]);

  // Position distribution data (derived from filtered/sorted - reflects current filters)
  const positionData = useMemo(() => {
    const positions: Record<string, number> = {};
     // Use filteredAndSortedChampions to reflect current UI filters in this chart
    filteredAndSortedChampions.forEach((champion: ChampionStat) => {
       // Use the pre-calculated positions object for each champion
       if (champion.positions) {
            Object.entries(champion.positions).forEach(([position, count]: [string, any]) => {
                if (STANDARD_POSITIONS.includes(position)) {
                    positions[position] = (positions[position] || 0) + count;
                }
            });
       }
    });
    return Object.entries(positions).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredAndSortedChampions]); // Depends on the filtered list

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

  // Pagination Logic (operates on filtered/sorted)
  const totalFilteredChampions = filteredAndSortedChampions.length;
  const paginatedChampions = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredAndSortedChampions.slice(start, start + rowsPerPage);
  }, [filteredAndSortedChampions, page, rowsPerPage]);

  // --- UI Rendering ---
  return (
     <div className="space-y-6">
       {/* Champion Dashboard Modal */}
       <ChampionDashboard
         champion={selectedChampion}
         isOpen={!!selectedChampion}
         onClose={() => setSelectedChampion(null)}
         allChampions={allCalculatedStats} // Pass the full calculated stats for context in modal
       />

       {/* Filters Section - Keep UI, but understand calculation happens mostly in Dashboard */}
       <div className="flex flex-col md:flex-row gap-4 justify-between items-start">
         {/* Left Filters */}
          <div className="flex flex-wrap gap-2">
             <div className="relative flex-shrink-0 w-full sm:w-48 md:w-64">
               <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
               <Input
                 placeholder="Search champions..."
                 className="pl-10 bg-white border-gray-300 text-black h-10 focus:ring-vasco-red focus:border-vasco-red"
                 value={search}
                 onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }} // Resets page on search
               />
             </div>
             {/* Position Filter */}
             <Select value={filterPosition} onValueChange={(value) => { setFilterPosition(value); setPage(0); }}>
               <SelectTrigger className="flex-shrink-0 w-full sm:w-32 md:w-40 bg-white border-gray-300 text-black h-10">
                 <SelectValue placeholder="Position" />
               </SelectTrigger>
               <SelectContent className="bg-white border-gray-300 text-black">
                 <SelectItem value="all">All Positions</SelectItem>
                 {STANDARD_POSITIONS.map(pos => (
                     <SelectItem key={pos} value={pos}>{pos.charAt(0).toUpperCase() + pos.slice(1)}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
             {/* Patch Filter (UI only, filtering logic primarily in Dashboard) */}
             <Select value={filterPatch} onValueChange={(value) => { setFilterPatch(value); /* setPage(0); - Optional: Recalc needed if filtering here */ }}>
               <SelectTrigger className="flex-shrink-0 w-full sm:w-32 md:w-40 bg-white border-gray-300 text-black h-10" title="Patch filter primarily affects initial data scope">
                 <SelectValue placeholder="Patch" />
               </SelectTrigger>
               <SelectContent className="bg-white border-gray-300 text-black max-h-60 overflow-y-auto">
                 <SelectItem value="all">All Patches</SelectItem>
                 {/* Use uniqueValues from props */}
                 {data.uniqueValues.patches.map((patch: string, index: number) => (
                   <SelectItem key={index} value={String(patch)}>{patch}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
              {/* League Filter (UI only, filtering logic primarily in Dashboard) */}
             <Select value={filterLeague} onValueChange={(value) => { setFilterLeague(value); /* setPage(0); - Optional */ }} disabled={showTopLeagues}>
               <SelectTrigger className="flex-shrink-0 w-full sm:w-32 md:w-40 bg-white border-gray-300 text-black h-10" disabled={showTopLeagues} title="League filter primarily affects initial data scope">
                 <SelectValue placeholder="League" />
               </SelectTrigger>
               <SelectContent className="bg-white border-gray-300 text-black max-h-60 overflow-y-auto">
                 <SelectItem value="all">All Leagues</SelectItem>
                 {data.uniqueValues.leagues.map((league: string, index: number) => (
                   <SelectItem key={index} value={league}>{league}</SelectItem>
                 ))}
               </SelectContent>
             </Select>
          </div>
          {/* Right Filters */}
          <div className="flex flex-wrap gap-2">
               {/* Top Leagues Toggle (UI only) */}
               <TooltipProvider>
                 <UITooltip>
                   <TooltipTrigger asChild>
                     <Button
                       variant="outline"
                       className={`h-10 ${ showTopLeagues ? "bg-red-600 hover:bg-red-700 text-white border-red-700" : "border-gray-400 text-gray-700 bg-white hover:bg-gray-100" }`}
                       onClick={() => { setShowTopLeagues(!showTopLeagues); setFilterLeague("all"); /* setPage(0); - Optional */ }}
                       title="Toggling this requires re-processing data (reload page or implement dynamic data fetching)"
                     >
                       <Filter className="h-4 w-4 mr-2" /> Top Leagues
                     </Button>
                   </TooltipTrigger>
                   <TooltipContent><p>Top league filter primarily affects initial data scope</p></TooltipContent>
                 </UITooltip>
               </TooltipProvider>
               {/* Sort By Filter */}
               <Select value={sortBy} onValueChange={(value) => { setSortBy(value); setPage(0); }}>
                 <SelectTrigger className="flex-shrink-0 w-full sm:w-32 md:w-40 bg-white border-gray-300 text-black h-10">
                   <SelectValue placeholder="Sort by" />
                 </SelectTrigger>
                 <SelectContent className="bg-white border-gray-300 text-black">
                   <SelectItem value="pickRate">Pick Rate</SelectItem>
                   <SelectItem value="winRate">Win Rate</SelectItem>
                   <SelectItem value="kda">KDA</SelectItem>
                   <SelectItem value="blindPickRate">Blind Pick %</SelectItem>
                   <SelectItem value="counterPickRate">Counter Pick %</SelectItem>
                   <SelectItem value="picks">Picks</SelectItem>
                 </SelectContent>
               </Select>
          </div>
       </div>

       {/* Charts Section (Now reflects filteredAndSortedChampions) */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <Card className="bg-white border-gray-200 shadow-sm">
           <CardHeader>
             <CardTitle className="text-gray-800">Champion Win Rates (Top {topChampionsForChart.length})</CardTitle>
             <CardDescription className="text-gray-600">Based on current filters. Sorted by: {sortBy}</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
               {topChampionsForChart.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                   {/* ... BarChart for Win Rate ... (remains the same) */}
                    <BarChart data={topChampionsForChart} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                     <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                     <XAxis dataKey="name" tick={{ fill: '#333', fontSize: 12 }} />
                     <YAxis tick={{ fill: '#555', fontSize: 11 }} label={{ value: "Win Rate (%)", angle: -90, position: "insideLeft", fill: '#555', fontSize: 12 }} domain={[0, 'auto']} tickFormatter={(tick) => `${tick}%`}/>
                     <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", color: "#333" }} itemStyle={{ color: "#333" }} formatter={(value) => [`${Number(value).toFixed(1)}%`, "Win Rate"]} labelFormatter={(label) => <span className="font-semibold text-gray-700">{label}</span>} cursor={{ fill: 'rgba(200, 200, 200, 0.3)' }}/>
                     <Bar dataKey="winRate" name="Win Rate" fill="#CC0000" radius={[4, 4, 0, 0]} maxBarSize={50}/>
                   </BarChart>
                 </ResponsiveContainer>
               ) : ( <div className="flex items-center justify-center h-full text-gray-500">No data for chart based on filters.</div> )}
             </div>
           </CardContent>
         </Card>
         <Card className="bg-white border-gray-200 shadow-sm">
           <CardHeader>
             <CardTitle className="text-gray-800">Position Pick Distribution</CardTitle>
             <CardDescription className="text-gray-600">Based on champions matching current filters</CardDescription>
           </CardHeader>
           <CardContent>
             <div className="h-80">
                {positionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                     {/* ... PieChart for Position ... (remains the same, uses updated positionData) */}
                    <PieChart>
                      <Pie data={positionData} cx="50%" cy="50%" labelLine={false} outerRadius={100} fill="#8884d8" dataKey="value" label={({ name, percent }) => `${name.toUpperCase()} ${(percent * 100).toFixed(1)}%`} >
                        {positionData.map((entry, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#fff", border: "1px solid #ccc", borderRadius: "4px", color: "#333" }} formatter={(value, name) => [value.toLocaleString(), name.toUpperCase()]} />
                    </PieChart>
                  </ResponsiveContainer>
                 ) : ( <div className="flex items-center justify-center h-full text-gray-500">No position data based on filters.</div> )}
             </div>
           </CardContent>
         </Card>
       </div>

       {/* Statistics Table Section (Uses paginatedChampions) */}
       <Card className="bg-white border-gray-200 shadow-sm">
         <CardHeader>
           <CardTitle className="text-gray-800">Champion Statistics</CardTitle>
           <CardDescription className="text-gray-600">Detailed metrics for champions matching filters</CardDescription>
         </CardHeader>
         <CardContent>
           <div className="overflow-x-auto">
             <Table>
               <TableHeader>
                 <TableRow className="bg-gray-100 border-b border-gray-300 text-gray-700 hover:bg-gray-200">
                   {/* ... TableHead ... (remains the same) */}
                   <TableHead className="w-[200px] text-left p-2">Champion</TableHead>
                   <TableHead className="text-left p-2">Role</TableHead>
                   <TableHead className="text-left p-2">Picks</TableHead>
                   <TableHead className="text-left p-2">Pick %</TableHead>
                   <TableHead className="text-left p-2">Win %</TableHead>
                   <TableHead className="text-left p-2">KDA</TableHead>
                   <TableHead className="text-left p-2">Avg K/D/A</TableHead>
                   <TableHead className="text-left p-2">Blind %</TableHead>
                   <TableHead className="text-left p-2">Counter %</TableHead>
                   <TableHead className="text-left p-2">Dmg %</TableHead>
                   <TableHead className="text-left p-2">Gold %</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {paginatedChampions.length > 0 ? (
                   paginatedChampions.map((champion: ChampionStat, index: number) => ( // Use ChampionStat type
                     <TableRow key={`${champion.name}-${index}`} className={`border-b border-gray-200 ${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 cursor-pointer`} onClick={() => setSelectedChampion(champion)}>
                        {/* Use formatted fields from ChampionStat */}
                       <TableCell className="font-medium p-2 text-gray-800">
                         <div className="flex items-center gap-2">
                           <ChampionImage championName={champion.name} size={32} />
                           <span>{champion.name}</span>
                         </div>
                       </TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.mainPosition.toUpperCase()}</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.picks.toLocaleString()}</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.pickRateFormatted}%</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.winRateFormatted}%</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.kdaFormatted}</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.avgKillsFormatted}/{champion.avgDeathsFormatted}/{champion.avgAssistsFormatted}</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.blindPickRateFormatted}%</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.counterPickRateFormatted}%</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.avgDamageShareFormatted}%</TableCell>
                       <TableCell className="p-2 text-gray-700">{champion.avgGoldShareFormatted}%</TableCell>
                     </TableRow>
                   ))
                 ) : (
                   <TableRow><TableCell colSpan={11} className="h-24 text-center text-gray-500">No champions found matching your filters.</TableCell></TableRow>
                 )}
               </TableBody>
             </Table>
           </div>

           {/* Pagination Controls */}
            {totalFilteredChampions > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  {/* ... Pagination UI ... (remains the same) */}
                  <div className="text-sm text-gray-600">
                    Showing {paginatedChampions.length > 0 ? (page * rowsPerPage + 1).toLocaleString() : 0}-
                    {Math.min(totalFilteredChampions, (page + 1) * rowsPerPage).toLocaleString()} of {totalFilteredChampions.toLocaleString()} champions
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50">Previous</Button>
                    <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={(page + 1) * rowsPerPage >= totalFilteredChampions} className="border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50">Next</Button>
                  </div>
                </div>
             )}
         </CardContent>
       </Card>
     </div>
   )
}