import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface KaTeXProps {
  math: string;
  block?: boolean;
  className?: string;
}

export function Katex({ math, block = false, className = "" }: KaTeXProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      katex.render(math, containerRef.current, {
        displayMode: block, // True for full block, false for inline math
        throwOnError: false,
      });
    }
  }, [math, block]);

  return <div ref={containerRef} className={className} />;
}
