import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";
import * as XLSX from "xlsx";

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
      description: "รายการบัญชีทั้งหมด แยกตามบรรทัดที่ปรากฏในงบ",
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          previousAmount: { type: Type.NUMBER, description: "ยอดปีก่อนหน้า (ถ้ามี)" },
          percentageChange: { type: Type.NUMBER, description: "% การเปลี่ยนแปลง (ถ้ามี)" },
          type: { type: Type.STRING, enum: ['revenue', 'expense', 'asset', 'liability'] },
          unit: { type: Type.STRING, description: "หน่วยงานเจ้าของยอดนี้ เช่น 'Electricity', 'BusA', 'BA', 'Central' หรือ 'Overall'" },
          insight: { type: Type.STRING, description: "สาเหตุหรือข้อสังเกตสั้นๆ สำหรับรายการนี้" }
        },
        required: ["name", "amount", "type", "unit", "insight"]
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
    detailedReport: { type: Type.STRING, description: "บทวิเคราะห์เชิงลึกแบบบรรยาย (Markdown) ให้วิเคราะห์เจาะลึกรายการที่เพิ่ม/ลด ผิดปกติ" },
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
    1. วิเคราะห์ข้อมูลการเงินที่ได้รับ (รองรับทั้งไฟล์ภาพ, PDF, Excel, CSV)
    2. **การแยกหน่วยงาน (Unit Separation):** ให้พยายามแยกแยะข้อมูลตามหน่วยงานอย่างละเอียด เช่น:
       - การไฟฟ้า (Electricity)
       - เดินรถ/ขนส่ง (BusA / BA / Transportation)
       - ส่วนกลาง (Central / Overall)
       หากไม่ระบุชัดเจนให้ใช้ 'Overall'
    3. **การจัดประเภทบัญชี:** ระบุประเภทให้ถูกต้อง (Revenue, Expense, Asset, Liability)
    4. **Significant Variance Analysis:** คำนวณหา % การเปลี่ยนแปลง (Year-over-Year) และให้ Insight ว่าทำไมรายการนี้ถึงสำคัญ
    5. วิเคราะห์สภาพคล่อง (Liquidity) และ อัตราส่วนทางการเงิน (Ratios)
    6. พยากรณ์แนวโน้ม (Trend)
    
    Output: JSON ตาม Schema
    Language: ภาษาไทย (ทางการ, ศัพท์บัญชีที่ถูกต้อง)
  `;

  const parts: any[] = [{ text: prompt }];

  if (file) {
    const fileType = file.type;
    
    if (fileType === 'application/pdf') {
       // รองรับ PDF
       const base64Data = await fileToBase64(file);
       parts.push({
         inlineData: {
           mimeType: 'application/pdf',
           data: base64Data
         }
       });
    } else if (fileType.includes('image')) {
       // รองรับ Image
       const base64Data = await fileToBase64(file);
       parts.push({
         inlineData: {
           mimeType: fileType, // 'image/jpeg', 'image/png'
           data: base64Data
         }
       });
    } else if (fileType.includes('sheet') || fileType.includes('excel')) {
       // รองรับ Excel -> แปลงเป็น Text CSV ส่งให้ AI
       const csvData = await parseExcel(file);
       parts.push({ text: `ข้อมูลจากไฟล์ Excel (แปลงเป็น CSV): \n${csvData}` });
    } else if (fileType.includes('csv') || fileType.includes('text')) {
       // รองรับ CSV/Text
       const txtData = await parseTextFile(file);
       parts.push({ text: `ข้อมูลจากไฟล์: \n${txtData}` });
    } else {
       // Fallback ลองอ่านเป็น text
       try {
         const txtData = await parseTextFile(file);
         parts.push({ text: `ข้อมูลไฟล์: \n${txtData}` });
       } catch (e) {
         throw new Error("ไม่รองรับประเภทไฟล์นี้");
       }
    }
  }

  if (textData) {
    parts.push({ text: `ข้อมูลเพิ่มเติม (User Input): ${textData}` });
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
      }
    });

    const resultText = response.text;
    if (!resultText) throw new Error("No response from AI");

    return JSON.parse(resultText) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("เกิดข้อผิดพลาดในการวิเคราะห์: " + (error as Error).message);
  }
};