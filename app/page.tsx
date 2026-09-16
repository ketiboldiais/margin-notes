import Link from "next/link";
import { cs_links, math_links, programming_languages } from "./links";

export default function Home() {
  return (
    <>
      <main>
        <article>
          <h1>Margin Notes</h1>
          <p>
            This is a collection of my notes from undergrad and grad school,
            alongside some personal musings.
          </p>
          <h2>Mathematics</h2>
          <ul>
            {math_links.map((mathlink) => (
              <li key={mathlink.url}>
                <Link href={mathlink.url}>{mathlink.title}</Link>
              </li>
            ))}
          </ul>
          <h2>Computer Science</h2>
          <ul>
            <li>
              Programming Languages
              <ul>
                {programming_languages.map((link) => (
                  <li key={link.url}>
                    <Link href={link.url}>{link.title}</Link>
                  </li>
                ))}
              </ul>
            </li>
          </ul>
        </article>
      </main>
      <footer>Ketib Oldiais © 2026</footer>
    </>
  );
}
