"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Bug, Database } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import FileUploader from "@/components/file-uploader"
import Dashboard from "@/components/dashboard"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

export default function Home() {
  const [data, setData] = useState<any[] | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugData, setDebugData] = useState<any | null>(null)
  const [showDebug, setShowDebug] = useState(false)
  const { toast } = useToast()

  const handleDataLoaded = (loadedData: any[]) => {
    try {
      if (!loadedData || loadedData.length === 0) {
        throw new Error("No data found in the uploaded file")
      }

      console.log("Data loaded:", loadedData.length, "rows")

      // Store debug data
      setDebugData({
        rowCount: loadedData.length,
        sampleRows: loadedData.slice(0, 3),
        keys: Object.keys(loadedData[0] || {}),
      })

      // Check if the data has the expected structure
      const requiredColumns = ["gameid", "participantid", "side", "result"]
      const playerRequiredColumns = ["playername", "champion", "position"]
      const teamRequiredColumns = ["teamname"]

      // Check if we have at least some of the required columns
      const sampleRow = loadedData[0]
      const keys = Object.keys(sampleRow).map((k) => k.toLowerCase())
      console.log("Available columns:", keys)

      const missingColumns = requiredColumns.filter((col) => !keys.some((key) => key === col.toLowerCase()))

      if (missingColumns.length > 0) {
        console.warn("Missing required columns:", missingColumns)
        throw new Error(
          `Missing required columns: ${missingColumns.join(", ")}. Please ensure your spreadsheet has the correct format.`,
        )
      }

      // Check if we have at least some player or team data
      const hasPlayerData = playerRequiredColumns.some((col) => keys.some((key) => key === col.toLowerCase()))
      console.log("Has player data:", hasPlayerData)

      const hasTeamData = teamRequiredColumns.some((col) => keys.some((key) => key === col.toLowerCase()))
      console.log("Has team data:", hasTeamData)

      if (!hasPlayerData && !hasTeamData) {
        throw new Error("The data doesn't contain player or team information. Please check your file format.")
      }

      setData(loadedData)
      setError(null)

      toast({
        title: "Data loaded successfully",
        description: `Processed ${loadedData.length} rows of data`,
      })
    } catch (err) {
      console.error("Error processing data:", err)
      setError(`Failed to process data: ${err instanceof Error ? err.message : "Unknown error"}`)
      setData(null)

      toast({
        variant: "destructive",
        title: "Error loading data",
        description: err instanceof Error ? err.message : "Unknown error occurred",
      })
    }
  }

  return (
    <div className="min-h-screen bg-vasco-white text-vasco-black">
      <header className="vasco-header py-6">
        <div className="container mx-auto relative z-10 flex items-center justify-center">
          <Database className="h-8 w-8 text-white mr-3" />
          <h1 className="text-4xl font-bold text-white">Data Oracle</h1>
        </div>
      </header>

      <main className="container mx-auto py-8 px-4">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              {debugData && (
                <Button
                  variant="link"
                  className="p-0 h-auto text-xs text-red-300 ml-2"
                  onClick={() => setShowDebug(!showDebug)}
                >
                  <Bug className="h-3 w-3 mr-1" />
                  {showDebug ? "Hide debug info" : "Show debug info"}
                </Button>
              )}
            </AlertDescription>

            {showDebug && debugData && (
              <Accordion type="single" collapsible className="w-full mt-4">
                <AccordionItem value="debug">
                  <AccordionTrigger className="text-sm">Debug Information</AccordionTrigger>
                  <AccordionContent>
                    <div className="text-xs font-mono bg-vasco-black text-white p-3 rounded overflow-auto max-h-60">
                      <div className="mb-2">Row count: {debugData.rowCount}</div>
                      <div className="mb-2">Available columns: {debugData.keys.join(", ")}</div>
                      <div className="mb-2">Sample rows:</div>
                      <pre>{JSON.stringify(debugData.sampleRows, null, 2)}</pre>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </Alert>
        )}

        {!data ? (
          <Card className="w-full max-w-3xl mx-auto vasco-card">
            <CardHeader className="border-b border-vasco-black/10">
              <CardTitle className="text-2xl text-center">Upload Your Data</CardTitle>
              <CardDescription className="text-center text-vasco-gray">
                Upload your spreadsheet to visualize and analyze your data
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <FileUploader onDataLoaded={handleDataLoaded} setIsLoading={setIsLoading} isLoading={isLoading} />
            </CardContent>
          </Card>
        ) : (
          <Dashboard data={data} />
        )}
      </main>

      <footer className="bg-vasco-black text-white py-4 mt-8">
        <div className="container mx-auto text-center">
          <p>© 2025 Data Oracle - Powered by CloudY</p>
        </div>
      </footer>
    </div>
  )
}
