import React, { useState, useEffect } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  onTextChange: (text: string) => void;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const MAX_FILE_SIZE_MB = 10;

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, onTextChange, uploadStatus, errorMessage }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (uploadStatus === 'uploading') {
      setProgress(0);
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) return prev;
          return prev + 10;
        });
      }, 300);
      return () => clearInterval(interval);
    } else if (uploadStatus === 'success') {
      setProgress(100);
    } else {
      setProgress(0);
    }
  }, [uploadStatus]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      
      // ตรวจสอบขนาดไฟล์
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        alert(`ไฟล์มีขนาดใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(2)} MB) กรุณาใช้ไฟล์ไม่เกิน ${MAX_FILE_SIZE_MB} MB`);
        e.target.value = ''; // Reset input
        return;
      }

      setFileName(file.name);
      onFileSelect(file);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
      <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        นำเข้าข้อมูลทางการเงิน
      </h3>

      <div className="flex space-x-4 mb-4 border-b border-slate-200">
        <button
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'upload' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('upload')}
        >
          อัปโหลดไฟล์ (PDF, Excel, CSV, ภาพ)
        </button>
        <button
          className={`pb-2 px-1 text-sm font-medium ${activeTab === 'text' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setActiveTab('text')}
        >
          วางข้อความ
        </button>
      </div>

      {activeTab === 'upload' ? (
        <div className="mt-2">
            <div className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${fileName ? 'border-indigo-300 bg-indigo-50' : 'border-slate-300 hover:bg-slate-50'}`}>
            <div className="space-y-1 text-center">
                <svg className="mx-auto h-12 w-12 text-slate-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="flex text-sm text-slate-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none">
                    <span>เลือกไฟล์</span>
                    <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept=".pdf,.csv,.xlsx,.xls,image/*" 
                        onChange={handleFileChange} 
                    />
                </label>
                <p className="pl-1">หรือลากไฟล์มาวาง</p>
                </div>
                <p className="text-xs text-slate-500">รองรับ PDF, Excel, CSV, JPG, PNG (Max {MAX_FILE_SIZE_MB}MB)</p>
            </div>
            </div>
            
            {fileName && (
                <div className="mt-3 flex items-center justify-between p-3 bg-slate-100 rounded-lg">
                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{fileName}</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">พร้อมวิเคราะห์</span>
                </div>
            )}

            {/* Upload Progress */}
            {(uploadStatus === 'uploading' || uploadStatus === 'success') && (
                <div className="mt-4">
                    <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium text-indigo-700">ความสำเร็จของการอัปโหลดข้อมูล</span>
                        <span className="text-sm font-medium text-indigo-700">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2.5">
                        <div 
                            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    {uploadStatus === 'success' && (
                         <p className="text-xs text-green-600 mt-1 text-right">อัปโหลดและเตรียมข้อมูลสำเร็จ!</p>
                    )}
                </div>
            )}
        </div>
      ) : (
        <textarea
          className="w-full h-32 p-3 border border-slate-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          placeholder="วางข้อมูลจาก Excel หรือข้อความสรุปงบการเงินที่นี่..."
          onChange={(e) => onTextChange(e.target.value)}
        ></textarea>
      )}

      {errorMessage && uploadStatus === 'error' && (
           <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600 flex items-start">
               <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                   <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
               </svg>
               {errorMessage}
           </div>
      )}
    </div>
  );
};

export default FileUpload;