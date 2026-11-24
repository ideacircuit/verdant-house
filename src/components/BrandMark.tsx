import React from 'react';

export function BrandMark({ className = 'w-7 h-7' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect x="2" y="2" width="32" height="32" rx="8" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M11 26V17C11 13.134 14.134 10 18 10C21.866 10 25 13.134 25 17V26"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M18 26V15.5M18 19.5C18 17 20 15 22.5 15M18 21.5C18 19 16 17 13.5 17"
        stroke="#B18A52"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProductImageFallback({
  name,
  category,
}: {
  name: string;
  category?: string;
}) {
  return (
    <div className="w-full h-full bg-[#E8EDE5] flex flex-col items-center justify-center p-6 text-center select-none">
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-12 h-12 text-[#34483B]/45 mb-3"
        aria-hidden="true"
      >
        <rect x="10" y="26" width="44" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
        <path d="M16 42V50M48 42V50" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M18 26V19C18 16.7909 19.7909 15 22 15H42C44.2091 15 46 16.7909 46 19V26" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      {category && (
        <span className="text-[11px] tracking-wider uppercase text-[#34483B]/65 mb-1">
          {category}
        </span>
      )}
      <span className="font-serif text-sm text-[#292D29]/80 line-clamp-2 max-w-[200px]">
        {name}
      </span>
    </div>
  );
}

export function ResilientImage({
  src,
  alt,
  className = '',
  fallbackName,
  fallbackCategory,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackName: string;
  fallbackCategory?: string;
}) {
  const [errored, setErrored] = React.useState(false);

  if (!src || errored) {
    return <ProductImageFallback name={fallbackName} category={fallbackCategory} />;
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setErrored(true)}
      className={className}
    />
  );
}
