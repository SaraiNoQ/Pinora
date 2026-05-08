interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title: string;
}

export default function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* 模态框内容 */}
      <div className="relative m-3.5 w-full max-w-md rounded-2xl
        border border-white/70 bg-white/85 p-5
        shadow-[0_30px_90px_-45px_rgba(15,23,42,0.9)]
        backdrop-blur-2xl
        dark:border-white/10 dark:bg-slate-900/85
        transform">
        {/* 标题 */}
        <h3 className="mb-3.5 text-lg font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h3>
        
        {children}
      </div>
    </div>
  );
} 
