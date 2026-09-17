type IconProps = {
  className?: string;
};

export function ImageIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 5h14v14H5z" />
      <path d="m8 16 3-4 2 3 2-2 2 3" />
      <path d="M9 9h.01" />
    </svg>
  );
}

export function PdfIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h4" />
      <path d="M9 14h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

export function TextIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6h16" />
      <path d="M8 6v12" />
      <path d="M16 6v12" />
      <path d="M6 18h6" />
      <path d="M14 18h4" />
    </svg>
  );
}

export function CodeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </svg>
  );
}

export function ConvertIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h11l-3-3" />
      <path d="m18 7-3 3" />
      <path d="M17 17H6l3 3" />
      <path d="m6 17 3-3" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3 5 6v5c0 4.5 2.9 8.4 7 10 4.1-1.6 7-5.5 7-10V6z" />
      <path d="M9 12h6" />
    </svg>
  );
}

export function QrIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h6v6H4z" />
      <path d="M14 4h6v6h-6z" />
      <path d="M4 14h6v6H4z" />
      <path d="M14 14h2v2h-2z" />
      <path d="M18 14h2v6h-4v-2h2z" />
    </svg>
  );
}

export function MergeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4h8l3 3v9H7z" />
      <path d="M15 4v4h3" />
      <path d="M4 8v12h12" />
    </svg>
  );
}

export function ArticleIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 4h9l3 3v13H6z" />
      <path d="M15 4v3h3" />
      <path d="M9 11h6" />
      <path d="M9 14h6" />
      <path d="M9 17h3" />
    </svg>
  );
}

export function MailIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v14H4z" />
      <path d="m4 6 8 7 8-7" />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M4 12h16" />
      <path d="M4 17h16" />
    </svg>
  );
}

export function CloseIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6 6 18" />
    </svg>
  );
}

export function CoffeeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 9h11v5a5 5 0 0 1-5 5H9a4 4 0 0 1-4-4z" />
      <path d="M16 10h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M8 3v2" />
      <path d="M11 3v2" />
    </svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m4 4 16 16" />
      <path d="m20 4-16 16" />
    </svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M14 4h6v6" />
      <path d="M20 4 10 14" />
      <path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" />
    </svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

export function ResizeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="m21 3-7 7" />
      <path d="m3 21 7-7" />
    </svg>
  );
}

export function CropIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  );
}

export function ExtractPagesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v5h4" />
      <path d="m9.5 14.5 1.5 1.5 3.5-3.5" />
    </svg>
  );
}

export function RotatePagesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3h7v7H7z" />
      <path d="M17.5 9a6 6 0 1 1-2-4.5" />
      <path d="M17.5 3.5v3.5H14" />
    </svg>
  );
}

export function SplitPagesIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h5v8H6z" />
      <path d="M13 13h5v8h-5z" />
      <path d="M4 11h16" strokeDasharray="2 2" />
    </svg>
  );
}

export function CleanPdfIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h7l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M13 3v4h4" />
      <path d="m17.5 13.5.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7Z" />
    </svg>
  );
}

export function ArchiveIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v4H4z" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M10 12h4" />
    </svg>
  );
}

export function ExtractArchiveIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 4h16v4H4z" />
      <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
      <path d="M12 12v6" />
      <path d="m9 15 3 3 3-3" />
    </svg>
  );
}

export function FindReplaceIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="9" r="5" />
      <path d="m13 13 3 3" />
      <path d="M14 19h7" />
      <path d="m18 16 3 3-3 3" />
    </svg>
  );
}

export function CompareIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 4v16" />
      <path d="M15 4v16" />
      <path d="M4 8h5" />
      <path d="M15 16h5" />
      <path d="m6 6-2 2 2 2" />
      <path d="m18 14 2 2-2 2" />
    </svg>
  );
}

export function LinkEncodeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M10 14a4 4 0 0 0 5.7.3L18 12a4 4 0 0 0-5.7-5.7L11 7.6" />
      <path d="M14 10a4 4 0 0 0-5.7-.3L6 12a4 4 0 0 0 5.7 5.7L13 16.4" />
      <path d="M4 20h3l1.5-4" />
      <path d="M20 4h-3l-1.5 4" />
    </svg>
  );
}

export function IdTagIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 7a2 2 0 0 1 2-2h9l7 7-7 7H5a2 2 0 0 1-2-2Z" />
      <circle cx="9" cy="12" r="1.5" />
      <path d="M13 9v6" />
      <path d="M16 9v6" />
    </svg>
  );
}

export function TimeConvertIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10" cy="12" r="7" />
      <path d="M10 8v4l2.5 2.5" />
      <path d="M19 5v4h-4" />
      <path d="M19 9a7 7 0 0 0-6-4" />
    </svg>
  );
}

export function RegexIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 4H4v16h3" />
      <path d="M17 4h3v16h-3" />
      <path d="M12 8v8" />
      <path d="m9 10 6 4" />
      <path d="m15 10-6 4" />
    </svg>
  );
}
