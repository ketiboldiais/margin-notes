import { directory, DirectoryRender } from "@/directory";
import Link from "next/link";

export default function Home() {
  return (
    <>
      <main>
        <article className="main">
          <h1>Margin Notes</h1>
          <p>
            This is a collection of my notes from undergrad and grad school. The animations and diagrams on this site are built with LEM, a programming language I designed and implemented. You can find its documentation <Link href="/pages/computer-science/lem-development">here</Link></p>
          {DirectoryRender({ list: directory, preceding_string: "pages" })}
        </article>
      </main>
      <footer>Ketib Oldiais © 2026</footer>
    </>
  );
}
