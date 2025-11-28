import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import { analyzeFinancialData } from './services/geminiService';
import { AnalysisResult } from './types';

const App: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

  const handleAnalyze = async () => {
    if (!selectedFile && !inputText.trim()) {
      setError('กรุณาอัปโหลดไฟล์ภาพ หรือใส่ข้อมูลข้อความก่อนเริ่มการวิเคราะห์');
      setUploadStatus('error');
      return;
    }

    setLoading(true);
    setUploadStatus('uploading');
    setError(null);

    try {
      const analysisData = await analyzeFinancialData(selectedFile, inputText.trim() || null);
      
      setUploadStatus('success');
      // Delay slightly to show 100% progress before switching view
      setTimeout(() => {
        setResult(analysisData);
        setLoading(false);
      }, 500);

    } catch (err) {
      setError((err as Error).message);
      setUploadStatus('error');
      setLoading(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setSelectedFile(null);
    setInputText('');
    setError(null);
    setUploadStatus('idle');
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-12 font-sarabun">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-30 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-xl shadow-lg shadow-indigo-200">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 012 2h2a2 2 0 012-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tight">FinInsight AI</h1>
              <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Financial Intelligence System</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
             <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-700">Enterprise Edition</p>
                <p className="text-xs text-slate-400">v2.5.0 (Powered by Gemini)</p>
             </div>
             <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-200">
               <span className="text-xs font-bold text-indigo-700">AI</span>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {!result ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-fade-in-up mt-10">
            <div className="text-center mb-10">
              <span className="inline-block py-1 px-3 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4 border border-indigo-100">
                Next Gen Financial Analysis
              </span>
              <h2 className="text-4xl font-extrabold text-slate-900 sm:text-5xl leading-tight mb-2">
                เปลี่ยนงบการเงินที่ซับซ้อน
              </h2>
              <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 sm:text-5xl leading-tight">
                ให้เป็นข้อมูลเชิงลึกที่ทรงพลัง
              </h2>
              <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-500 leading-relaxed">
                รองรับไฟล์ <span className="font-semibold text-slate-700">Excel, CSV, PDF และรูปภาพ</span> ระบบ AI จะวิเคราะห์สภาพคล่อง 
                เจาะลึกรายบัญชี และค้นหาความผิดปกติ (Variance) แยกตามหน่วยงาน (BusA, BA, ไฟฟ้า) ให้อัตโนมัติ
              </p>
            </div>

            <div className="bg-white p-1 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
               <FileUpload 
                onFileSelect={setSelectedFile} 
                onTextChange={setInputText}
                uploadStatus={uploadStatus}
                errorMessage={error || undefined}
              />
            </div>

            <div className="flex justify-center mt-8">
              <button
                onClick={handleAnalyze}
                disabled={loading}
                className={`w-full sm:w-auto min-w-[200px] flex justify-center items-center py-4 px-8 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-lg font-bold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all transform hover:-translate-y-1 ${loading ? 'opacity-75 cursor-not-allowed transform-none' : ''}`}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    กำลังประมวลผลข้อมูล...
                  </>
                ) : (
                  <>
                    เริ่มการวิเคราะห์ทันที
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="animate-fade-in">
            <Dashboard data={result} onReset={handleReset} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;