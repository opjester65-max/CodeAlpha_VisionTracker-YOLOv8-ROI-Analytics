import { GoogleGenAI, Type, Schema } from "@google/genai";
import { DetectionResult } from "../types";

// Schema for the object detection response
const detectionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    detections: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description: "The class/label of the detected object (e.g., person, car, dog).",
          },
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: "Bounding box coordinates [ymin, xmin, ymax, xmax] normalized to 1000x1000.",
          },
        },
        required: ["label", "box_2d"],
      },
    },
  },
  required: ["detections"],
};

export const detectObjectsInFrame = async (base64Image: string): Promise<DetectionResult[]> => {
  if (!process.env.API_KEY) {
    console.warn("API Key is missing!");
    return [];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // We use gemini-2.5-flash for speed/latency balance
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Detect all main objects in this image. For each object, provide the label and the bounding box [ymin, xmin, ymax, xmax] on a 1000x1000 scale.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: detectionSchema,
        systemInstruction: "You are a real-time object detection engine. Be precise with bounding boxes.",
        temperature: 0.3, // Low temperature for consistency
      },
    });

    const jsonText = response.text;
    if (!jsonText) return [];

    const result = JSON.parse(jsonText);
    return result.detections || [];
  } catch (error) {
    console.error("Gemini Detection Error:", error);
    return [];
  }
};