import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Calculator,
  Printer,
  RotateCcw,
  FileText,
  CheckCircle,
  AlertCircle,
  User,
  Award,
  Info,
  X,
  Plus,
  Trash2,
  Edit2,
  Check,
  FileCheck2,
  BookOpen,
  GraduationCap
} from "lucide-react";

// Types corresponding to schema
interface Level {
  label: string;
  score: number;
}

interface Criterion {
  name: string;
  max: number;
  levels: Level[];
  selectedScore?: number;
}

interface Table {
  name: string;
  criteria: Criterion[];
}

interface ParsingResult {
  subject: string;
  tables: Table[];
}

// Ministry curriculum constants
const DEFAULT_TUNISIAN_LEVELS: Level[] = [
  { label: "تملك تام (+++)", score: 5 },
  { label: "تملك متوسط (++-)", score: 3.5 },
  { label: "تملك أدنى (+--)", score: 1.5 },
  { label: "دون التملك (---)", score: 0 }
];

// Presets representing highly precise Tunisian primary school rubrics
const PRESETS: Record<string, ParsingResult> = {
  written_production: {
    subject: "الإنتاج الكتابي - السادسة ابتدائي",
    tables: [
      {
        name: "شبكة تقييم معايير الحد الأدنى للإنتاج الكتابي",
        criteria: [
          {
            name: "المعيار 1 (مع1): ملائمة المنتج للوضعية المصوغة",
            max: 3,
            levels: [
              { label: "تملك تام (+++)", score: 3.0 },
              { label: "تملك متوسط (++-)", score: 2.0 },
              { label: "تملك أدنى (+--)", score: 1.0 },
              { label: "دون التملك (---)", score: 0.0 }
            ]
          },
          {
            name: "المعيار 2 (مع2): سلامة بناء الجمل والفقرة",
            max: 5,
            levels: [
              { label: "تملك تام (+++)", score: 5.0 },
              { label: "تملك متوسط (++-)", score: 3.5 },
              { label: "تملك أدنى (+--)", score: 1.5 },
              { label: "دون التملك (---)", score: 0.0 }
            ]
          },
          {
            name: "المعيار 3 (مع3): الاستعمال الصحيح لأدوات الربط واللغة",
            max: 5,
            levels: [
              { label: "تملك تام (+++)", score: 5.0 },
              { label: "تملك متوسط (++-)", score: 3.5 },
              { label: "تملك أدنى (+--)", score: 1.5 },
              { label: "دون التملك (---)", score: 0.0 }
            ]
          },
          {
            name: "المعيار 4 (مع4): ثراء الأسلوب وجودة الابتكار طرافة وطرافة الأفكار",
            max: 2,
            levels: [
              { label: "تملك تام (+++)", score: 2.0 },
              { label: "تملك متوسط (++-)", score: 1.5 },
              { label: "تملك أدنى (+--)", score: 0.5 },
              { label: "دون التملك (---)", score: 0.0 }
            ]
          }
        ]
      }
    ]
  },
  math_grade_5: {
    subject: "الرياضيات - الخامسة ابتدائي",
    tables: [
      {
        name: "شبكة تقييم الأداء في مادة الرياضيات (حل المسائل)",
        criteria: [
          {
            name: "المعيار 1 (مع1): التأويل الملائم للوضعية الرياضية",
            max: 5,
            levels: [
              { label: "تملك تام (+++)", score: 5.0 },
              { label: "تملك متوسط (++-)", score: 3.5 },
              { label: "تملك أدنى (+--)", score: 1.5 },
              { label: "دون التملك (---)", score: 0.0 }
            ]
          },
          {
            name: "المعيار 2 (مع2): صحة الحساب وصيغ الحلول",
            max: 10,
            levels: [
              { label: "تملك تام (+++)", score: 10.0 },
              { label: "تملك متوسط (++-)", score: 7.0 },
              { label: "تملك أدنى (+--)", score: 3.0 },
              { label: "دون التملك (---)", score: 0.0 }
            ]
          },
          {
            name: "المعيار 3 (مع3): دقة الرسوم الهندسية وصيغ القياس",
            max: 5,
            levels: [
              { label: "تملك تام (+++)", score: 5.0 },
              { label: "تملك متوسط (++-)", score: 3.5 },
              { label: "تملك أدنى (+--)", score: 1.5 },
              { label: "دون التملك (---)", score: 0.0 }
            ]
          }
        ]
      }
    ]
  }
};

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageType, setImageType] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsingResult | null>(null);
  
  // selections structure: { `${tableIndex}-${criterionIndex}`: Level }
  const [selections, setSelections] = useState<Record<string, Level>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"upload" | "result" | "grading">("upload");
  const fileRef = useRef<HTMLInputElement>(null);

  // Teacher metadata inputs
  const [studentName, setStudentName] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [studentId, setStudentId] = useState("");

  // Editor states to allow modifying the criteria manually directly in-app
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectText, setSubjectText] = useState("");
  const [editingCriterionPath, setEditingCriterionPath] = useState<{ ti: number; ci: number } | null>(null);
  const [tempCriterionName, setTempCriterionName] = useState("");
  const [tempCriterionMax, setTempCriterionMax] = useState<number>(0);

  const handleFile = (file: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result as string;
      setImage(dataUrl);
      const base64 = dataUrl.split(",")[1];
      const mime = file.type || "image/jpeg";
      setImageBase64(base64);
      setImageType(mime);
      setParsed(null);
      setSelections({});
      setPhase("upload");
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const parseImage = async () => {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/parse-rubric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64,
          mimeType: imageType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `خطأ في الاتصال بالسيرفر (${response.status})`);
      }

      const result: ParsingResult = await response.json();
      if (!result || !result.tables || result.tables.length === 0) {
        throw new Error("لم يتمكن الذكاء الاصطناعي من العثور على جداول تقييم صالحة في هذه الصورة. يرجى تجربة صورة أوضح.");
      }

      setParsed(result);
      setSubjectText(result.subject || "مادة غير محددة");
      
      // Initialize selection table with automatic detection of drawn circles
      const initialSelections: Record<string, Level> = {};
      result.tables.forEach((t, ti) => {
        t.criteria.forEach((c, ci) => {
          let preselectedLevel: Level | null = null;
          if (c.selectedScore !== undefined && c.selectedScore !== null) {
            // Find level with matching score (e.g. within small margin because of float representations)
            const matched = c.levels.find(l => Math.abs(l.score - (c.selectedScore as number)) < 0.05);
            if (matched) {
              preselectedLevel = matched;
            } else if (c.levels.length > 0) {
              // Fail-safe: choose closest score
              preselectedLevel = c.levels.reduce((prev, curr) => 
                Math.abs(curr.score - (c.selectedScore as number)) < Math.abs(prev.score - (c.selectedScore as number)) ? curr : prev
              );
            }
          }
          initialSelections[`${ti}-${ci}`] = preselectedLevel as any;
        });
      });
      setSelections(initialSelections);
      setPhase("result");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشلت عملية التحليل لسبب مجهول. يرجى التأكد من تشغيل السيرفر والمحاولة مجدداً.");
    } finally {
      setLoading(false);
    }
  };

  const loadPreset = (presetKey: keyof typeof PRESETS) => {
    const selectedPreset = PRESETS[presetKey];
    setParsed(JSON.parse(JSON.stringify(selectedPreset))); // deep copy
    setSubjectText(selectedPreset.subject);
    setImage(null);
    setImageBase64(null);
    setError(null);
    
    const initialSelections: Record<string, Level> = {};
    selectedPreset.tables.forEach((t, ti) => {
      t.criteria.forEach((c, ci) => {
        initialSelections[`${ti}-${ci}`] = null as any;
      });
    });
    setSelections(initialSelections);
    setPhase("result");
  };

  const selectLevelValue = (ti: number, ci: number, level: Level) => {
    setSelections((prev) => ({
      ...prev,
      [`${ti}-${ci}`]: level,
    }));
  };

  const getTotalScoreAndMax = () => {
    let currentScore = 0;
    let totalMax = 0;
    if (!parsed) return { score: 0, max: 0 };

    parsed.tables.forEach((table, ti) => {
      table.criteria.forEach((c, ci) => {
        totalMax += c.max;
        const key = `${ti}-${ci}`;
        const selected = selections[key];
        if (selected) {
          currentScore += selected.score;
        }
      });
    });

    return { score: currentScore, max: totalMax };
  };

  const handlePrint = () => {
    window.print();
  };

  const resetAllSelections = () => {
    if (!parsed) return;
    const initialSelections: Record<string, Level> = {};
    parsed.tables.forEach((t, ti) => {
      t.criteria.forEach((c, ci) => {
        initialSelections[`${ti}-${ci}`] = null as any;
      });
    });
    setSelections(initialSelections);
  };

  // Logic to add a new custom criterion to the parsed table
  const addNewCriterion = (tableIndex: number) => {
    if (!parsed) return;
    const updated = { ...parsed };
    const newCrit: Criterion = {
      name: "معيار تقييمي جديد",
      max: 5,
      levels: [
        { label: "تملك تام (+++)", score: 5.0 },
        { label: "تملك متوسط (++-)", score: 3.5 },
        { label: "تملك أدنى (+--)", score: 1.5 },
        { label: "دون التملك (---)", score: 0.0 }
      ]
    };
    updated.tables[tableIndex].criteria.push(newCrit);
    setParsed(updated);
    setSelections((prev) => ({
      ...prev,
      [`${tableIndex}-${updated.tables[tableIndex].criteria.length - 1}`]: null as any
    }));
  };

  // Logic to delete a criterion from the table
  const deleteCriterion = (tableIndex: number, criterionIndex: number) => {
    if (!parsed) return;
    const updated = { ...parsed };
    updated.tables[tableIndex].criteria.splice(criterionIndex, 1);
    setParsed(updated);
    
    // rebuild selections keys
    const newSel: Record<string, Level> = {};
    updated.tables.forEach((t, ti) => {
      t.criteria.forEach((c, ci) => {
        // map old index to new index if same table
        const oldKey = ti === tableIndex && ci >= criterionIndex ? `${ti}-${ci + 1}` : `${ti}-${ci}`;
        newSel[`${ti}-${ci}`] = selections[oldKey] || null;
      });
    });
    setSelections(newSel);
  };

  // Edit criterion popup mode
  const startEditingCriterion = (ti: number, ci: number, c: Criterion) => {
    setEditingCriterionPath({ ti, ci });
    setTempCriterionName(c.name);
    setTempCriterionMax(c.max);
  };

  const saveEditedCriterion = () => {
    if (!parsed || !editingCriterionPath) return;
    const { ti, ci } = editingCriterionPath;
    const updated = { ...parsed };
    const crit = updated.tables[ti].criteria[ci];
    
    // if max score changed, scale the level scores proportionally
    const previousMax = crit.max;
    crit.name = tempCriterionName;
    crit.max = tempCriterionMax;
    
    if (previousMax > 0 && tempCriterionMax !== previousMax) {
      const scale = tempCriterionMax / previousMax;
      crit.levels = crit.levels.map(l => ({
        label: l.label,
        score: Math.round(l.score * scale * 100) / 100 // round to 2 decimals
      }));
    }

    setParsed(updated);
    // Refresh selection if score scaling modified the active selection score
    const key = `${ti}-${ci}`;
    const activeSelected = selections[key];
    if (activeSelected) {
      const matchingLevel = crit.levels.find(l => l.label === activeSelected.label);
      if (matchingLevel) {
        setSelections(prev => ({ ...prev, [key]: matchingLevel }));
      }
    }

    setEditingCriterionPath(null);
  };

  const { score: currentTotal, max: totalAvailable } = getTotalScoreAndMax();
  
  // Calculate percentage
  const percentage = totalAvailable > 0 ? (currentTotal / totalAvailable) * 100 : 0;
  
  // Check if all fields are graded
  const parsedCriteriaCount = parsed
    ? parsed.tables.reduce((sum, t) => sum + t.criteria.length, 0)
    : 0;
  const gradedCriteriaCount = Object.keys(selections).filter(
    (k) => selections[k] !== null && selections[k] !== undefined
  ).length;

  const isGradingComplete = parsedCriteriaCount > 0 && gradedCriteriaCount === parsedCriteriaCount;

  // Grade color tiering
  const getProgressColor = () => {
    if (percentage >= 85) return "bg-emerald-500 text-emerald-500 border-emerald-500/20";
    if (percentage >= 65) return "bg-indigo-500 text-indigo-500 border-indigo-500/20";
    if (percentage >= 45) return "bg-amber-500 text-amber-500 border-amber-500/20";
    return "bg-rose-500 text-rose-500 border-rose-500/20";
  };

  const getPercentageColorText = () => {
    if (percentage >= 85) return "text-emerald-400";
    if (percentage >= 65) return "text-indigo-400";
    if (percentage >= 45) return "text-amber-400";
    return "text-rose-400";
  };

  return (
    <div className="min-h-screen bg-[#0a0a0e] text-[#e8e8f0] font-sans selection:bg-[#6c63ff]/30 selection:text-white" dir="rtl">
      
      {/* Dynamic Background Accents */}
      <div className="absolute top-0 right-0 left-0 h-[450px] bg-gradient-to-b from-[#151525]/35 via-slate-950/0 to-slate-950 pointer-events-none z-0" />
      <div className="absolute top-20 left-10 w-96 h-96 bg-[#6c63ff]/10 rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute top-40 right-10 w-80 h-80 bg-[#9c5fff]/10 rounded-full filter blur-[100px] pointer-events-none z-0" />

      {/* Header Bar */}
      <header className="relative z-10 border-b border-[#1e1e2e] bg-[#0a0a0e]/70 backdrop-blur-xl px-6 py-4 print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#6c63ff]/15 border border-[#6c63ff]/30 flex items-center justify-center text-[#a89fff] shadow-lg shadow-black/40">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black tracking-widest text-[#a89fff] bg-[#6c63ff]/15 px-2 py-0.5 rounded-md uppercase">AI-POWERED ANALYSIS · تقييم</span>
              </div>
              <h1 className="text-xl font-black text-white tracking-tight">محلل جداول التنقيط ومعايير التقييم للتعليم التونسي</h1>
            </div>
          </div>

          {/* Quick presets shortcut */}
          <div className="flex items-center gap-2 bg-[#151520]/80 p-1.5 rounded-lg border border-[#6c63ff]/20">
            <span className="text-xs text-slate-400 px-2 font-medium">جرب عينة فورية لشبكة المعايير:</span>
            <button
              onClick={() => loadPreset("written_production")}
              className="px-3 py-1 text-xs font-extrabold rounded-md bg-[#6c63ff]/15 hover:bg-[#6c63ff]/25 text-[#a89fff] border border-[#6c63ff]/30 transition-all duration-200 cursor-pointer"
            >
              الإنتاج الكتابي (6)
            </button>
            <button
              onClick={() => loadPreset("math_grade_5")}
              className="px-3 py-1 text-xs font-extrabold rounded-md bg-[#9c5fff]/15 hover:bg-[#9c5fff]/25 text-[#a89fff] border border-[#9c5fff]/30 transition-all duration-200 cursor-pointer"
            >
              الرياضيات (5)
            </button>
          </div>

        </div>
      </header>

      {/* Print Friendly Style Override */}
      <style>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
          }
          .print-card {
            background: white !important;
            color: black !important;
            border: 1px solid #ddd !important;
            box-shadow: none !important;
          }
          .print-bg-slate {
            background-color: #f8fafc !important;
          }
          .print-border-indigo {
            border-color: #4f46e5 !important;
          }
        }
      `}</style>

      {/* Main Content Layout */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 py-8 pointer-events-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Right Input & Upload Panel (takes 5 cols on desktop, full on mobile) */}
          <div className="lg:col-span-5 flex flex-col gap-6 print:hidden">
            
            {/* 1. App Introduction Card */}
            <div className="glass rounded-2xl p-6 shadow-xl backdrop-blur-md">
              <h2 className="text-lg font-black text-slate-100 mb-2 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[#a89fff]" />
                <span>كيف يعمل التطبيق؟</span>
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                ارفع صورة لشبكة التقييم التونسية أو جدول توزيع أعداد المعايير. سيقوم الذكاء الاصطناعي بقراءة وتفصيل المعايير وسلالم الأعداد المناسبة بشكل فوري لتمكينك من تقييم التلاميذ بنقرة زر وحساب المجموع تلقائياً.
              </p>
              
              <div className="mt-4 p-4 rounded-xl bg-[#151520]/60 border border-[#6c63ff]/20 text-xs text-slate-400 space-y-2">
                <div className="flex gap-2 items-start">
                  <span className="text-[#a89fff] font-bold">✓</span>
                  <span>يدعم استخراج أنظمة تدرج مستويات التملّك (<b className="text-slate-205 text-white">+++، ++-، +--، ---</b>) المعتمدة رسمياً.</span>
                </div>
                <div className="flex gap-2 items-start">
                  <span className="text-[#a89fff] font-bold">✓</span>
                  <span>يمكّنك من تعديل الدرجات والمعايير أو إضافتها لضمان المرونة الكاملة.</span>
                </div>
              </div>
            </div>

            {/* 2. Upload Zone Card */}
            <div className="glass rounded-2xl p-6 shadow-xl flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-300">تحميل شبكة التقييم</h3>
                {image && (
                  <button
                    onClick={() => {
                      setImage(null);
                      setImageBase64(null);
                      setParsed(null);
                      setPhase("upload");
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-all duration-150 cursor-pointer"
                  >
                    <X className="h-3 w-3" />
                    <span>إلغاء الصورة</span>
                  </button>
                )}
              </div>

              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-300 group
                  ${image 
                    ? "border-[#6c63ff]/55 bg-[#6c63ff]/5" 
                    : "border-[#2a2a3a] hover:border-[#6c63ff] bg-[#151520]/40 hover:bg-[#151520]/60"
                  }`}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFile(e.target.files[0]);
                    }
                  }}
                />

                {image ? (
                  <div className="flex flex-col items-center gap-3">
                    <img
                      src={image}
                      alt="Uploaded preview"
                      className="max-h-48 rounded-lg object-contain border border-[#1e1e2e] shadow-xl"
                    />
                    <div className="text-xs text-[#a89fff] font-bold bg-[#6c63ff]/15 px-3 py-1 rounded-full flex items-center gap-1.5">
                      <ImageIcon className="h-3.5 w-3.5" />
                      <span>تم تحميل الصورة بنجاح</span>
                    </div>
                    <span className="text-[10px] text-slate-500">انقر لتغيير الصورة الحالية أو اسحب ملفاً جديداً</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-4">
                    <div className="h-12 w-12 rounded-xl bg-[#151520] flex items-center justify-center text-slate-400 border border-[#2a2a3a] mb-3 group-hover:text-[#6c63ff] group-hover:scale-110 transition-all duration-300">
                      <Upload className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-bold text-slate-300 mb-1">اسحب وأفلت صورة جدول التقييم هنا</p>
                    <span className="text-xs text-slate-500">أو اضغط للتصفح من على جهازك</span>
                    <span className="text-[10px] bg-[#151520] border border-[#2a2a3a] px-2 py-0.5 rounded text-slate-400 mt-4">JPG, PNG أو WEBP</span>
                  </div>
                )}
              </div>

              {image && phase === "upload" && (
                <button
                  onClick={parseImage}
                  disabled={loading}
                  className="w-full mt-2 btn-gradient font-bold disabled:opacity-50 py-3 rounded-xl shadow-lg shadow-[#6c63ff33] text-white flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <div className="h-4.5 w-4.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جاري المعالجة وقراءة المعايير...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4.5 w-4.5" />
                      <span>تحليل الجدول باستخدام الذكاء الاصطناعي</span>
                    </>
                  )}
                </button>
              )}

              {loading && (
                <div className="p-4 rounded-xl bg-[#6c63ff]/10 border border-[#6c63ff]/20 flex flex-col gap-3">
                  <div className="flex items-center gap-2 text-[#a89fff] font-bold text-xs animate-pulse">
                    <Sparkles className="h-4 w-4" />
                    <span>Gemini يحلل الصورة الآن</span>
                  </div>
                  <div className="w-full bg-[#151520] h-1 rounded-full overflow-hidden">
                    <div className="bg-gradient-to-r from-[#6c63ff] to-[#9c5fff] h-full animate-[loading_2s_infinite]" />
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    نقوم بالتعرف على رموز المعايير (م1، م2...)، الأعداد القصوى، ومستويات توزيع النقاط بدقة متناهية. قد يستغرق ذلك بضع ثوانٍ.
                  </p>
                </div>
              )}

              {error && (
                <div className="p-4 rounded-xl bg-rose-950/15 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="h-4.5 w-4.5 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-1">فشل استخراج الجدول</span>
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Interactive Preview of Active Upload (If any) */}
            {image && phase !== "upload" && (
              <div className="glass rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-400">الصورة النشطة المعتمدة في التقييم:</span>
                <div className="relative rounded-lg overflow-hidden border border-[#2a2a3a]">
                  <img
                    src={image}
                    alt="Active worksheet"
                    className="max-h-60 w-full object-cover filter brightness-90 hover:brightness-100 transition-all"
                  />
                  <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur border border-[#2a2a3a] px-2 py-1 rounded text-[10px] text-slate-300 flex items-center gap-1.5">
                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                    <span>تم تحليل مستند المعايير</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Helper Tip */}
            <div className="bg-[#151520]/30 border border-[#2a2a3a] rounded-xl p-4 text-[11px] text-slate-500 flex items-start gap-2">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <span>مستوحى من نظام التقييم الرسمي لوزارة التربية التونسية. يسهل استخراج أعداد مواضيع التقييم وتعبئة الدفتر المدرسي.</span>
            </div>

          </div>

          {/* Left / Grading & Reports Area (takes 7 cols on desktop, full on mobile) */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* If NO TABLE is parsed or loaded yet, show the empty state instructions */}
            {!parsed ? (
              <div className="glass rounded-2xl p-12 text-center h-full flex flex-col items-center justify-center shadow-inner relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-48 h-48 bg-[#6c63ff]/5 rounded-full filter blur-3xl" />
                <BookOpen className="h-14 w-14 text-[#6c63ff]/20 mb-4 group-hover:text-[#a89fff] group-hover:scale-105 transition-all duration-300" />
                <span className="text-xs text-[#a89fff] tracking-wider font-extrabold uppercase mb-2">في انتظار لقطة الشاشة أو العينة</span>
                <h3 className="text-xl font-bold text-slate-201 text-white mb-2">ابدأ بتحميل شبكة التقييم الخاصة بك</h3>
                <p className="text-sm text-slate-400 max-w-sm leading-relaxed mb-6">
                  التقط صورة للشبكة المطبوعة لديك، أو انقر على أحد الأزرار النموذجية في شريط الأعلى لتحميل جدول معايير تونسية جاهزة على الفور لتجربة التطبيق.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => loadPreset("written_production")}
                    className="px-5 py-2.5 rounded-xl bg-[#6c63ff] hover:bg-[#9c5fff] text-white font-bold text-xs shadow-lg shadow-[#6c63ff]/30 cursor-pointer transition-all"
                  >
                    استخدم نموذج الإنتاج الكتابي
                  </button>
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="px-5 py-2.5 rounded-xl bg-[#151520] hover:bg-[#202030] text-slate-300 border border-[#2a2a3a] font-bold text-xs cursor-pointer transition-all"
                  >
                    اختر صورة الآن
                  </button>
                </div>
              </div>
            ) : (
              
              /* PREVIEW, EDITING, AND GRADING SYSTEM */
              <div className="flex flex-col gap-6">
                
                {/* 1. Student Identification Metadata Form */}
                <div className="glass rounded-2xl p-6 shadow-xl backdrop-blur-md print:border-none print:shadow-none print:p-0">
                  <div className="flex items-center gap-2 text-[#a89fff] font-bold text-sm mb-4 print:hidden">
                    <User className="h-4.5 w-4.5" />
                    <span>بيانات التلميذ والمؤسسة التربوية</span>
                  </div>
                  
                  {/* Print custom title when printed */}
                  <div className="hidden print:block text-center border-b-2 border-slate-800 pb-4 mb-6">
                    <h2 className="text-2xl font-black text-black">بطاقة تقييم مكتسبات تلميذ</h2>
                    <p className="text-sm text-slate-600 mt-1">الجمهورية التونسية · وزارة التربية</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 print:text-black">اسم ومعهد التلميذ(ة):</label>
                      <input
                        type="text"
                        placeholder="مثال: يوسف التونسي"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full bg-[#151520]/60 border border-[#2a2a3a] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] rounded-lg px-3 py-2 text-sm text-white print:text-black print:bg-white print:border-slate-300 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 print:text-black">القسم (الصف):</label>
                      <input
                        type="text"
                        placeholder="مثال: السادسة ج"
                        value={studentClass}
                        onChange={(e) => setStudentClass(e.target.value)}
                        className="w-full bg-[#151520]/60 border border-[#2a2a3a] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] rounded-lg px-3 py-2 text-sm text-white print:text-black print:bg-white print:border-slate-300 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 print:text-black">المدرسة الابتدائية:</label>
                      <input
                        type="text"
                        placeholder="مثال: مدرسة شارع بورقيبة"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        className="w-full bg-[#151520]/60 border border-[#2a2a3a] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] rounded-lg px-3 py-2 text-sm text-white print:text-black print:bg-white print:border-slate-300 transition-all outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 print:mt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 print:text-black">اسم المعلم(ة):</label>
                      <input
                        type="text"
                        placeholder="مثال: أستاذ اللغة العربية"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        className="w-full bg-[#151520]/60 border border-[#2a2a3a] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] rounded-lg px-3 py-2 text-sm text-white print:text-black print:bg-white print:border-slate-300 transition-all outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-1.5 print:text-black">الرقم التعريفي (اختياري):</label>
                      <input
                        type="text"
                        placeholder="مثال: 0015"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                        className="w-full bg-[#151520]/60 border border-[#2a2a3a] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] rounded-lg px-3 py-2 text-sm text-white print:text-black print:bg-white print:border-slate-300 transition-all outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. SUBJECT AND TABLES DISCOVERY SECTION */}
                <div className="glass rounded-2xl p-6 shadow-xl relative overflow-hidden print:border-none print:shadow-none print:p-0">
                  
                  {/* Subject Title Block */}
                  <div className="flex justify-between items-center bg-[#151520]/65 p-4 rounded-xl border border-[#2a2a3a] mb-6 print:bg-white print:border-slate-300">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-[#6c63ff]/15 text-[#a89fff] flex items-center justify-center font-bold text-sm print:hidden">
                        <GraduationCap className="h-4 w-4" />
                      </div>
                      <div>
                        <span className="text-[10px] text-[#a89fff] font-extrabold block">المادة والموضوع المستخرج:</span>
                        {editingSubject ? (
                          <div className="flex items-center gap-2 mt-1">
                            <input
                              type="text"
                              value={subjectText}
                              onChange={(e) => setSubjectText(e.target.value)}
                              className="bg-[#151520] text-sm font-bold text-white px-2 py-1 rounded border border-[#6c63ff] outline-none w-48 lg:w-64"
                            />
                            <button
                              onClick={() => setEditingSubject(false)}
                              className="text-emerald-400 hover:text-emerald-300 p-1"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 mt-0.5">
                            <h3 className="text-base font-black text-white print:text-black">{subjectText || "غير محدد"}</h3>
                            <button
                              onClick={() => setEditingSubject(true)}
                              className="text-slate-400 hover:text-[#6c63ff] p-1 rounded-md hover:bg-slate-900 print:hidden transition-all duration-150"
                              title="تعديل اسم المادة"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] text-slate-500 block">تقدم تقييم المعايير</span>
                      <span className="text-xs font-bold text-[#a89fff] print:text-black">
                        {gradedCriteriaCount} من أصل {parsedCriteriaCount} معايير
                      </span>
                    </div>
                  </div>

                  {/* ITERATIVE TABLES RENDERING */}
                  {parsed.tables.map((table, ti) => (
                    <div key={ti} className="mb-8 last:mb-0">
                      
                      {/* Table Banner Header */}
                      <div className="flex justify-between items-center mb-4 border-r-4 border-[#6c63ff] pr-3">
                        <div>
                          <h4 className="text-sm font-black text-slate-250 text-white print:text-black">{table.name || `الجدول الفرعي ${ti + 1}`}</h4>
                          <span className="text-[10px] text-slate-500">تم استخراج عدد {table.criteria.length} معيار دراسي ضمن هذا الجدول</span>
                        </div>
                        <button
                          onClick={() => addNewCriterion(ti)}
                          className="text-xs text-[#a89fff] hover:text-white flex items-center gap-1 bg-[#6c63ff]/10 hover:bg-[#6c63ff]/20 border border-[#6c63ff]/25 px-3 py-1.5 rounded-lg transition-all duration-150 print:hidden cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>إضافة معيار مخصص</span>
                        </button>
                      </div>

                      {/* Criteria Card Grid */}
                      <div className="flex flex-col gap-4">
                        {table.criteria.length === 0 ? (
                          <div className="p-6 text-center border border-dashed border-[#2a2a3a] rounded-xl text-slate-400 text-xs">
                            لا توجد معايير في هذا الجدول المكتشف حالياً. اضغط "إضافة معيار مخصص" بالأعلى لتهيئة جدول جديد.
                          </div>
                        ) : (
                          table.criteria.map((c, ci) => {
                            const key = `${ti}-${ci}`;
                            const chosenVal = selections[key];
                            const isGraded = chosenVal !== null && chosenVal !== undefined;

                            return (
                              <div
                                key={ci}
                                className={`p-4 rounded-xl border transition-all duration-300 group/crit relative
                                  ${isGraded
                                    ? "bg-[#6c63ff]/5 border-[#6c63ff]/30 shadow-indigo-950/10"
                                    : "bg-[#151520]/40 border-[#2a2a3a] hover:border-[#6c63ff]/20"
                                  } print:bg-white print:border-slate-300 print:p-2`}
                              >
                                
                                {/* Right action buttons to Edit / Delete criterion */}
                                <div className="absolute left-3 top-3 flex items-center gap-1 opacity-0 group-hover/crit:opacity-100 transition-opacity duration-200 print:hidden">
                                  <button
                                    onClick={() => startEditingCriterion(ti, ci, c)}
                                    className="p-1.5 hover:bg-[#151520] rounded text-slate-400 hover:text-[#6c63ff] transition-colors"
                                    title="تعديل المعيار"
                                  >
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteCriterion(ti, ci)}
                                    className="p-1.5 hover:bg-rose-950/40 rounded text-slate-400 hover:text-rose-400 transition-colors"
                                    title="حذف المعيار"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>

                                {/* Criterion Meta & Header */}
                                <div className="flex justify-between items-start mb-3 gap-6">
                                  <div>
                                    <h5 className="text-sm font-extrabold text-slate-200 print:text-black">
                                      {c.name}
                                    </h5>
                                    {/* Score limit subindicator */}
                                    <span className="text-[10px] text-slate-500 font-bold mt-1 block">
                                      التقييم الأقصى المقدر لهذا المعيار: <b className="text-slate-400 print:text-black">{c.max} نقاط</b>
                                    </span>
                                  </div>

                                  {/* Right side floating indicator for selected score */}
                                  <div className="ml-1 print:ml-0">
                                    <div className={`text-xs font-mono font-black px-2.5 py-1 rounded-lg border
                                      ${isGraded
                                        ? "bg-[#6c63ff]/15 border-[#6c63ff]/25 text-[#a89fff] print:text-black print:border-slate-400"
                                        : "bg-[#151520] border-[#2a2a3a] text-slate-500 print:text-black print:border-slate-300"
                                      }`}
                                    >
                                      {isGraded ? `${chosenVal.score} / ${c.max}` : `— / ${c.max}`}
                                    </div>
                                  </div>
                                </div>

                                {/* Selectable Levels row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mt-2 print:grid-cols-4 print:gap-1">
                                  {c.levels.map((lv, li) => {
                                    const isCurrentLevel = isGraded && chosenVal.label === lv.label && chosenVal.score === lv.score;
                                    return (
                                      <button
                                        key={li}
                                        onClick={() => selectLevelValue(ti, ci, lv)}
                                        className={`px-3 py-2 rounded-lg text-xs transition-all duration-150 text-right font-medium cursor-pointer print:text-black print:p-1 level-select-btn
                                          ${isCurrentLevel
                                            ? "active text-white"
                                            : "text-slate-400"
                                          } flex items-center justify-between`}
                                      >
                                        <div className="truncate shrink">
                                          <span className="block font-bold">{lv.label}</span>
                                          <span className="text-[9px] opacity-70">الدرجة: {lv.score}</span>
                                        </div>
                                        {isCurrentLevel && <CheckCircle className="h-3.5 w-3.5 text-white shrink-0" />}
                                      </button>
                                    );
                                  })}
                                </div>

                              </div>
                            );
                          })
                        )}
                      </div>

                    </div>
                  ))}

                  {/* Summary & actions panel footer */}
                  <div className="mt-8 pt-6 border-t border-[#2a2a3a] flex flex-wrap gap-4 items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={resetAllSelections}
                        className="px-4 py-2 bg-[#151520] hover:bg-[#202030] text-slate-400 hover:text-white border border-[#2a2a3a] hover:border-[#6c63ff]/30 font-bold rounded-xl text-xs flex items-center gap-2 transition-all outline-none cursor-pointer"
                      >
                        <RotateCcw className="h-4 w-4" />
                        <span>تصفير الاختيارات</span>
                      </button>
                      <button
                        onClick={handlePrint}
                        disabled={!isGradingComplete}
                        className="px-4 py-2 btn-gradient shadow-md shadow-[#6c63ff]/20 disabled:opacity-30 disabled:pointer-events-none font-bold rounded-xl text-xs flex items-center gap-2 transition-all outline-none cursor-pointer"
                      >
                        <Printer className="h-4 w-4 text-white" />
                        <span>طباعة بطاقة التقييم</span>
                      </button>
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-[#151520] p-2 rounded-lg border border-[#2a2a3a]">
                      <FileCheck2 className="h-4 w-4 text-emerald-400" />
                      <span>{gradedCriteriaCount} من {parsedCriteriaCount} قيمت بالكامل</span>
                    </div>
                  </div>

                </div>

                {/* 3. FINAL TOTAL GRADE CARD WITH VISUAL FEEDBACK */}
                <div className="glass rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden print:border-none print:shadow-none print:p-0">
                  
                  {/* Subtle decorative glow */}
                  <div className={`absolute -right-20 -bottom-20 w-44 h-44 rounded-full filter blur-[60.5px] opacity-25 ${getProgressColor().split(" ")[0]}`} />

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                    
                    {/* Grade statistics (Col span 8) */}
                    <div className="md:col-span-8 space-y-4">
                      
                      <div>
                        <span className="text-[10px] text-[#a89fff] font-black uppercase tracking-widest block">التقييم العددي التراكمي:</span>
                        <h4 className="text-xl font-black text-white mt-1 mb-2 print:text-black">مجموع الدفتر المدرسي الحاصل</h4>
                        <p className="text-xs text-slate-400 leading-relaxed print:text-slate-600">
                          هذا المجموع الكلي يحتسب ديناميكياً استناداً للتقييمات المحددة. المعايير التونسية تحتمل إسناداً عادلاً للأعداد بناءً على مستوى التملك (تملك تام، تملك أدنى، إلخ).
                        </p>
                      </div>

                      {/* Display warning if not fully graded yet */}
                      {!isGradingComplete && (
                        <div className="p-3 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-xl text-xs flex items-center gap-2 print:hidden">
                          <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                          <span>يرجى تحديد درجة لكل معيار بالتفصيل بالأعلى لحساب المجموع التراكمي النهائي.</span>
                        </div>
                      )}

                      {/* Printable Teacher Signoff Area (Visible only on print or if complete) */}
                      <div className="hidden print:grid grid-cols-2 gap-8 text-black mt-8 text-sm pt-4 border-t border-dashed border-slate-300">
                        <div>
                          <span className="font-bold block mb-1">ملاحظات المعلم(ة):</span>
                          <div className="h-16 border border-slate-300 rounded p-2 text-xs text-slate-500 bg-slate-50">
                            ........................................................................
                          </div>
                        </div>
                        <div className="text-left py-4">
                          <p className="font-bold mb-3">توقيع المعلم(ة):</p>
                          <span className="mt-8 border-b-2 border-slate-300 w-36 inline-block"></span>
                        </div>
                      </div>

                    </div>

                    {/* Circular visual progress score badge (Col span 4) */}
                    <div className="md:col-span-4 flex flex-col items-center justify-center p-4 bg-[#151520]/45 rounded-xl border border-[#2a2a3a] min-h-[160px] print:bg-white print:border-slate-300">
                      
                      <div className="relative flex items-center justify-center h-24 w-24">
                        
                        {/* Circle backing path */}
                        <svg className="absolute w-24 h-24 transform -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            strokeWidth="6"
                            stroke="#1e1e2e"
                            fill="transparent"
                            className="print:stroke-slate-200"
                          />
                          {/* Active arc path using percentage */}
                          <circle
                            cx="48"
                            cy="48"
                            r="40"
                            strokeWidth="6"
                            stroke="currentColor"
                            fill="transparent"
                            strokeDasharray={2 * Math.PI * 40}
                            strokeDashoffset={2 * Math.PI * 40 * (1 - percentage / 100)}
                            className={`transition-all duration-[600ms] ease-out ${getPercentageColorText()}`}
                          />
                        </svg>

                        {/* Numeric score centered inside the circle */}
                        <div className="text-center z-10">
                          <span className="text-2xl font-black text-white font-mono block tracking-tight print:text-black">
                            {isGradingComplete ? currentTotal.toFixed(1) : "—"}
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold block border-t border-[#1e1e2e] mt-1 pt-0.5 print:text-black">
                            من {totalAvailable}
                          </span>
                        </div>

                      </div>

                      {/* Display Letter / Percent grade under badge */}
                      {isGradingComplete && (
                        <div className="text-center mt-3 animate-fade-in">
                          <span className={`${getPercentageColorText()} text-sm font-extrabold flex items-center justify-center gap-1`}>
                            <Award className="h-4 w-4" />
                            <span>معدل التملك {percentage.toFixed(0)}%</span>
                          </span>
                        </div>
                      )}

                    </div>

                    {/* Custom aesthetic total indicators (inspired by brutalist number style / Design HTML) */}
                    {isGradingComplete && (
                      <div className="md:col-span-12 flex items-center justify-between border-t border-[#2a2a3a] pt-4 mt-2 bg-[#6c63ff]/5 p-3 rounded-xl border border-[#6c63ff]/15">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block mb-1">المجموع النهائي الحاصل</span>
                          <span className="text-4xl font-extrabold text-[#a89fff] tracking-tight">{currentTotal.toFixed(1)}</span>
                          <span className="text-slate-550 text-slate-400 text-sm font-light"> / {totalAvailable}</span>
                        </div>
                        <div className="text-left font-mono text-[10px] text-slate-500">
                          <span>SCORE_RECOVERY_SUCCESS</span>
                        </div>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            )}

          </div>

        </div>
      </main>

      {/* 4. MODAL DIALOG - EDITING INDIVIDUAL CRITERION */}
      <AnimatePresence>
        {editingCriterionPath && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in print:hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="glass border border-[#6c63ff]/30 rounded-2xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-[#a89fff]" />
                  <span>تعديل معيار التقييم</span>
                </h3>
                <button
                  onClick={() => setEditingCriterionPath(null)}
                  className="p-1 hover:bg-[#151520] rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">نص أو اسم المعيار:</label>
                  <textarea
                    rows={3}
                    value={tempCriterionName}
                    onChange={(e) => setTempCriterionName(e.target.value)}
                    className="w-full bg-[#151520] border border-[#2a2a3a] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] rounded-lg px-3 py-2 text-sm text-white transition-all outline-none resize-none"
                    placeholder="اكتب المعيار هنا مثلاً: م1: ملاءمة الإنتاج"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">العدد الأقصى المقدر (Score limit):</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={tempCriterionMax}
                    onChange={(e) => setTempCriterionMax(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#151520] border border-[#2a2a3a] focus:border-[#6c63ff] focus:ring-1 focus:ring-[#6c63ff] rounded-lg px-3 py-2 text-sm text-white transition-all outline-none font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-relaxed">
                    * ملاحظة: سيتم تعديل وتوزيع سلالم مستويات التملك تلقائياً بشكل نسبي ومناسب للعدد الأقصى الجديد المدخل لضمان توزيع الدرجات بطريقة عادلة.
                  </p>
                </div>

                <div className="flex gap-3 pt-3">
                  <button
                    onClick={saveEditedCriterion}
                    className="flex-1 btn-gradient font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    حفظ التغييرات
                  </button>
                  <button
                    onClick={() => setEditingCriterionPath(null)}
                    className="flex-1 bg-[#151520] border border-[#2a2a3a] hover:bg-[#202030] text-slate-300 font-bold py-2.5 rounded-lg text-xs transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Minimal Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-12 border-t border-[#2a2a3a] mt-20 text-center text-xs text-slate-500 print:hidden">
        <p className="mb-2">تطبيق تقييم المعايير وإسناد الأعداد للتلاميذ التونسيين · مخصص لمدرّسي المرحلة الابتدائية والثانوية</p>
        <p className="text-slate-600">يعمل بكفاءة على جميع الأجهزة · مدعوم بالكامل بواسطة نماذج الذكاء الاصطناعي من Google Gemini</p>
      </footer>

    </div>
  );
}
