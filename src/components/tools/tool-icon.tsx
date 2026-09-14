import {
  CodeIcon,
  ConvertIcon,
  CropIcon,
  ExtractPagesIcon,
  ImageIcon,
  MergeIcon,
  PdfIcon,
  QrIcon,
  ResizeIcon,
  ShieldIcon,
  TextIcon,
} from "@/components/landing/icons";
import type { ToolIconName } from "@/features/tools/tool-data";

type ToolIconProps = {
  icon: ToolIconName;
  className?: string;
};

const iconMap = {
  code: CodeIcon,
  convert: ConvertIcon,
  crop: CropIcon,
  extract: ExtractPagesIcon,
  image: ImageIcon,
  merge: MergeIcon,
  pdf: PdfIcon,
  qr: QrIcon,
  resize: ResizeIcon,
  shield: ShieldIcon,
  text: TextIcon,
};

export function ToolIcon({ icon, className }: ToolIconProps) {
  const Icon = iconMap[icon];

  return <Icon className={className} />;
}
