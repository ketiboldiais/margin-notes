import Link from "next/link";

export type DirectoryLink = {
  title: string;
  children: DirectoryLink[];
  hasLink?: boolean;
  isHeader?: boolean;
  isSubsection?: boolean;
};

export type Directory = DirectoryLink[];

export const directory: Directory = [
  {
    title: "Mathematics",
    isHeader: true,
    children: [
      {
        title: "Foundational Mathematics",
        children: [
          {
            title: "Mathematical Terminology",
            isSubsection: true,
            children: [],
          },
          {
            title: "Sets",
            isSubsection: true,
            children: [
              {
                title: "Set-builder Notation",
                isSubsection: true,
                children: [],
              },
              { title: "Subsets", isSubsection: true, children: [] },
              { title: "Ordered Pairs", isSubsection: true, children: [] },
              { title: "Ordered 𝑛-tuples", isSubsection: true, children: [] },
              { title: "Cartesian Products", isSubsection: true, children: [] },
            ],
          },
          {
            title: "Relations",
            isSubsection: true,
            children: [
              { title: "Inequalities", isSubsection: true, children: [] },
              {
                title: "Functions",
                isSubsection: true,
                children: [
                  {
                    title: "One-to-one Functions",
                    isSubsection: true,
                    children: [],
                  },
                  {
                    title: "Many-to-one Functions",
                    isSubsection: true,
                    children: [],
                  },
                  {
                    title: "Onto Functions",
                    isSubsection: true,
                    children: [],
                  },
                ],
              },
              {
                title: "Number Sets",
                isSubsection: true,
                children: [
                  {
                    title: "The Natural Numbers",
                    isSubsection: true,
                    children: [],
                  },
                  { title: "The Integers", isSubsection: true, children: [] },
                  { title: "The Rationals", isSubsection: true, children: [] },
                  {
                    title: "Real Algebraic Numbers",
                    isSubsection: true,
                    children: [],
                  },
                  { title: "Real Numbers", isSubsection: true, children: [] },
                  {
                    title: "Imaginary Numbers",
                    isSubsection: true,
                    children: [],
                  },
                  {
                    title: "Complex Numbers",
                    isSubsection: true,
                    children: [],
                  },
                  {
                    title: "Algebraic Numbers",
                    isSubsection: true,
                    children: [],
                  },
                  {
                    title: "Transcendental Numbers",
                    isSubsection: true,
                    children: [],
                  },
                ],
              },
              {title: "Intervals", isSubsection: true, children: []},
              {title: "Absolute Value", isSubsection: true, children: []},
            ],
          },
          {title: "Equations", isSubsection: true, children: [
            { title: "Linear Equations in One Variable", isSubsection: true, children: [] },
            { title: "Quadratic Equations", isSubsection: true, children: [] },
            { title: "Solving Quadratic Equations", isSubsection: true, children: [] },
            { title: "The Quadratic Formula", isSubsection: true, children: [] },
          ]},
          { title: "Foundational Logic", isSubsection: true, children: [] },
        ],
      },
    ],
  },
  {
    title: "Computer Science",
    isHeader: true,
    children: [
      { title: "LEM", children: [] },
      { title: "Implementing LEM", children: [] },
    ],
  },
  {
    title: "Physics",
    isHeader: true,
    children: [
      { title: "Mechanics", children: [] },
    ],
  },
  {
    title: "Puzzles",
    isHeader: true,
    children: [
      { title: "Two Sum", children: [] },
      { title: "Add Two Numbers", children: [] },
    ],
  },
];

export const DirectoryRender = ({
  list,
  preceding_string,
}: {
  list: Directory | DirectoryLink;
  preceding_string: string;
}) => {
  if (Array.isArray(list)) {
    return (
      <div className="main-toc">
        {list.map((link) => DirectoryRender({ list: link, preceding_string }))}
      </div>
    );
  } else {
    const linkText = list.title.toLowerCase().replace(/\s+/g, "-");
    const lastString = preceding_string.split("#")[0];
    const p = lastString + (list.isSubsection ? "#" : "/") + linkText;
    if (list.children.length) {
      if (list.isHeader) {
        return (
          <div key={list.title}>
            <h2>{list.title}</h2>
            <ul>
              {list.children.map((link) =>
                DirectoryRender({ list: link, preceding_string: p }),
              )}
            </ul>
          </div>
        );
      } else {
        return (
          <li key={list.title}>
            <Link href={p}>{list.title}</Link>
            <ul>
              {list.children.map((link) =>
                DirectoryRender({ list: link, preceding_string: p }),
              )}
            </ul>
          </li>
        );
      }
    } else {
      return (
        <li key={list.title}>
          <Link href={p}>{list.title}</Link>
        </li>
      );
    }
  }
};
