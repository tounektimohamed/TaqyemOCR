import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Body parser with 20MB limit for base64 image uploads
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Lazy initializer for Gemini client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please configure it in your Secrets/Environment tab.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Prompt text defined in Arabic for Tunisian evaluation schemas
const ANALYSIS_PROMPT = `أنت محلل ومصحح جداول تقييم مدرسية تونسية (évaluation des acquis / إسناد أعداد وتوزيع معايير).
قم بقراءة وتحليل صورة جدول المعايير وإسناد الأعداد المرفقة بدقة بالغة.

استخرج هيكله المنهجي بالكامل:
- اسم المادة (مثال: الإنتاج الكتابي، الرياضيات، التوقظ العلمي، اللغة العربية، قراءة وفهم، إلخ).
- المعايير (م1، م2، م3، م4، م5، مع1، مع2، أو معايير أخرى مكتوبة باللغة العربية أو الفرنسية).
- الحد الأقصى من التقييم لكل معيار (Max Score).
- درجات التملك أو مستويات الإسناد (مثل: تملك دون تملك، تملك أدنى، تملك متوسط، تملك أقصى، أو الرموز +++، ++-، +--، ---، أو مستويات محددة بالأعداد كـ 0، 0.5، 1، 2، 3 إلخ) مع المقابل العددي (score) لها.

تحري الدوائر وعلامات التحديد بالقلم (Circle Detection / Grader):
يرجى فحص الصورة بدقة بالغة للبحث عن أي دوائر مرسومة يدوياً بقلم جاف (أحمر، أزرق) أو قلم رصاص (red pen / blue pen / pencil circles) تحيط بأعداد أو قيم معينة في خلايا الجدول للتلاميذ المسندة إليهم أعداد.
لكل معيار مدرج، ابحث عن العدد المحاط بدائرة أو المعلم بالقلم لصفّ التقيّم الفعلي، واستخرجه بدقة متناهية وسجله في الحقل "selectedScore".
مثال: إذا كانت هناك دائرة مرسومة حول الدرجة "0.75" أو "1" في عمود المعيار، قم بتعيين قيمة "selectedScore" لتكون هذا الرقم بالذات.
إذا لم تكن هناك أي دائرة أو تحديد لهذا المعيار، فلا تضمن حقل "selectedScore" أو اجعل قيمته فارغة.

أنت مطالب بالالتزام بالقواعد التالية أثناء الاستخراج:
1. استخرج المادة بدقة واسم كل جدول.
2. احرص على استخراج جميع مستويات الإسناد والتقييم وقيم الأعداد الخاصة بها (دائماً أرقام عشرية float).
3. الرموز والمستويات (label) يجب أن تكون متطابقة مع ما هو مذكور في الصورة (مثل الوجوه الضاحكة، الرموز ++، +-، أو نصوص "تملك تام").
4. في حالة وجود تدرج درجات للمعيار الواحد، أضف الدرجات لكل مستوى بدقة.
5. استرجع البيانات مستوفية لجميع الجداول الموجودة في الصورة.`;

// API routes first
app.post("/api/parse-rubric", async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Image data is required" });
    }

    const ai = getGeminiClient();

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: imageBase64,
      },
    };

    const textPart = {
      text: ANALYSIS_PROMPT,
    };

    // Use gemini-3.5-flash as recommended for general multimodal OCR and JSON tasks
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subject: {
              type: Type.STRING,
              description: "اسم المادة المدرسية إن وجد (مثل: الإنتاج الكتابي، إيقاظ علمي، رياضيات، لغة عربية)",
            },
            tables: {
              type: Type.ARRAY,
              description: "مجموعة الجداول أو المكونات التقييمية المستخرجة",
              items: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "اسم الجدول أو الجزء في شبكة التقييم (مثال: جدول المعايير، معايير الحد الأدنى)",
                  },
                  criteria: {
                    type: Type.ARRAY,
                    description: "قائمة معايير التقييم داخل هذا الجدول",
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        name: {
                          type: Type.STRING,
                          description: "اسم المعيار أو الكود التعريفي له (مثال: معيار 1: ملائمة الإنتاج، م1، مع2)",
                        },
                        max: {
                          type: Type.NUMBER,
                          description: "العدد الأقصى المقابل للمعيار (مثلاً 5، 10، 20)",
                        },
                        levels: {
                          type: Type.ARRAY,
                          description: "مستويات إسناد التقييم ومقابل الأعداد المقترنة بكل مستوى",
                          items: {
                            type: Type.OBJECT,
                            properties: {
                              label: {
                                type: Type.STRING,
                                description: "رمز أو وصف المستوى (مثال: +++، +--، تملك أدنى، م.ت، م.ت. جـ)",
                              },
                              score: {
                                type: Type.NUMBER,
                                description: "العدد أو الدرجة المسندة لهذا المستوى الفعلي بـ float (مثال: 0.5، 1.5، 4)",
                              },
                            },
                            required: ["label", "score"],
                          },
                        },
                        selectedScore: {
                          type: Type.NUMBER,
                          description: "العدد أو الدرجة المحددة أو المحاطة بدائرة يدوية لهذا المعيار إن وجدت بالصورة (مثال: 0.75، 0.5، 1، 2). لا تضمنه إذا لم يكن هناك دائرة بالقلم.",
                        },
                      },
                      required: ["name", "max", "levels"],
                    },
                  },
                },
                required: ["name", "criteria"],
              },
            },
          },
          required: ["tables"],
        },
      },
    });

    const parsedText = response.text;
    if (!parsedText) {
      throw new Error("No response output generated from Gemini model.");
    }

    try {
      const data = JSON.parse(parsedText);
      res.json(data);
    } catch {
      // Return raw response error if JSON is unparseable (unlikely with responseSchema)
      return res.status(500).json({ error: "Failed to parse JSON response structural template", rawText: parsedText });
    }
  } catch (error: any) {
    console.error("Error parsing rubric image via Gemini:", error);
    res.status(500).json({ error: error.message || "An error occurred while analyzing the rubric." });
  }
});

// Configure Vite middleware or serve static built files
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve index.html for all non-API paths
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || "development"} mode`);
  });
}

startServer();
