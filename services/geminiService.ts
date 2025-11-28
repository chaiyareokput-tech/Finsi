import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { AnalysisResult } from "../types";
import * as XLSX from "xlsx";

// Manually declare process for browser environment to satisfy TypeScript
declare const process: {
  env: {
    API_KEY: string;
    [key: string]: any;
  }
};

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// สกีมา JSON สำหรับ Gemini 2.5 Flash
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    liquidity: {
      type: Type.OBJECT,
      properties: {
        currentRatio: { type: Type.NUMBER },
        quickRatio: { type: Type.NUMBER },
        status: { type: Type.STRING, enum: ['Healthy', 'Caution', 'Critical'] },
        statusLabel: { type: Type.STRING },
        description: { type: Type.STRING }
      },
      required: ["currentRatio", "status", "statusLabel", "description"]
    },
    financialItems: {
      type: Type.ARRAY,
      description: "รายการบัญชีที่สำคัญและรายการที่มีการเปลี่ยนแปลงสูง (Top items and significant variances). LIMIT TO TOP 40 ITEMS ONLY.",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          previousAmount: { type: Type.NUMBER, description: "ยอดปีก่อนหน้า (ถ้ามี)" },
          percentageChange: { type: Type.NUMBER, description: "% การเปลี่ยนแปลง (ถ้ามี)" },
          type: { type: Type.STRING, enum: ['revenue', 'expense', 'asset', 'liability'] },
          unit: { type: Type.STRING, description: "หน่วยงานเจ้าของยอดนี้ เช่น 'กฟส.', 'H', 'Electricity', 'BusA', 'BA' หรือ 'Overall'" },
          insight: { type: Type.STRING, description: "สาเหตุหรือข้อสังเกตสั้นๆ" },
          riskLevel: { type: Type.STRING, enum: ['High', 'Medium', 'Low'], description: "ระดับความเสี่ยง" }
        },
        required: ["name", "amount", "type", "unit", "insight", "riskLevel"]
      }
    },
    keyRatios: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          value: { type: Type.STRING }, // อนุญาตเป็น string เผื่อรูปแบบพิเศษ
          unit: { type: Type.STRING },
          evaluation: { type: Type.STRING, enum: ['Good', 'Fair', 'Poor'] },
          description: { type: Type.STRING }
        },
        required: ["name", "value", "evaluation", "description"]
      }
    },
    futureTrends: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING },
          prediction: { type: Type.STRING },
          impact: { type: Type.STRING, enum: ['Positive', 'Negative', 'Neutral'] }
        },
        required: ["topic", "prediction", "impact"]
      }
    },
    summary: { type: Type.STRING },
    detailedReport: { type: Type.STRING, description: "บทวิเคราะห์เชิงลึกแบบบรรยาย (Markdown)" },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    }
  },
  required: ["liquidity", "financialItems", "keyRatios", "futureTrends", "summary", "detailedReport", "recommendations"]
};

// Helper: แปลงไฟล์ Excel เป็น CSV string
const parseExcel = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        resolve(csv);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// Helper: อ่านไฟล์ Text/CSV
const parseTextFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

// Helper: อ่านไฟล์เป็น Base64
const fileToBase64 = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // ลบ prefix data url ออกเพื่อให้ได้ raw base64 สำหรับ Gemini
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeFinancialData = async (
  file: File | null,
  textData: string | null
): Promise<AnalysisResult> => {
  
  if (!process.env.API_KEY) {
    throw new Error("ไม่พบ API Key กรุณาตรวจสอบการตั้งค่า");
  }

  const prompt = `
    คุณคือผู้เชี่ยวชาญด้านการวิเคราะห์งบการเงินระดับสูง (Senior Financial Analyst AI)
    
    ภารกิจ:
    1. วิเคราะห์ข้อมูลการเงินที่ได้รับ
    2. **การแยกหน่วยงาน (Unit Separation):** แยกแยะข้อมูลตามหน่วยงาน (กฟส., H, Electricity, BusA/BA)
    3. **การจัดประเภทบัญชี:** ระบุประเภท (Revenue, Expense, Asset, Liability)
    4. **Significant Variance:** หา % การเปลี่ยนแปลงและ Insight
    5. **Risk Assessment:** ประเมินความเสี่ยง (High/Medium/Low)
    6. **IMPORTANT - JSON LIMITATION:** 
       - ใน field 'financialItems' ให้ส่งคืนเฉพาะ **รายการที่มีนัยสำคัญสูงสุด 40 อันดับแรก** (Top 40 significant items) เท่านั้น เพื่อป้องกัน JSON ถูกตัดจบ
       - ไม่ต้องแสดงรายการย่อยที่ยอดเงินน้อยหรือไม่มีนัยสำคัญ
       - 'insight' ต้องสั้นกระชับ (1 ประโยค)
    
    Output: JSON ตาม Schema เท่านั้น ห้ามมี Markdown Code Block ครอบ
    Language: ภาษาไทย
  `;

  const parts: any[] = [{ text: prompt }];

  if (file) {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    // Robust file type detection
    const isPdf = fileType === 'application/pdf' || fileName.endsWith('.pdf');
    const isImage = fileType.includes('image') || /\.(jpg|jpeg|png|webp|heic)$/i.test(fileName);
    const isExcel = fileType.includes('sheet') || fileType.includes('excel') || /\.(xlsx|xls)$/i.test(fileName);
    const isCsv = fileType.includes('csv') || /\.(csv|txt)$/i.test(fileName);

    if (isPdf) {
       const base64Data = await fileToBase64(file);
       parts.push({
         inlineData: {
           mimeType: 'application/pdf',
           data: base64Data
         }
       });
    } else if (isImage) {
       const base64Data = await fileToBase64(file);
       let mimeType = fileType;
       if (!mimeType) {
         if (fileName.endsWith('.png')) mimeType = 'image/png';
         else mimeType = 'image/jpeg';
       }
       parts.push({
         inlineData: {
           mimeType: mimeType,
           data: base64Data
         }
       });
    } else if (isExcel) {
       const csvData = await parseExcel(file);
       const truncatedCsv = csvData.length > 50000 ? csvData.substring(0, 50000) + "\n...(ข้อมูลถูกตัดทอน)..." : csvData;
       parts.push({ text: `ข้อมูลจากไฟล์ Excel (แปลงเป็น CSV): \n${truncatedCsv}` });
    } else if (isCsv) {
       const txtData = await parseTextFile(file);
       const truncatedTxt = txtData.length > 50000 ? txtData.substring(0, 50000) + "\n...(ข้อมูลถูกตัดทอน)..." : txtData;
       parts.push({ text: `ข้อมูลจากไฟล์: \n${truncatedTxt}` });
    } else {
       try {
         const txtData = await parseTextFile(file);
         parts.push({ text: `ข้อมูลไฟล์: \n${txtData}` });
       } catch (e) {
         throw new Error("ไม่รองรับประเภทไฟล์นี้ กรุณาอัปโหลด PDF, Excel, CSV หรือรูปภาพ");
       }
    }
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        role: 'user',
        parts: parts
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: analysisSchema,
        temperature: 0.2,
        maxOutputTokens: 8192,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ],
      }
    });

    let resultText = response.text;
    
    if (!resultText) {
      const candidate = response.candidates?.[0];
      const finishReason = candidate?.finishReason;
      if (finishReason === 'SAFETY') throw new Error("ติด Safety Block - โปรดตรวจสอบเนื้อหาไฟล์");
      throw new Error(`AI ไม่ตอบกลับ (Reason: ${finishReason || 'Unknown'})`);
    }

    // Clean Markdown Code Blocks
    resultText = resultText.replace(/^```json\s*/, "").replace(/\s*```$/, "").trim();

    try {
      return JSON.parse(resultText) as AnalysisResult;
    } catch (parseError) {
      console.error("JSON Parse Error Raw:", resultText);
      throw new Error(`เกิดข้อผิดพลาดในการอ่านผลลัพธ์ (JSON Syntax): ${parseError}. ข้อมูลอาจถูกตัดจบเนื่องจากมีรายการเยอะเกินไป`);
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    let errorMsg = (error as Error).message;
    if (errorMsg.includes("JSON") || errorMsg.includes("position")) {
        errorMsg = "ข้อมูลมีขนาดใหญ่เกินไป ทำให้ผลลัพธ์ไม่สมบูรณ์ กรุณาลดจำนวนรายการในไฟล์ หรือลองใหม่อีกครั้ง";
    }
    throw new Error(errorMsg);
  }
};