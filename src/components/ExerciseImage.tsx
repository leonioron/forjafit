import { useState } from 'react';
import { Dumbbell } from 'lucide-react';

interface ExerciseImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectClass?: string;
}

export function ExerciseImage({ src, alt, className = '', aspectClass = 'aspect-[16/10]' }: ExerciseImageProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div
        className={`${aspectClass} ${className} flex flex-col items-center justify-center gap-2 bg-[#161E2E] border border-white/10 text-slate-400 select-none px-3 text-center`}
      >
        <Dumbbell className="w-7 h-7 text-[#A3E635]/70" />
        <span className="text-xs font-medium text-slate-300 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <div className={`${aspectClass} ${className} relative overflow-hidden bg-white`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasError(true)}
        className="w-full h-full object-contain"
      />
    </div>
  );
}
