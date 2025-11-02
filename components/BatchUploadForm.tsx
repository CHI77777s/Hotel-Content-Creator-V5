import React, { useState, useRef } from 'react';
import type { BatchResult, BatchState } from '../types';
import { UploadCloudIcon, FileJsonIcon, FileSpreadsheetIcon, CheckCircleIcon, XCircleIcon, PauseIcon, PlayIcon, SquareIcon } from './Icons';

interface BatchUploadFormProps {
  onProcessFile: (file: File) => void;
  results: BatchResult[];
  batchState: BatchState;
  progress: { current: number; total: number };
  onDownload: (format: 'json' | 'xlsx') => void;
  onPause: () => void;
  onResume: () => void;
  onAbort: () => void;
}

const BatchUploadForm: React.FC<BatchUploadFormProps> = ({
  onProcessFile,
  results,
  batchState,
  progress,
  onDownload,
  onPause,
  onResume,
  onAbort
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleSubmit = () => {
    if (file) {
      onProcessFile(file);
    }
  };

  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;
  const isProcessing = batchState === 'running' || batchState === 'paused';
  const isPartial = batchState === 'running' || batchState === 'paused' || batchState === 'aborted';

  const getStatusMessage = () => {
    switch(batchState) {
        case 'running': return 'Running...';
        case 'paused': return 'Paused';
        case 'completed': return 'Completed';
        case 'aborted': return 'Aborted';
        default: return 'Processing...';
    }
  }

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8">
        <div 
            className={`flex justify-center items-center w-full mb-6 p-8 border-2 border-dashed rounded-lg transition-colors ${isDragging ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/20' : 'border-slate-300 dark:border-slate-600 hover:border-sky-400'}`}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
        >
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".xlsx, .csv" className="hidden" />
          <div className="text-center cursor-pointer">
            <UploadCloudIcon className="mx-auto h-12 w-12 text-slate-400" />
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              <span className="font-semibold text-sky-600 dark:text-sky-400">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-500">XLSX or CSV file</p>
            {file && <p className="mt-2 text-sm font-medium text-slate-700 dark:text-slate-300">{file.name}</p>}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row justify-end items-center gap-4">
            {isProcessing && (
                <div className="flex items-center gap-2">
                    {batchState === 'running' && (
                        <button onClick={onPause} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-amber-500 rounded-lg hover:bg-amber-600 transition-colors">
                            <PauseIcon className="w-4 h-4" /> Pause
                        </button>
                    )}
                    {batchState === 'paused' && (
                         <button onClick={onResume} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors">
                            <PlayIcon className="w-4 h-4" /> Resume
                        </button>
                    )}
                    <button onClick={onAbort} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">
                        <SquareIcon className="w-4 h-4" /> Abort
                    </button>
                </div>
            )}
            <button
                onClick={handleSubmit}
                disabled={!file || isProcessing}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors duration-200"
            >
                {isProcessing ? 'Processing...' : 'Process File'}
            </button>
        </div>
      </div>

      {(batchState !== 'idle' || results.length > 0) && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Results</h2>
            {results.length > 0 && (
              <div className="flex items-center gap-2">
                 <button onClick={() => onDownload('xlsx')} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    <FileSpreadsheetIcon className="w-4 h-4 text-green-500" />
                    {isPartial ? 'Download Partial Excel' : 'Download Excel'}
                </button>
                <button onClick={() => onDownload('json')} className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 rounded-md hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
                    <FileJsonIcon className="w-4 h-4 text-orange-500" />
                    {isPartial ? 'Download Partial JSON' : 'Download JSON'}
                </button>
              </div>
            )}
          </div>

          {isProcessing && (
            <div className="mb-4">
              <div className="flex justify-between mb-1">
                <span className="text-base font-medium text-sky-700 dark:text-white">{getStatusMessage()}</span>
                <span className="text-sm font-medium text-sky-700 dark:text-white">{progress.current} / {progress.total}</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2.5 dark:bg-slate-700">
                <div className="bg-sky-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progressPercentage}%` }}></div>
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="overflow-x-auto max-h-[50vh]">
                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                    <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">#</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Country</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">City</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Hotel Name</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Status</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">Details</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-200 dark:divide-slate-700">
                    {results.map((result, index) => (
                    <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400">{index + 1}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{result.input.country}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 dark:text-slate-300">{result.input.city || ''}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900 dark:text-white">{result.input.hotelName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {result.status === 'Success' ? 
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"><CheckCircleIcon className="w-4 h-4 mr-1.5" />Success</span> :
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"><XCircleIcon className="w-4 h-4 mr-1.5" />Error</span>
                        }
                        </td>
                        <td className="px-6 py-4 whitespace-normal text-sm text-slate-500 dark:text-slate-400 max-w-xs truncate">{result.error || 'Data generated successfully.'}</td>
                    </tr>
                    ))}
                </tbody>
                </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BatchUploadForm;