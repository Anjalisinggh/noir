"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A slot for a Higgsfield clip. Drop a file at /public/media/<name>.mp4 and it
 * plays in its frame; until then the slot stays empty (and collapses), so the
 * liquid entity carries the visual on its own.
 */
export function MediaSlot({ src, label }: { src: string; label: string }) {
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);

  // the server-rendered <video> may have already failed before React attached onError
  useEffect(() => {
    if (video.current?.error) setFailed(true);
  }, []);

  if (failed) return <div className="media-slot media-slot--empty" aria-hidden />;
  return (
    <div className="media-slot" data-cursor="Watch">
      <video
        ref={video}
        className="media-slot__video"
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        aria-label={label}
      />
    </div>
  );
}
