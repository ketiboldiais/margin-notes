import Link from "next/link";
import { ReactNode } from "react";

export default function MdxLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      <article>{children}</article>
      <footer>Ketib Oldiais © 2026</footer>
    </div>
  );
}
