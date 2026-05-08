import { useState, useRef } from 'react';
import { CloudArrowUpIcon } from '@heroicons/react/24/outline';

interface FileUploaderProps {
  onFileSelect: (content: string) => void;
}

export default function FileUploader({ onFileSelect }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragIn = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOut = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    await processFile(file);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    if (file.type !== 'application/json') {
      alert('请上传 JSON 文件');
      return;
    }
    setFileName(file.name);
    const content = await file.text();
    onFileSelect(content);
  };

  return (
    <div
      className={`relative rounded-2xl border-2 border-dashed p-7
        ${isDragging 
          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20' 
          : 'border-slate-300 bg-white/45 dark:border-white/15 dark:bg-white/5'}
        transition-colors duration-200`}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json"
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-3.5">
        <CloudArrowUpIcon className="h-11 w-11 text-slate-400" />
        <div className="text-center">
          {fileName ? (
            <p className="text-cyan-600 dark:text-cyan-300">{fileName}</p>
          ) : (
            <>
              <p className="text-slate-600 dark:text-slate-300">
                拖拽 JSON 文件到此处，或
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-md font-medium text-cyan-600 hover:text-cyan-500
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/55
                  focus-visible:ring-offset-2 focus-visible:ring-offset-white
                  dark:text-cyan-300 dark:focus-visible:ring-offset-slate-950"
              >
                点击选择文件
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 
