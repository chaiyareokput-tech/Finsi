import React, { useState, useEffect, useCallback } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File | null) => void;
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error';
  errorMessage?: string;
}

const MAX_FILE_SIZE_MB = 10;

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, uploadStatus, errorMessage }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileType, setFileType] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

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

  const validateAndSetFile = (file: File) => {
    // ตรวจสอบขนาดไฟล์
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      alert(`ไฟล์มีขนาดใหญ่เกินไป (${(file.size / 1024 / 1024).toFixed(2)} MB) กรุณาใช้ไฟล์ไม่เกิน ${MAX_FILE_SIZE_MB} MB`);
      return;
    }
    setFileName(file.name);
    
    // Determine type for icon
    if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        setFileType('pdf');
    } else if (file.name.toLowerCase().match(/\.(xlsx|xls)$/) || file.type.includes('sheet') || file.type.includes('excel')) {
        setFileType('excel');
    } else if (file.name.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/) || file.type.includes('image')) {
        setFileType('image');
    } else {
        setFileType('other');
    }

    onFileSelect(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
      // Clear data transfer items
      e.dataTransfer.clearData();
    }
  }, [onFileSelect]);

  const renderFileIcon = () => {
      if (fileType === 'pdf') {
          return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          );
      } else if (fileType === 'excel') {
          return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          );
      } else {
          return (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-indigo-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
          );
      }
  }

  return (
    <div className="bg-white p-8 rounded-xl shadow-md border border-slate-200">
      <h3 className="text-xl font-bold text-slate-800 mb-2 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        อัปโหลดไฟล์งบการเงิน
      </h3>
      <p className="text-slate-500 mb-6 text-sm">รองรับไฟล์ Excel, PDF, CSV หรือรูปภาพตารางงบการเงิน (สูงสุด {MAX_FILE_SIZE_MB}MB)</p>

      <div className="mt-2">
            <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`flex justify-center px-6 pt-10 pb-10 border-2 border-dashed rounded-xl transition-all duration-200 cursor-pointer
                ${isDragging 
                    ? 'border-indigo-500 bg-indigo-50 scale-[1.02] shadow-lg ring-2 ring-indigo-200' 
                    : fileName 
                        ? 'border-indigo-300 bg-indigo-50/50' 
                        : 'border-slate-300 hover:bg-slate-50 hover:border-indigo-300'
                }`}
            >
            <div className="space-y-2 text-center pointer-events-none"> {/* pointer-events-none เพื่อไม่ให้ child elements ขัดขวาง drag events */}
                <div className="flex justify-center">
                    {fileName ? renderFileIcon() : (
                        <svg className={`mx-auto h-16 w-16 transition-colors ${isDragging ? 'text-indigo-500' : 'text-slate-400'}`} stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
                            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                </div>
                
                <div className="flex text-sm text-slate-600 justify-center">
                <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-bold text-indigo-600 hover:text-indigo-500 focus-within:outline-none pointer-events-auto"> {/* pointer-events-auto เฉพาะตรงปุ่มคลิก */}
                    <span>คลิกเพื่อเลือกไฟล์</span>
                    <input 
                        id="file-upload" 
                        name="file-upload" 
                        type="file" 
                        className="sr-only" 
                        accept=".pdf,.csv,.xlsx,.xls,image/*" 
                        onChange={handleFileChange} 
                    />
                </label>
                <p className="pl-1">หรือลากไฟล์มาวางที่นี่</p>
                </div>
                <p className={`text-xs transition-colors ${isDragging ? 'text-indigo-500 font-medium' : 'text-slate-400'}`}>
                    {isDragging ? 'วางไฟล์เพื่อเริ่มอัปโหลดทันที' : 'PDF, Excel, CSV, PNG, JPG'}
                </p>
            </div>
            </div>
            
            {fileName && (
                <div className="mt-4 flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={`p-2 rounded-lg ${fileType === 'pdf' ? 'bg-red-100' : fileType === 'excel' ? 'bg-green-100' : 'bg-indigo-100'}`}>
                            {fileType === 'pdf' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                            ) : fileType === 'excel' ? (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            )}
                        </div>
                        <span className="text-sm font-medium text-slate-700 truncate">{fileName}</span>
                    </div>
                    <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full font-medium whitespace-nowrap">พร้อมวิเคราะห์</span>
                </div>
            )}

            {/* Upload Progress */}
            {(uploadStatus === 'uploading' || uploadStatus === 'success') && (
                <div className="mt-6 animate-fade-in">
                    <div className="flex justify-between mb-2">
                        <span className="text-sm font-semibold text-indigo-700">กำลังอัปโหลดและวิเคราะห์ข้อมูล...</span>
                        <span className="text-sm font-bold text-indigo-700">{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-indigo-500 to-violet-500 h-3 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                    {uploadStatus === 'success' && (
                         <p className="text-xs text-green-600 mt-2 text-right font-medium">✨ วิเคราะห์ข้อมูลเสร็จสมบูรณ์!</p>
                    )}
                </div>
            )}
            
            {errorMessage && uploadStatus === 'error' && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start animate-shake">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <div>
                        <span className="font-bold block mb-1">เกิดข้อผิดพลาดในการอัปโหลด:</span>
                        {errorMessage}
                    </div>
                </div>
            )}
      </div>
    </div>
  );
};

export default FileUpload;