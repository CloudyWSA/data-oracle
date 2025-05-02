"use client"

import type React from "react"

import { useState, useCallback, useRef, useEffect } from "react"
import { Upload, FileSpreadsheet, AlertCircle, Bug, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import Papa from "papaparse"

interface FileUploaderProps {
  onDataLoaded: (data: any[]) => void
  setIsLoading: (loading: boolean) => void
  isLoading: boolean
}

export default function FileUploader({ onDataLoaded, setIsLoading, isLoading }: FileUploaderProps) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [fileName, setFileName] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<string[]>([])
  const [showDebug, setShowDebug] = useState(false)
  const [rawFileContent, setRawFileContent] = useState<string | null>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const fileContentRef = useRef<string | null>(null)

  // Add debug info with timestamp
  const addDebugInfo = (message: string) => {
    const timestamp = new Date().toISOString()
    console.log(`[UPLOADER DEBUG] ${message}`) // Add prefix for clarity
    setDebugInfo((prev) => [...prev, `[${timestamp}] ${message}`])
  }

  // Clean up timeout on unmount
  const cleanupTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }

  useEffect(() => {
    return () => cleanupTimeout()
  }, [])

  // Function to download raw file content for debugging
  const downloadRawContent = () => {
    if (!rawFileContent) return
    const blob = new Blob([rawFileContent], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "raw-file-content.txt"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Process CSV with detailed logging - ENSURING ALL ROWS ARE PASSED
  const processCSV = useCallback(
    (file: File) => {
      addDebugInfo(`Starting CSV processing for file: ${file.name}`)
      setIsLoading(true); // Ensure loading state is set

      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (!content) {
            setError("Failed to read file content.");
            setIsLoading(false);
            addDebugInfo("FileReader error: content is null or undefined.");
            return;
        }
        fileContentRef.current = content
        setRawFileContent(content)
        addDebugInfo(`File read into memory (${content.length} characters).`)

        // Detect delimiter (as before)
        const possibleDelimiters = [",", ";", "\t", "|"]
        const firstLine = content.split("\n")[0] || '';
        const counts = possibleDelimiters.map((delimiter) => ({
             delimiter, count: firstLine.split(delimiter).length - 1
        }));
        const likelyDelimiter = counts.reduce((prev, current) => (current.count > prev.count ? current : prev), counts[0]).delimiter
        addDebugInfo(`Detected likely delimiter: "${likelyDelimiter === "\t" ? "tab" : likelyDelimiter}"`)

        addDebugInfo("Starting Papa Parse...")
        const parseStartTime = performance.now();

        const parseResult = Papa.parse(content, {
          header: true,
          dynamicTyping: true, // Keep dynamic typing for numbers etc.
          skipEmptyLines: 'greedy', // Skip lines that are truly empty or just whitespace
          delimiter: likelyDelimiter !== "," ? likelyDelimiter : undefined, // Use detected delimiter if not comma
          transformHeader: (header) => header.trim(), // Normalize headers
          complete: (results) => {
                const parseEndTime = performance.now();
                addDebugInfo(`Papa Parse complete in ${(parseEndTime - parseStartTime).toFixed(2)} ms.`);

                if (results.errors && results.errors.length > 0) {
                    addDebugInfo(`CSV parsing had ${results.errors.length} errors:`)
                    results.errors.slice(0, 5).forEach((error, i) => {
                        addDebugInfo(`   Error ${i + 1}: ${error.message} (row: ${error.row}, code: ${error.code})`)
                    })
                    // Don't necessarily stop for errors, some rows might still be valid
                }

                const parsedData = results.data as any[]; // Assume array of objects
                addDebugInfo(`Parsed ${parsedData.length} rows (including potentially invalid ones).`)
                if (results.meta.fields) {
                    addDebugInfo(`Columns found: ${results.meta.fields.join(", ")}`)
                }

                if (!parsedData || parsedData.length === 0) {
                    setError("Parsing resulted in zero data rows.")
                    setIsLoading(false)
                    addDebugInfo("Error: No data rows found after parsing.")
                    return
                }

                // **Crucial Step: Log samples including potential team rows**
                addDebugInfo(`Logging first 15 parsed rows (raw objects):`);
                for(let i = 0; i < Math.min(parsedData.length, 15); i++) {
                    console.log(`[UPLOADER RAW ROW ${i+1}]`, parsedData[i]); // Log the actual object
                }

                // **Minimal Validation: Check if essential IDs exist in at least one row**
                // This avoids stopping if the *first* row is missing something but others have it.
                const hasEssentialIds = parsedData.some(row => row && typeof row === 'object' && row.gameid && row.participantid);
                if (!hasEssentialIds) {
                     setError("Could not find essential 'gameid' and 'participantid' in any row. Check file structure.");
                     setIsLoading(false);
                     addDebugInfo("Error: Essential columns missing from all rows.");
                     return;
                }
                addDebugInfo("Essential IDs (gameid, participantid) found in at least one row.");

                // --- Pass ALL parsed data ---
                // No filtering based on playername or position here.
                // Let the ChampionStats component handle data interpretation.
                setProgress(100)
                addDebugInfo(`Validation passed. Preparing to call onDataLoaded with ${parsedData.length} rows.`);

                setTimeout(() => { // Short delay for UI update
                    try {
                        onDataLoaded(parsedData); // Pass the entire parsed data array
                        addDebugInfo(`onDataLoaded called successfully with ${parsedData.length} rows.`);
                    } catch (e) {
                        const errorMsg = e instanceof Error ? e.message : "Unknown error";
                        setError(`Error during data processing callback: ${errorMsg}`);
                        addDebugInfo(`Error in onDataLoaded callback: ${errorMsg}`);
                    } finally {
                        setIsLoading(false);
                    }
                }, 100); // Reduced delay
            },
            error: (error) => {
                const errorMsg = error instanceof Error ? error.message : "Unknown parsing error";
                setError(`CSV Parsing Failed: ${errorMsg}`);
                setIsLoading(false);
                addDebugInfo(`Papa Parse general error: ${errorMsg}`);
            }
        }); // End Papa.parse
      }; // End reader.onload

      reader.onerror = (errorEvent) => {
        setError("Error reading file");
        setIsLoading(false);
        addDebugInfo(`FileReader error event: ${JSON.stringify(errorEvent)}`);
      }

      reader.onprogress = (event) => {
           if (event.lengthComputable) {
              const currentProgress = Math.min(90, Math.round((event.loaded / event.total) * 90)); // Cap at 90 before parsing
              setProgress(currentProgress);
            }
      };

      reader.readAsText(file); // Read as text for PapaParse
    },
    [onDataLoaded, setIsLoading] // Removed addDebugInfo from deps, it's stable
  );

  // Process Excel - ENSURING ALL ROWS ARE PASSED
  const processExcel = useCallback(
    (file: File) => {
      addDebugInfo("Processing as Excel file")
      setIsLoading(true); // Ensure loading state is set

      import("xlsx")
        .then((XLSX) => {
          addDebugInfo("XLSX library loaded.")
          const reader = new FileReader()

          reader.onprogress = (event) => {
            if (event.lengthComputable) {
              const progress = Math.min(90, Math.round((event.loaded / event.total) * 90)); // Cap at 90 before parsing
              setProgress(progress);
            }
          };

          reader.onload = (e) => {
            cleanupTimeout(); // Clear timeout as loading finished
            try {
              addDebugInfo("Excel file loaded into memory, starting parsing...");
              const data = e.target?.result;
              if (!data) {
                  throw new Error("FileReader result is empty.");
              }

              const workbook = XLSX.read(data, { type: "array" }); // Use array type
              addDebugInfo(`Excel parsed. Found ${workbook.SheetNames.length} sheets: ${workbook.SheetNames.join(", ")}`);

              if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                throw new Error("No sheets found in Excel file")
              }

              let allData: any[] = [];
              let columnsDetected: string[] | null = null;

              workbook.SheetNames.forEach(sheetName => {
                  addDebugInfo(`Processing sheet: ${sheetName}`);
                  const worksheet = workbook.Sheets[sheetName];
                  // Convert sheet to JSON objects, attempt to infer headers
                  const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                      raw: false, // Process dates, etc.
                      defval: "", // Default value for empty cells
                      // header: 'A', // Use this if headers are bad, then map manually
                  });

                  if (jsonData && jsonData.length > 0) {
                      addDebugInfo(`   Found ${jsonData.length} rows in sheet '${sheetName}'.`);
                      // Log first few rows
                       if (jsonData.length > 0) {
                            console.log(`[UPLOADER EXCEL RAW ROW 1 (${sheetName})]`, jsonData[0]);
                            if (jsonData.length > 11) {
                                console.log(`[UPLOADER EXCEL RAW ROW 12 (${sheetName})]`, jsonData[11]); // Check near team data
                            }
                            if (!columnsDetected) { // Store columns from first sheet with data
                                columnsDetected = Object.keys(jsonData[0]);
                                addDebugInfo(`   Columns detected: ${columnsDetected.join(', ')}`);
                            }
                        }
                      allData = allData.concat(jsonData); // Add data from this sheet
                  } else {
                       addDebugInfo(`   Sheet '${sheetName}' appears empty or unparsable to JSON objects.`);
                  }
              }); // End forEach sheetName

              if (allData.length === 0) {
                throw new Error("No data rows could be extracted from any sheet.");
              }

               // **Minimal Validation: Check if essential IDs exist in at least one row**
               const hasEssentialIds = allData.some(row => row && typeof row === 'object' && row.gameid && row.participantid);
               if (!hasEssentialIds) {
                    setError("Could not find essential 'gameid' and 'participantid' in any row. Check file structure/headers.");
                    setIsLoading(false);
                    addDebugInfo("Error: Essential columns missing from all rows.");
                    return;
               }
               addDebugInfo("Essential IDs (gameid, participantid) found in at least one row.");


              // --- Pass ALL extracted data ---
              setProgress(100);
              addDebugInfo(`Excel processing complete. Total rows extracted: ${allData.length}. Preparing to call onDataLoaded.`);

              setTimeout(() => { // Short delay for UI update
                try {
                  onDataLoaded(allData); // Pass the entire extracted data array
                  addDebugInfo(`onDataLoaded called successfully with ${allData.length} rows.`);
                } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : "Unknown error";
                    setError(`Error during data processing callback: ${errorMsg}`);
                    addDebugInfo(`Error in onDataLoaded callback: ${errorMsg}`);
                } finally {
                    setIsLoading(false);
                }
              }, 100); // Reduced delay

            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : "Unknown error";
                setError(`Error parsing Excel file: ${errorMsg}`);
                setIsLoading(false);
                addDebugInfo(`Excel parsing error: ${errorMsg}`);
                if (error instanceof Error && error.stack) {
                    addDebugInfo(`Stack trace: ${error.stack}`);
                }
            }
          }; // End reader.onload

          reader.onerror = (errorEvent) => {
            cleanupTimeout();
            setError("Error reading file");
            setIsLoading(false);
            addDebugInfo(`FileReader error event: ${JSON.stringify(errorEvent)}`);
          };

          reader.readAsArrayBuffer(file); // Read as ArrayBuffer for XLSX
        })
        .catch((error) => {
          cleanupTimeout();
          const errorMsg = error instanceof Error ? error.message : "Unknown error";
          setError(`Error loading Excel parser library: ${errorMsg}`);
          setIsLoading(false);
          addDebugInfo(`Failed to load XLSX library: ${errorMsg}`);
        });
    },
    [onDataLoaded, setIsLoading] // Removed addDebugInfo from deps
  );

  // Main file processing function (mostly unchanged, calls new process functions)
  const processFile = useCallback(
    (file: File) => {
      // Reset state
      setIsLoading(true);
      setFileName(file.name);
      setError(null);
      setProgress(0);
      setDebugInfo([`Starting to process file: ${file.name} (${file.size} bytes, type: ${file.type})`]);
      setRawFileContent(null); // Reset raw content
      fileContentRef.current = null;


      cleanupTimeout();
      timeoutRef.current = setTimeout(() => {
        setError("Processing timed out (60s). File might be too large or complex.");
        setIsLoading(false);
        addDebugInfo("Processing timed out.");
      }, 60000);

      if (file.size > 100 * 1024 * 1024) { // 100MB
        cleanupTimeout();
        setError("File exceeds 100MB size limit.");
        setIsLoading(false);
        addDebugInfo("File too large.");
        return;
      }

      const isExcel = /\.(xlsx|xls)$/i.test(file.name) || file.type.includes('spreadsheetml') || file.type.includes('ms-excel');
      const isCsv = /\.(csv)$/i.test(file.name) || file.type.includes('csv');

      addDebugInfo(`File type detection: Excel=${isExcel}, CSV=${isCsv}, Name=${file.name}, MIME=${file.type}`);

      if (isCsv) { // Prioritize CSV if extension is .csv
        processCSV(file);
      } else if (isExcel) {
        processExcel(file);
      } else {
         // If type is ambiguous, try CSV first? Or rely on MIME type if available
         if (file.type.includes('csv')) {
              addDebugInfo("Ambiguous extension, but MIME type suggests CSV. Trying CSV parser.");
              processCSV(file);
         } else {
             cleanupTimeout();
             setError("Unsupported file type. Please upload CSV or Excel (xlsx/xls).");
             setIsLoading(false);
             addDebugInfo(`Unsupported file type: ${file.type || 'unknown'}`);
             return;
         }

      }
    },
    [processCSV, processExcel, setIsLoading] // Removed addDebugInfo from deps
  );

  // Drag and Drop / File Change handlers (unchanged)
   const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true)
    else if (e.type === "dragleave") setDragActive(false)
   }, [])

   const handleDrop = useCallback( (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0])
    }
   }, [processFile])

   const handleFileChange = useCallback( (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0])
       e.target.value = ''; // Reset input value to allow re-uploading the same file
    }
   }, [processFile])

    // Try Alternative CSV Parsing (Mostly unchanged, ensures it uses the stored raw content)
    const tryAlternativeCSVParsing = useCallback(() => {
        const content = fileContentRef.current;
        if (!content) {
            addDebugInfo("No raw file content available for alternative parsing.");
            setError("Cannot retry parsing: Raw file content not stored.");
            return;
        }

        addDebugInfo("Trying alternative CSV parsing delimiters [';', '\\t', '|']");
        setIsLoading(true);
        setError(null); // Clear previous error
        setProgress(0);

        const delimiters = [";", "\t", "|"];
        let success = false;

        for (const delimiter of delimiters) {
            addDebugInfo(`Attempting with delimiter: "${delimiter === '\t' ? '\\t' : delimiter}"`);
            try {
                const results = Papa.parse(content, {
                    header: true,
                    delimiter,
                    skipEmptyLines: 'greedy',
                    dynamicTyping: true,
                    complete: (res) => {
                        const data = res.data as any[];
                         addDebugInfo(`   Parsed ${data.length} rows with '${delimiter === '\t' ? '\\t' : delimiter}'.`);
                        if (data.length > 0 && res.meta.fields && res.meta.fields.length > 1) { // Check for >1 column as sign of success
                             addDebugInfo(`   Success with delimiter '${delimiter === '\t' ? '\\t' : delimiter}'! Found ${data.length} rows.`);
                             console.log("[UPLOADER ALT PARSE ROW 1]", data[0]);
                             if(data.length > 11) console.log("[UPLOADER ALT PARSE ROW 12]", data[11]);

                             const hasEssentialIds = data.some(row => row && typeof row === 'object' && row.gameid && row.participantid);
                             if(hasEssentialIds){
                                 addDebugInfo("   Essential IDs found. Calling onDataLoaded.");
                                 setProgress(100);
                                 setTimeout(() => {
                                     try {
                                         onDataLoaded(data);
                                         addDebugInfo("   onDataLoaded called successfully with alternative parse.");
                                     } catch(e) {
                                          const errorMsg = e instanceof Error ? e.message : "Unknown error";
                                          setError(`Error during data processing callback: ${errorMsg}`);
                                          addDebugInfo(`Error in onDataLoaded callback: ${errorMsg}`);
                                     } finally {
                                         setIsLoading(false);
                                     }
                                 }, 100);
                                 success = true; // Mark success
                             } else {
                                 addDebugInfo("   Essential IDs missing even with this delimiter.");
                             }

                        } else {
                             addDebugInfo(`   Delimiter '${delimiter === '\t' ? '\\t' : delimiter}' did not yield sufficient columns or rows.`);
                        }
                    },
                    error: (err) => {
                        addDebugInfo(`   Error parsing with delimiter '${delimiter === '\t' ? '\\t' : delimiter}': ${err.message}`);
                    }
                });
                if (success) break; // Stop trying if successful
            } catch (e) {
                addDebugInfo(`   Exception during parse attempt with '${delimiter === '\t' ? '\\t' : delimiter}': ${e instanceof Error ? e.message : "Unknown error"}`);
            }
        } // End for loop

        if (!success) {
            addDebugInfo("All alternative parsing attempts failed.");
            setError("Alternative parsing attempts failed. Check file format or download raw content for inspection.");
            setIsLoading(false); // Stop loading if all attempts failed
        }
    }, [onDataLoaded, setIsLoading]);


  // Sample Data Loader (unchanged)
  const loadSampleData = useCallback(() => {
    // ... (keep existing sample data generation logic) ...
        setIsLoading(true)
    setFileName("sample-data.csv")
    setError(null)
    setDebugInfo(["Loading sample data..."])

    // Sample data structure matching expected format
    const sampleData = [
      // Game 1 - Team Rows
      {
        gameid: "SAMPLE1", participantid: 100, side: "Blue", teamname: "Vasco da Gama", result: 1, kills: 15, deaths: 10, dragons: 3, barons: 1, towers: 8, inhibitors: 2, firstblood: 1, firstdragon: 1, firstbaron: 0, gamelength: 1800, league: "Brazilian Championship", patch: "14.1", date: "2025-01-01", goldat15: 25000, goldat20: 35000, goldat25: 45000,
        pick1: "Aatrox", pick2: "Ahri", pick3: "Jinx", pick4: "Lee Sin", pick5: "Thresh" // ADDED PICKS
      },
      {
        gameid: "SAMPLE1", participantid: 200, side: "Red", teamname: "Flamengo", result: 0, kills: 10, deaths: 15, dragons: 1, barons: 0, towers: 3, inhibitors: 0, firstblood: 0, firstdragon: 0, firstbaron: 0, gamelength: 1800, league: "Brazilian Championship", patch: "14.1", date: "2025-01-01", goldat15: 22000, goldat20: 30000, goldat25: 38000,
        pick1: "Darius", pick2: "Graves", pick3: "Ezreal", pick4: "Syndra", pick5: "Leona" // ADDED PICKS
      },
    ]

    // Game 1 - Player data
    const positions = ["top", "jng", "mid", "bot", "sup"]
    const blueChamps = ["Aatrox", "Lee Sin", "Ahri", "Jinx", "Thresh"]
    const redChamps = ["Darius", "Graves", "Syndra", "Ezreal", "Leona"]

    for (let i = 1; i <= 5; i++) {
      sampleData.push({
        gameid: "SAMPLE1", participantid: i, side: "Blue", position: positions[i - 1], playername: `Vasco Player ${i}`, teamname: "Vasco da Gama", champion: blueChamps[i - 1], result: 1, kills: Math.floor(Math.random() * 8), deaths: Math.floor(Math.random() * 5), assists: Math.floor(Math.random() * 10), damageshare: (20 + Math.floor(Math.random() * 10))/100, earnedgoldshare: (20 + Math.floor(Math.random() * 10))/100, cspm: 7 + Math.random() * 3, vspm: 1 + Math.random() * 1.5, dpm: 400 + Math.floor(Math.random() * 300),
      })
    }
    for (let i = 6; i <= 10; i++) {
      sampleData.push({
        gameid: "SAMPLE1", participantid: i, side: "Red", position: positions[i - 6], playername: `Flamengo Player ${i - 5}`, teamname: "Flamengo", champion: redChamps[i - 6], result: 0, kills: Math.floor(Math.random() * 6), deaths: Math.floor(Math.random() * 7), assists: Math.floor(Math.random() * 10), damageshare: (20 + Math.floor(Math.random() * 10))/100, earnedgoldshare: (20 + Math.floor(Math.random() * 10))/100, cspm: 6 + Math.random() * 3, vspm: 1 + Math.random() * 1.5, dpm: 350 + Math.floor(Math.random() * 300),
      })
    }

    // Game 2 (minimal, just to show structure)
    const game2Id = "SAMPLE2"
    const game2Date = "2025-01-02"
    const game2BlueChamps = ["Gnar", "Maokai", "Hwei", "Jinx", "Leona"];
    const game2RedChamps = ["Renekton", "Ivern", "Orianna", "Varus", "Braum"];
    sampleData.push({ gameid: game2Id, participantid: 100, side: "Blue", teamname: "Vasco da Gama", result: 0, league: "Brazilian Championship", patch: "14.1", date: game2Date, pick1: "Gnar", pick2: "Hwei", pick3: "Jinx", pick4: "Maokai", pick5:"Leona"});
    sampleData.push({ gameid: game2Id, participantid: 200, side: "Red", teamname: "Flamengo", result: 1, league: "Brazilian Championship", patch: "14.1", date: game2Date, pick1: "Renekton", pick2:"Ivern", pick3:"Varus", pick4:"Orianna", pick5:"Braum" });
    for(let i=1; i<=5; i++) sampleData.push({ gameid: game2Id, participantid: i, side: "Blue", position: positions[i-1], playername: `Vasco Player ${i}`, champion: game2BlueChamps[i-1], result: 0})
    for(let i=6; i<=10; i++) sampleData.push({ gameid: game2Id, participantid: i, side: "Red", position: positions[i-6], playername: `Flamengo Player ${i-5}`, champion: game2RedChamps[i-6], result: 1})


    addDebugInfo(`Generated ${sampleData.length} sample data rows`)
    console.log("[UPLOADER SAMPLE DATA]", sampleData); // Log the sample data

    setTimeout(() => {
      try {
        onDataLoaded(sampleData)
        addDebugInfo("Sample data loaded successfully")
      } catch (e) {
        setError(`Error processing sample data: ${e instanceof Error ? e.message : "Unknown error"}`)
        addDebugInfo(`Error loading sample data: ${e instanceof Error ? e.message : "Unknown error"}`)
      } finally {
        setIsLoading(false)
      }
    }, 500) // Shorter delay for sample
  }, [onDataLoaded, setIsLoading])


  // --- UI Rendering (Unchanged) ---
  return (
    <div className="w-full">
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          {/* Add button to try alternative parsing if error occurs */}
           {rawFileContent && !isLoading && (
             <div className="mt-2">
                 <Button variant="outline" size="sm" onClick={tryAlternativeCSVParsing}>
                     Try Alternative CSV Parsing (e.g., different delimiter)
                 </Button>
             </div>
            )}
        </Alert>
      )}

      {isLoading ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="h-5 w-5 text-vasco-black" />
            <span className="text-sm text-vasco-gray">{fileName}</span>
          </div>
          <Progress value={progress} className="h-2 bg-gray-200" />
          <p className="text-sm text-center text-vasco-gray">Processing your data ({progress}%)...</p>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-vasco-black/20"
              onClick={() => setShowDebug(!showDebug)}
            >
              <Bug className="h-4 w-4 mr-2" />
              {showDebug ? "Hide Processing Details" : "Show Processing Details"}
            </Button>

             {/* Removed alternative parsing button from here - added to error message */}

            {rawFileContent && (
              <Button variant="outline" size="sm" className="w-full border-vasco-black/20" onClick={downloadRawContent}>
                <Download className="h-4 w-4 mr-2" />
                Download Raw File Content
              </Button>
            )}

            {showDebug && (
              <div className="text-xs font-mono bg-vasco-black text-white p-3 rounded overflow-auto max-h-60">
                {debugInfo.map((info, i) => (
                  <div key={i} className="mb-1 whitespace-pre-wrap break-words"> {/* Ensure wrapping */}
                    {info}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div
            className={`border-2 border-dashed rounded-lg p-10 text-center ${
              dragActive ? "border-vasco-red bg-vasco-red/5" : "border-vasco-black/20"
            } transition-colors duration-200`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <div className="rounded-full bg-vasco-black p-3">
                <Upload className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="text-lg font-medium">Drag and drop your spreadsheet here</p>
                <p className="text-sm text-vasco-gray mt-1">Supports CSV, XLS, and XLSX files up to 100MB</p>
              </div>
              <div className="relative mt-2">
                <Button
                  variant="outline"
                  className="relative border-vasco-black/20 hover:bg-vasco-black hover:text-white"
                  onClick={() => document.getElementById("file-upload")?.click()}
                >
                  Browse Files
                </Button>
                <input
                  type="file"
                  id="file-upload"
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                />
              </div>
              <Button
                variant="outline"
                className="mt-2 border-vasco-black/20 hover:bg-vasco-red hover:text-white"
                onClick={loadSampleData}
              >
                Load Sample Data
              </Button>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="format">
              <AccordionTrigger className="text-sm text-vasco-gray">Expected File Format</AccordionTrigger>
              <AccordionContent>
                <div className="text-sm text-vasco-gray space-y-2">
                  <p>Your spreadsheet should contain match data with rows for both players and teams:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>gameid</strong>: Unique ID for the game.</li>
                    <li><strong>participantid</strong>: 1-10 for players, 100 for Blue team, 200 for Red team.</li>
                    <li><strong>side</strong>: "Blue" or "Red".</li>
                    <li><strong>position</strong>: "top", "jng", "mid", "bot", "sup" (for players), "team" (for teams).</li>
                    <li><strong>teamname</strong>: Name of the team (present on both player and team rows).</li>
                    <li><strong>playername</strong>: Player's name (only on player rows).</li>
                    <li><strong>champion</strong>: Champion name (only on player rows).</li>
                    <li><strong>result</strong>: 1 for win, 0 for loss.</li>
                    <li><strong>pick1, pick2, pick3, pick4, pick5</strong>: Champion names in team pick order (***only on team rows*** - participantid 100/200).</li>
                    <li><em>Other stats...</em> (kills, deaths, assists, damageshare, etc. - mainly relevant on player rows, but might exist on team rows as totals).</li>
                  </ul>
                  <p><strong>Crucially:</strong> Ensure the team rows (participantid 100 and 200) contain the `pick1` through `pick5` columns accurately.</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  )
}