
import { GoogleGenAI, Type } from "@google/genai";
import type { HotelData } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const systemInstruction = `Du bist ein spezialisiertes KI-Modell zur Erstellung von Reiseinhalten und zur Beschaffung von Hotelstammdaten. Deine Hauptaufgabe besteht darin, basierend auf dem Land und dem Hotelnamen des Inputs, eine umfassende Ausgabe in einem strengen JSON-Format zu generieren.

Zentrale Anforderungen:
- Datenbeschaffung: Ermittle die vollständige Adresse, die Geokoordinaten (Latitude/Longitude), die Telefonnummer und den GIATA Code des Hotels. Ziehe als wichtige zusätzliche Quelle die Website https://www.knecht-reisen.ch/ heran, um die Daten zu verifizieren und Inhalte zu inspirieren, insbesondere wenn es um den Stil und spezifische Details geht.
- Hotelbeschreibung (DE): Erstelle einen reisejournalistischen Hotelbeschrieb (200-300 Wörter) in deutscher Sprache, der Charakter, Stil und Lage des Hotels hervorhebt.
- Stilvorgabe (DE): Der Text muss im begeisternden, qualitätsbewussten Stil von Knecht Reisen verfasst sein. Achte auf maximale Variation von Satzbau, Satzanfängen und Vokabular. Verwende aktiv Synonyme, um Wortwiederholungen zu vermeiden und den Text lebendiger zu gestalten.
- Orthografie-Regel (DE): Das scharfe S (ß) muss in der gesamten deutschen Beschreibung konsequent durch ss ersetzt werden.
- Übersetzung (FR): Übersetze den fertiggestellten deutschen Beschrieb anschliessend professionell und präzise ins Französische.

Die Ausgabe muss zwingend dem bereitgestellten JSON-Schema folgen, um eine automatische Weiterverarbeitung zu gewährleisten.`;


const hotelDataSchema = {
  type: Type.OBJECT,
  properties: {
    Eingabe_Land: { type: Type.STRING, description: "Das Land aus der Eingabe." },
    Eingabe_Hotelname: { type: Type.STRING, description: "Der Hotelname aus der Eingabe." },
    GIATA_Code: { type: Type.STRING, description: "Der eindeutige GIATA Code des Hotels. Wenn nicht gefunden, 'N/A' zurückgeben." },
    Adresse_Strasse: { type: Type.STRING, description: "Die vollständige Strasse und Hausnummer/Adresse." },
    PLZ: { type: Type.STRING, description: "Die Postleitzahl (falls vorhanden)." },
    Ort: { type: Type.STRING, description: "Die Stadt oder der nächste bewohnte Ort." },
    Telefon: { type: Type.STRING, description: "Die vollständige Telefonnummer mit internationaler Vorwahl." },
    Latitude: { type: Type.NUMBER, description: "Der Breitengrad im Dezimalformat." },
    Longitude: { type: Type.NUMBER, description: "Der Längengrad im Dezimalformat." },
    Beschreibung_DE: { type: Type.STRING, description: "Der 200-300 Wörter lange, variierte Hotelbeschrieb im Stil von Knecht Reisen, in dem 'ss' statt 'ß' verwendet wird." },
    Beschreibung_FR: { type: Type.STRING, description: "Die professionelle, stilistisch ansprechende französische Übersetzung des deutschen Beschriebs." }
  },
  required: ["Eingabe_Land", "Eingabe_Hotelname", "GIATA_Code", "Adresse_Strasse", "PLZ", "Ort", "Telefon", "Latitude", "Longitude", "Beschreibung_DE", "Beschreibung_FR"]
};

export const generateHotelContent = async (country: string, hotelName: string, city?: string): Promise<HotelData> => {
  let prompt = `Bitte generiere die Daten für das folgende Hotel:\nLand: ${country}\nHotelname: ${hotelName}`;
  if (city && city.trim() !== '') {
    prompt = `Bitte generiere die Daten für das folgende Hotel:\nLand: ${country}\nStadt: ${city}\nHotelname: ${hotelName}`;
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: hotelDataSchema,
        temperature: 0.7,
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("Received an empty response from the API.");
    }
    
    // The response text is already a clean JSON string because of responseMimeType
    const jsonData = JSON.parse(text);

    return jsonData as HotelData;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    if (error.message.includes('429')) {
      throw new Error("API rate limit exceeded. Please try again later.");
    }
    throw new Error("Failed to generate hotel content. The model might not have found the requested hotel or an API error occurred.");
  }
};