
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ExtractedMedData {
  name: string;
  strength: string;
  form: string;
  rxNumber?: string;
  pharmacyName?: string;
  instructions?: string;
  quantity?: number;
  refillsRemaining?: number;
}

export const scanMedicationLabel = async (base64Images: string[]): Promise<ExtractedMedData> => {
  try {
    // Create image parts for all provided images
    const imageParts = base64Images.map(img => ({
      inlineData: {
        mimeType: 'image/jpeg',
        data: img.replace(/^data:image\/\w+;base64,/, "")
      }
    }));

    // Updated model to 'gemini-3-flash-preview' for basic multimodal/text tasks as per guidelines
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          ...imageParts,
          {
            text: "Analyze these images of a medication container. Synthesize information to extract: full medication name, strength, form, Rx number, pharmacy name, full instructions, total quantity, and how many refills are remaining according to the label. If the label says 'No Refills' or '0 Refills', return 0. If it says 'Refills: 5', return 5."
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "The brand or generic name of the medication" },
            strength: { type: Type.STRING, description: "The strength e.g., 10mg" },
            form: { type: Type.STRING, description: "The form factor e.g., Tablet, Capsule" },
            rxNumber: { type: Type.STRING, description: "The prescription number if visible" },
            pharmacyName: { type: Type.STRING, description: "The name of the pharmacy" },
            instructions: { type: Type.STRING, description: "Instructions on label e.g., Take one tablet daily" },
            quantity: { type: Type.INTEGER, description: "Total quantity in bottle" },
            refillsRemaining: { type: Type.INTEGER, description: "Number of refills left on prescription. Use 0 for no refills." },
          },
          required: ["name"]
        }
      }
    });

    // Access the text property directly from GenerateContentResponse
    const text = response.text;
    if (!text) throw new Error("No data returned from Gemini");
    return JSON.parse(text) as ExtractedMedData;

  } catch (error) {
    console.error("Gemini Scan Error:", error);
    throw error;
  }
};
