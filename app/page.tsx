import { directory, DirectoryRender } from "@/directory";

export default function Home() {
  return (
    <>
      <main>
        <article className="main">
          <h1>Margin Notes</h1>
          <p>
            This is a collection of my notes from undergrad and grad school,
            alongside some personal musings.
          </p>
          {DirectoryRender({ list: directory, preceding_string: "pages" })}
        </article>
      </main>
      <footer>Ketib Oldiais © 2026</footer>
    </>
  );
}
