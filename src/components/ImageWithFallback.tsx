import React, { useState } from 'react';
import { Train } from 'lucide-react';

interface ImageWithFallbackProps {
  src?: string;
  alt: string;
  caption?: string;
  className?: string;
  aspectClass?: string;
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  caption,
  className = '',
  aspectClass = 'aspect-[4/3]',
}) => {
  const [failed, setFailed] = useState(false);

  return (
    <figure className={`m-0 ${className}`}>
      <div className={`relative overflow-hidden bg-[#EBE8E1] border border-[#E2E0DA] ${aspectClass}`}>
        {src && !failed ? (
          <img
            src={src}
            alt={alt}
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-gradient-to-br from-[#EBE8E1] to-[#DEDAD0]">
            <Train className="w-7 h-7 text-[#525866] mb-2" aria-hidden="true" />
            <span className="text-xs font-medium text-[#525866] max-w-[22ch]">{alt}</span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="mt-2 text-xs text-[#525866] font-serif italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
