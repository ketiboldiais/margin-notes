/* eslint-disable jsx-a11y/alt-text */
import type { MDXComponents } from "mdx/types";
import Image, { ImageProps } from "next/image";
import Link from "next/link";
import { CSSProperties, ReactNode } from "react";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    Cols: (props: { children: ReactNode; of?: number | string }) => {
      const columnCount = props.of ?? 2;
      const gridTemplateColumns = typeof props.of === 'string' ? props.of : `repeat(${columnCount}, 1fr)`;
      const style: CSSProperties = {
        display: 'grid',
        gridTemplateColumns,
      }
      return (
        <div style={style}>
          {props.children}
        </div>
      );
    },
    Example: (props) => (
      <div className="example-block">
        <span className="example-header">example</span>
        <div className="example-body">
          {props.children}
        </div>
      </div>
    ),
    Block: (props) => <div className="block">{props.children}</div>,
    Warning: () => <span className="warning">&#9888;</span>,
    Procedure: (props) => <div className="procedure">{props.children}</div>,
    Proof: (props) => (
      <details>
        <summary>Proof</summary>
        {props.children}
      </details>
    ),
    // Proof: (props) => <div className="proof">
    //   <span className="title">proof</span>
    //   <div className="body">
    //     {props.children}
    //   </div>
    //   </div>,
    Checklist: (props) => <div className="checklist">{props.children}</div>,
    TOC: (props) => (
      <div className="toc">
        <span className="heading">Table of Contents</span>
        <Link href="/">Main Page</Link>
        {props.children}
      </div>
    ),
    img: (props) => (
      <Image
        width={200}
        height={200}
        style={{ width: "100%", height: "auto" }}
        {...(props as ImageProps)}
      />
    ),
    ...components,
  };
}
