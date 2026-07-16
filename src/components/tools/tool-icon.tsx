import {
  CodeIcon,
  ConvertIcon,
  ImageIcon,
  MergeIcon,
  PdfIcon,
  QrIcon,
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
  image: ImageIcon,
  merge: MergeIcon,
  pdf: PdfIcon,
  qr: QrIcon,
  shield: ShieldIcon,
  text: TextIcon,
};

export function ToolIcon({ icon, className }: ToolIconProps) {
  const Icon = iconMap[icon];

  return <Icon className={className} />;
}
