
import { GoogleGenAI, Type } from "@google/genai";
import { AppConfig, GradientConfig } from "../types";

// Always use process.env.API_KEY directly for initialization.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export async function getAestheticSuggestion(currentConfig: AppConfig): Promise<Partial<AppConfig> & { themeName: string }> {
  const prompt = `
    I am creating a star trail generator application. 
    The current settings are:
    Background: ${currentConfig.bgColor}
    Star Color: ${currentConfig.starColor}
    Speed: ${currentConfig.speedZ}
    
    Suggest a unique "Aesthetic Theme" that sounds like a space mission or a sci-fi phenomenon. 
    Provide a color palette and physics settings (speed, drift, star density) that would look visually stunning.
    Output only JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themeName: { type: Type.STRING },
            bgColor: { type: Type.STRING },
            starColor: { type: Type.STRING },
            glowColor: { type: Type.STRING },
            speedZ: { type: Type.NUMBER },
            starCount: { type: Type.NUMBER },
            driftX: { type: Type.NUMBER },
            driftY: { type: Type.NUMBER },
          },
          required: ["themeName", "bgColor", "starColor", "speedZ"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return { themeName: "Void Explorer", ...currentConfig };
  }
}

export async function getGradientSuggestion(currentConfig: GradientConfig): Promise<Partial<GradientConfig> & { themeName: string }> {
  const prompt = `
    Suggest a stunning modern color palette for a background gradient generator. 
    Theme should be "Premium Minimalist" or "Cyberpunk Glow" or "Natural Dusk".
    Current palette: ${currentConfig.colors.join(', ')}
    Provide 3 to 5 highly aesthetic hex colors and a suggested gradient type (LINEAR, RADIAL, or MESH).
    Output only JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            themeName: { type: Type.STRING },
            colors: { type: Type.ARRAY, items: { type: Type.STRING } },
            type: { type: Type.STRING },
            angle: { type: Type.NUMBER },
          },
          required: ["themeName", "colors", "type"]
        }
      }
    });

    return JSON.parse(response.text || '{}');
  } catch (error) {
    console.error("Gemini Error:", error);
    return { themeName: "Aurora", ...currentConfig };
  }
}
