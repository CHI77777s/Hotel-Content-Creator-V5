// FIX: Import `useState` from React to fix 'Cannot find name `useState`' error.
import React, { useState } from 'react';
import type { HotelData } from '../types';
import { ClipboardIcon, MapPinIcon, PhoneIcon, HashIcon, GlobeIcon, BuildingIcon, BookOpenIcon, LanguagesIcon, FileSpreadsheetIcon } from './Icons';

interface ResultDisplayProps {
  hotelData: HotelData | null;
  isLoading: boolean;
  onDownloadExcel: () => void;
}

const ResultDisplay: React.FC<ResultDisplayProps> = ({ hotelData, isLoading, onDownloadExcel }) => {
  if (isLoading) {
    return <Loader />;
  }

  if (!hotelData) {
    return null;
  }
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Metadata Section */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">Hotel Metadata</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <InfoItem icon={<BuildingIcon />} label="Input Hotel" value={hotelData.Eingabe_Hotelname} />
            <InfoItem icon={<GlobeIcon />} label="Input Country" value={hotelData.Eingabe_Land} />
            <InfoItem icon={<HashIcon />} label="GIATA Code" value={hotelData.GIATA_Code} />
            <InfoItem icon={<MapPinIcon />} label="Address" value={`${hotelData.Adresse_Strasse}, ${hotelData.PLZ} ${hotelData.Ort}`} />
            <InfoItem icon={<PhoneIcon />} label="Phone" value={hotelData.Telefon} />
            <InfoItem 
                icon={<MapPinIcon />} 
                label="Coordinates" 
                value={`${hotelData.Latitude.toFixed(6)}, ${hotelData.Longitude.toFixed(6)}`} 
            />
          </div>
        </div>
      </div>
      
      {/* Descriptions Section */}
      <DescriptionCard 
        lang="DE" 
        title="German Description" 
        description={hotelData.Beschreibung_DE}
        onCopy={() => copyToClipboard(hotelData.Beschreibung_DE)}
      />

      <DescriptionCard 
        lang="FR" 
        title="French Description" 
        description={hotelData.Beschreibung_FR}
        onCopy={() => copyToClipboard(hotelData.Beschreibung_FR)}
      />
      
      {/* JSON Output Section */}
      <div className="bg-slate-800 dark:bg-black rounded-xl shadow-lg">
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Data Output</h2>
              <div className="flex items-center gap-2">
                <button 
                    onClick={onDownloadExcel} 
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-200 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                >
                    <FileSpreadsheetIcon className="w-4 h-4 text-green-500" />
                    <span>Download Excel</span>
                </button>
                <CopyButton onCopy={() => copyToClipboard(JSON.stringify(hotelData, null, 2))} />
              </div>
            </div>
          <pre className="text-sm bg-slate-900 dark:bg-slate-900/50 p-4 rounded-lg overflow-x-auto text-green-300">
            <code>{JSON.stringify(hotelData, null, 2)}</code>
          </pre>
        </div>
      </div>
    </div>
  );
};


// FIX: The type for the `icon` prop was too generic (`React.ReactElement`), causing a TypeScript error with `React.cloneElement`.
// I've specified a more accurate type, `React.ReactElement<React.SVGProps<SVGSVGElement>>`, which ensures that TypeScript
// knows `className` is a valid prop for the icon element.
const InfoItem: React.FC<{ icon: React.ReactElement<React.SVGProps<SVGSVGElement>>; label: string; value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start space-x-3">
      <div className="flex-shrink-0 text-slate-400 dark:text-slate-500 mt-1">
        {React.cloneElement(icon, { className: 'w-5 h-5' })}
      </div>
      <div>
        <p className="font-semibold text-slate-700 dark:text-slate-300">{label}</p>
        <p className="text-slate-500 dark:text-slate-400">{value}</p>
      </div>
    </div>
);

const DescriptionCard: React.FC<{lang: string, title: string, description: string, onCopy: () => void}> = ({lang, title, description, onCopy}) => (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg">
        <div className="p-6">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                    {lang === 'DE' ? <BookOpenIcon className="w-6 h-6 text-sky-500" /> : <LanguagesIcon className="w-6 h-6 text-sky-500" />}
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{title}</h2>
                </div>
                <CopyButton onCopy={onCopy} />
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {description}
            </p>
        </div>
    </div>
);


const CopyButton: React.FC<{onCopy: () => void}> = ({onCopy}) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        onCopy();
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <button
            onClick={handleCopy}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-700 rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
        >
            <ClipboardIcon className="w-4 h-4" />
            <span>{copied ? 'Copied!' : 'Copy JSON'}</span>
        </button>
    );
}

const Loader: React.FC = () => (
  <div className="text-center p-8 bg-white dark:bg-slate-800 rounded-xl shadow-lg">
    <div role="status" className="inline-flex items-center space-x-3">
        <svg aria-hidden="true" className="w-10 h-10 text-slate-200 animate-spin dark:text-slate-600 fill-sky-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
            <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5424 39.6781 93.9676 39.0409Z" fill="currentFill"/>
        </svg>
        <span className="text-xl font-medium text-slate-700 dark:text-slate-300">Generating hotel content... please wait.</span>
    </div>
  </div>
);


export default ResultDisplay;