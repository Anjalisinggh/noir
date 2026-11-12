import { Fragment } from "react";

/** Splits text into masked words so each can rise / fade on its own. */
export function Words({ text, className }: { text: string; className?: string }) {
  const words = text.split(" ");
  return (
    <>
      {words.map((w, i) => (
        <Fragment key={i}>
          <span className={`w ${className ?? ""}`}>
            <span className="w__i">{w}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </>
  );
}
