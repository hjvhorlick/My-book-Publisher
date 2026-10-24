import React, { useEffect, useRef, useState } from 'react';

/**
 * A book/preview image that never paints in layers.
 *
 * The frame immediately shows a finished-looking shimmer in the template's
 * tones, and the photograph itself stays invisible until the browser has
 * fully downloaded it — then it fades in as one complete picture instead
 * of scanning in line-by-line. Cached images (e.g. after preloading or a
 * layout switch) appear immediately with no flicker.
 */
export default function BookImage({
  src,
  srcSet,
  sizes,
  alt = '',
  className = '',
  eager = false,
  fetchPriority,
  skeletonStyle = {}
}) {
  const [loaded, setLoaded] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const imgRef = useRef(null);

  // If a picture fails to load it is almost always a stale or truncated cache
  // entry (artwork is served with a long cache). Retrying with a cache-busting
  // query repairs it without asking the reader to clear their browser cache.
  const attemptSrc = attempt === 0
    ? src
    : `${src}${String(src).includes('?') ? '&' : '?'}retry=${attempt}`;

  // Reset when the source changes; a browser-cached image is already
  // complete on mount and should show without a fade delay.
  useEffect(() => {
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    } else {
      setLoaded(false);
    }
  }, [src]);

  return (
    <span className="relative block h-full w-full overflow-hidden" aria-busy={!loaded}>
      {!loaded && (
        <span
          aria-hidden="true"
          className="fq-img-skeleton absolute inset-0 block"
          style={skeletonStyle}
        />
      )}
      <img
        ref={imgRef}
        src={attemptSrc}
        srcSet={attempt === 0 ? srcSet : undefined}
        sizes={sizes}
        alt={alt}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={fetchPriority || (eager ? 'high' : undefined)}
        draggable={false}
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (attempt < 2) setAttempt((value) => value + 1);
          else setLoaded(true);
        }}
        className={`h-full w-full object-cover transition-[opacity,transform] duration-500 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
      />
    </span>
  );
}
