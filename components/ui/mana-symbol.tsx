import Image from 'next/image';

interface ManaSymbolProps {
  symbol: string; // e.g., "{W}", "W", "{3}", "3"
  className?: string;
  size?: number;
}

export function ManaSymbol({ symbol, className = '', size = 16 }: ManaSymbolProps) {
  // Normalize symbol: remove braces and slashes for filename
  const cleanSymbol = symbol
    .replace('{', '')
    .replace('}', '')
    .replace('/', '');

  // Handle generic numbers that might not have a specific SVG if not 0-16
  // For now, we assume we have 0-16 and 20. If it's a number we don't have, 
  // we might want to render text or a default generic circle.
  // But our fetch script covered 0-16 and 20.
  
  // Construct path
  const src = `/mana/${cleanSymbol}.svg`;

  return (
    <span 
      className={`inline-flex items-center justify-center select-none ${className}`}
      title={`Mana: ${symbol}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={symbol}
        width={size}
        height={size}
        className="w-full h-full"
        onError={(e) => {
            // Fallback to text if image fails (though standard Next.js Image onError is a bit tricky on client)
            // Ideally we'd have a fallback component, but for now relying on the file existing.
            e.currentTarget.style.display = 'none';
        }}
      />
    </span>
  );
}

interface ManaCostProps {
  manaCost: string; // e.g., "{3}{U}{U}"
  className?: string;
  size?: number;
}

export function ManaCost({ manaCost, className = '', size = 16 }: ManaCostProps) {
  if (!manaCost) return null;

  // Split by braces to get individual symbols
  // Match things inside {} including the braces
  const symbols = manaCost.match(/\{[^{}]+\}/g) || [];

  if (symbols.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-[1px] ${className}`}>
      {symbols.map((sym, index) => (
        <ManaSymbol key={`${sym}-${index}`} symbol={sym} size={size} />
      ))}
    </div>
  );
}
