import Image from 'next/image';
import artManifest from '../../../public/assets/art/art-manifest.json';

export interface JapaneseArtBackdropProps {
  src: string;
  alt: string;
  opacity?: number;
  blendMode?: 'multiply' | 'overlay' | 'soft-light' | 'screen' | 'normal';
  objectFit?: 'cover' | 'contain';
  objectPosition?: string;
  className?: string;
  zIndex?: number;
  priority?: boolean;
  /** VIS-SYS-03: contrast-filter enhancement for legibility over content */
  contrastBoost?: 'none' | 'subtle' | 'medium' | 'strong';
}

// VIS-SYS-03: Contrast filter presets (Wabi-Sabi tonal shift + saturation calibration)
const CONTRAST_FILTER_MAP: Record<string, string> = {
  none: 'none',
  subtle: 'contrast(1.05) saturate(0.88) brightness(0.97)',
  medium: 'contrast(1.12) saturate(0.78) brightness(0.93)',
  strong: 'contrast(1.22) saturate(0.65) brightness(0.88)',
};

/**
 * JapaneseArtBackdrop
 * Reusable component for overlaying authentic Japanese cultural art & ukiyo-e motifs.
 * Features:
 * - Auto-detect AVIF optimised variant from art-manifest.json
 * - Auto-load Base64 LQIP blur placeholder to prevent layout shift
 * - Guaranteed non-blocking interactions via pointer-events-none
 * - Granular opacity and CSS mix-blend-mode controls
 * - VIS-SYS-03: contrastBoost prop for perceptual contrast calibration
 * - Built-in responsive Next.js Image handling
 */
export function JapaneseArtBackdrop({
  src,
  alt,
  opacity = 0.9,
  blendMode = 'multiply',
  objectFit = 'cover',
  objectPosition = 'center',
  className = '',
  zIndex = 1,
  priority = false,
  contrastBoost = 'none',
}: JapaneseArtBackdropProps) {
  // Resolve manifest entry for AVIF + LQIP blur
  const fileName = src.split('/').pop() || '';
  const manifestEntry = (artManifest as Record<string, any>)[fileName];
  const blurUrl = manifestEntry?.blurDataUrl;

  // Auto-upgrade to AVIF if available in manifest
  const optimizedSrc = manifestEntry?.avif?.name
    ? `/assets/art/${manifestEntry.avif.name}`
    : src;

  const filterValue = CONTRAST_FILTER_MAP[contrastBoost] ?? 'none';

  return (
    <div
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ zIndex }}
      aria-hidden="true"
    >
      <Image
        src={optimizedSrc}
        alt={alt}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        placeholder={blurUrl ? 'blur' : 'empty'}
        blurDataURL={blurUrl}
        style={{
          objectFit,
          objectPosition,
          opacity,
          mixBlendMode: blendMode,
          filter: filterValue,
          willChange: 'opacity',
        }}
        priority={priority}
      />
    </div>
  );
}

export default JapaneseArtBackdrop;
