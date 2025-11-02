export interface HotelData {
  Eingabe_Land: string;
  Eingabe_Hotelname: string;
  GIATA_Code: string;
  Adresse_Strasse: string;
  PLZ: string;
  Ort: string;
  Telefon: string;
  Latitude: number;
  Longitude: number;
  Beschreibung_DE: string;
  Beschreibung_FR: string;
}

export interface BatchTask {
  country: string;
  hotelName: string;
  city?: string;
  originalData: { [key: string]: any };
}

export interface BatchResult {
  input: BatchTask;
  output: HotelData | null;
  status: 'Success' | 'Error';
  error?: string;
}

export type BatchState = 'idle' | 'running' | 'paused' | 'aborted' | 'completed';