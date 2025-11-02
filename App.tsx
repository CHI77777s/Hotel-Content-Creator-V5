import React, { useState, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import type { HotelData, BatchResult, BatchTask, BatchState } from './types';
import { generateHotelContent } from './services/geminiService';
import InputForm from './components/InputForm';
import ResultDisplay from './components/ResultDisplay';
import BatchUploadForm from './components/BatchUploadForm';
import { BotIcon, HotelIcon } from './components/Icons';

const App: React.FC = () => {
  // State for single entry mode
  const [hotelData, setHotelData] = useState<HotelData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // State for batch upload mode
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchState, setBatchState] = useState<BatchState>('idle');
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchError, setBatchError] = useState<string | null>(null);
  
  // Refs to control the async processing loop
  const isPausedRef = useRef(false);
  const isAbortedRef = useRef(false);
  const currentTaskIndexRef = useRef(0);

  const handleGenerate = useCallback(async (country: string, hotelName: string, city: string) => {
    setIsLoading(true);
    setError(null);
    setHotelData(null);
    try {
      const data = await generateHotelContent(country, hotelName, city);
      setHotelData(data);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred. Please check the console.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePause = useCallback(() => {
    isPausedRef.current = true;
    setBatchState('paused');
  }, []);
  
  const runBatchTasks = useCallback(async (tasks: BatchTask[]) => {
    const results = [...batchResults];

    // Use a while loop to allow retrying the current task on rate limit errors.
    while (currentTaskIndexRef.current < tasks.length) {
        
        setBatchProgress({ current: currentTaskIndexRef.current, total: tasks.length });

        if (isAbortedRef.current) {
            console.log('Batch processing aborted.');
            setBatchState('aborted');
            return;
        }

        while (isPausedRef.current) {
            await new Promise(resolve => setTimeout(resolve, 200)); // Wait until resumed
            if (isAbortedRef.current) {
                console.log('Batch processing aborted during pause.');
                setBatchState('aborted');
                return;
            }
        }

        const currentIndex = currentTaskIndexRef.current;
        const task = tasks[currentIndex];
        
        try {
            const data = await generateHotelContent(task.country, task.hotelName, task.city);
            results.push({ input: task, output: data, status: 'Success' });
            currentTaskIndexRef.current++; // Move to the next task ONLY on success.
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Unknown error';

            if (errorMessage.includes("API rate limit exceeded")) {
                console.warn("Rate limit exceeded. Auto-pausing.");
                setBatchError("Processing paused due to API rate limit. Please wait a moment and then resume.");
                handlePause();
                // Do not increment index. The loop will continue to the top, where the `while(isPausedRef.current)`
                // check will halt execution until the user resumes.
            } else {
                // For any other unrecoverable error, log it and move on.
                results.push({ input: task, output: null, status: 'Error', error: errorMessage });
                currentTaskIndexRef.current++;
            }
        }
        setBatchResults([...results]);
    }

    if (!isAbortedRef.current) {
        setBatchProgress({ current: tasks.length, total: tasks.length });
        setBatchState('completed');
    }
  }, [batchResults, handlePause, setBatchError]);


  const handleProcessFile = useCallback(async (file: File) => {
    setBatchResults([]);
    setError(null);
    setBatchError(null);
    setBatchProgress({ current: 0, total: 0 });
    currentTaskIndexRef.current = 0;
    isPausedRef.current = false;
    isAbortedRef.current = false;
    setBatchState('idle');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new Error("The uploaded file does not contain any sheets.");
      }
      
      let worksheet: XLSX.WorkSheet | null = null;
      // Iterate through sheets to find the first valid one with data.
      // This makes it robust against files where the first sheet might be a chart or empty.
      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        if (sheet && sheet['!ref']) { // '!ref' indicates a range, meaning it's a data sheet
          worksheet = sheet;
          break;
        }
      }

      if (!worksheet) {
        throw new Error("Could not find any readable data sheets in the file.");
      }

      const json: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      if (json.length === 0) {
        throw new Error("The first valid sheet of the Excel file appears to be empty or contains no data rows after the header.");
      }
      
      const headers = Object.keys(json[0]);
      if (headers.length === 0) {
        throw new Error("Could not detect any column headers in the sheet.");
      }
      
      const findHeader = (possibleNames: string[]): string | undefined => {
        for (const name of possibleNames) {
          const found = headers.find(h => h.toLowerCase().trim() === name);
          if (found) return found;
        }
        return undefined;
      };

      const countryHeader = findHeader(['country', 'land']);
      const hotelHeader = findHeader(['hotel name', 'hotelname', 'hotel']);
      const cityHeader = findHeader(['city', 'stadt', 'ort']);
      
      if (!countryHeader || !hotelHeader) {
          throw new Error("Could not find required columns. Please ensure your Excel file has columns named 'Country' (or 'Land') and 'Hotel name' (or 'Hotelname'/'Hotel'). The check is case-insensitive.");
      }

      const tasks: BatchTask[] = json.map((row) => ({
        country: row[countryHeader],
        hotelName: row[hotelHeader],
        city: cityHeader ? row[cityHeader] : undefined,
        originalData: row,
      })).filter(task => String(task.country).trim() && String(task.hotelName).trim());


      if (tasks.length === 0) {
        throw new Error("No valid tasks with data were found. Make sure the 'Country' and 'Hotel name' columns are populated.");
      }
      
      setBatchProgress({ current: 0, total: tasks.length });
      setBatchState('running');
      runBatchTasks(tasks);

    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to process the file.');
      setBatchState('idle');
    }
  }, [runBatchTasks]);

  const handleResume = useCallback(() => {
    isPausedRef.current = false;
    setBatchError(null); // Clear the rate limit message on resume
    setBatchState('running');
  }, []);

  const handleAbort = useCallback(() => {
    isAbortedRef.current = true;
    // The loop will see the flag and stop, then set state to 'aborted'.
  }, []);

  const handleDownload = useCallback((format: 'json' | 'xlsx') => {
    if (batchResults.length === 0) return;

    if (format === 'json') {
      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(batchResults, null, 2))}`;
      const link = document.createElement("a");
      link.href = jsonString;
      link.download = "hotel_content_results.json";
      link.click();
    } else {
      const flattenedData = batchResults.map(res => {
        const originalData = res.input.originalData;
        const generatedData = {
            'Status': res.status,
            'Error': res.error || '',
            'GIATA Code': res.output?.GIATA_Code || '',
            'Address': res.output ? `${res.output.Adresse_Strasse}, ${res.output.PLZ} ${res.output.Ort}` : '',
            'Phone': res.output?.Telefon || '',
            'Latitude': res.output?.Latitude || '',
            'Longitude': res.output?.Longitude || '',
            'Description DE': res.output?.Beschreibung_DE || '',
            'Description FR': res.output?.Beschreibung_FR || '',
        };
        return { ...originalData, ...generatedData };
      });
      const worksheet = XLSX.utils.json_to_sheet(flattenedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Results");
      XLSX.writeFile(workbook, "hotel_content_results.xlsx");
    }
  }, [batchResults]);

  const handleSingleDownload = useCallback(() => {
    if (!hotelData) return;

    const dataForSheet = [{
        'Input Country': hotelData.Eingabe_Land,
        'Input Hotel': hotelData.Eingabe_Hotelname,
        'GIATA Code': hotelData.GIATA_Code,
        'Address': `${hotelData.Adresse_Strasse}, ${hotelData.PLZ} ${hotelData.Ort}`,
        'Phone': hotelData.Telefon,
        'Latitude': hotelData.Latitude,
        'Longitude': hotelData.Longitude,
        'Description DE': hotelData.Beschreibung_DE,
        'Description FR': hotelData.Beschreibung_FR,
    }];

    const worksheet = XLSX.utils.json_to_sheet(dataForSheet);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Result");
    XLSX.writeFile(workbook, `${hotelData.Eingabe_Hotelname.replace(/ /g, '_')}_content.xlsx`);

  }, [hotelData]);

  const activeTabClass = "border-sky-500 text-sky-600 dark:text-sky-400";
  const inactiveTabClass = "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300 dark:hover:border-slate-600";

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans">
      <main className="container mx-auto p-4 md:p-8">
        <header className="text-center mb-8 md:mb-12">
          <div className="flex justify-center items-center gap-4 mb-4">
            <HotelIcon className="w-10 h-10 text-sky-500" />
            <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
              Hotel Content Generator
            </h1>
            <BotIcon className="w-10 h-10 text-sky-500" />
          </div>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Generate rich hotel data, including journalistic descriptions in German and French, with just a hotel name and country.
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="border-b border-slate-200 dark:border-slate-700">
              <nav className="-mb-px flex justify-center space-x-8" aria-label="Tabs">
                <button
                  onClick={() => setMode('single')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${mode === 'single' ? activeTabClass : inactiveTabClass}`}
                >
                  Single Entry
                </button>
                <button
                  onClick={() => setMode('batch')}
                  className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${mode === 'batch' ? activeTabClass : inactiveTabClass}`}
                >
                  Batch Upload
                </button>
              </nav>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-md shadow" role="alert">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {mode === 'single' ? (
            <>
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 mb-8">
                <InputForm onGenerate={handleGenerate} isLoading={isLoading} />
              </div>
              <ResultDisplay hotelData={hotelData} isLoading={isLoading} onDownloadExcel={handleSingleDownload} />
            </>
          ) : (
            <>
            {batchError && (
              <div className="mb-4 bg-amber-100 dark:bg-amber-900/20 border-l-4 border-amber-500 text-amber-800 dark:text-amber-300 p-4 rounded-md shadow" role="alert">
                <p className="font-bold">Notice</p>
                <p>{batchError}</p>
              </div>
            )}
            <BatchUploadForm
              onProcessFile={handleProcessFile}
              results={batchResults}
              batchState={batchState}
              progress={batchProgress}
              onDownload={handleDownload}
              onPause={handlePause}
              onResume={handleResume}
              onAbort={handleAbort}
            />
            </>
          )}
        </div>
        
        <footer className="text-center mt-12 text-slate-500 dark:text-slate-400 text-sm">
          <p>Powered by Google Gemini & React. Designed for travel content professionals.</p>
        </footer>
      </main>
    </div>
  );
};

export default App;