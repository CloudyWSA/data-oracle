/**
 * Utility functions for interacting with Riot Games Data Dragon API
 */

// Cache for the latest version to avoid multiple fetches
let latestVersionCache: string | null = null

/**
 * Fetches the latest Data Dragon version
 */
export async function getLatestVersion(): Promise<string> {
  if (latestVersionCache) return latestVersionCache

  try {
    const response = await fetch("https://ddragon.leagueoflegends.com/api/versions.json")
    if (!response.ok) throw new Error("Failed to fetch versions")

    const versions = await response.json()
    latestVersionCache = versions[0] // First version is the latest
    return latestVersionCache
  } catch (error) {
    console.error("Error fetching Data Dragon version:", error)
    return "13.10.1" // Fallback to a recent version if fetch fails
  }
}

/**
 * Gets the champion image URL
 */
export async function getChampionImageUrl(championName: string): Promise<string> {
  const version = await getLatestVersion()

  // Format champion name for URL (remove spaces, special characters)
  const formattedName = formatChampionName(championName)

  return `https://ddragon.leagueoflegends.com/cdn/${version}/img/champion/${formattedName}.png`
}

/**
 * Formats champion name for Data Dragon URLs
 */
function formatChampionName(name: string): string {
  // Handle special cases
  const specialCases: Record<string, string> = {
    Wukong: "MonkeyKing",
    "Nunu & Willump": "Nunu",
    "Renata Glasc": "Renata",
    "Bel'Vath": "Belveth",
    "K'Sante": "KSante",
    "Kai'Sa": "Kaisa",
    "Kha'Zix": "Khazix",
    "Rek'Sai": "RekSai",
    "Vel'Koz": "Velkoz",
    LeBlanc: "Leblanc",
    "Cho'Gath": "Chogath",
    "Kog'Maw": "KogMaw",
  }

  if (specialCases[name]) {
    return specialCases[name]
  }

  // Remove spaces and special characters
  return name.replace(/[^a-zA-Z0-9]/g, "")
}

/**
 * Gets champion data for all champions
 */
export async function getAllChampions(): Promise<any> {
  const version = await getLatestVersion()

  try {
    const response = await fetch(`https://ddragon.leagueoflegends.com/cdn/${version}/data/en_US/champion.json`)
    if (!response.ok) throw new Error("Failed to fetch champion data")

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error("Error fetching champion data:", error)
    return {}
  }
}
