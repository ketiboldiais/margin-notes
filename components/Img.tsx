import Image from "next/image";

export const Img = ({
  url,
  alt,
  width,
  height,
  caption,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  url: any;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}) => (
  <figure
    style={{
      width: "fit-content",
      marginTop: "20px",
      marginBottom: "20px",
      marginLeft: "auto",
      marginRight: "auto",
    }}
  >
    <Image width={width} height={height} src={url} alt={alt} />
    {caption && <figcaption>{caption}</figcaption>}
  </figure>
);
