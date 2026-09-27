import {
  ArchiveIcon,
  AudioJoinIcon,
  AudioSpeedIcon,
  AudioTrimIcon,
  AudioVolumeIcon,
  CleanPdfIcon,
  CodeIcon,
  CompareIcon,
  ConvertIcon,
  CropIcon,
  ExtractArchiveIcon,
  ExtractPagesIcon,
  FindReplaceIcon,
  IdTagIcon,
  ImageIcon,
  ImageToTextIcon,
  LinkEncodeIcon,
  MergeIcon,
  PdfIcon,
  QrIcon,
  RegexIcon,
  ResizeIcon,
  RotatePagesIcon,
  ShieldIcon,
  SplitPagesIcon,
  TextIcon,
  TimeConvertIcon,
} from "@/components/landing/icons";
import type { ToolIconName } from "@/features/tools/tool-data";

type ToolIconProps = {
  icon: ToolIconName;
  className?: string;
};

const iconMap = {
  archive: ArchiveIcon,
  audioJoin: AudioJoinIcon,
  audioSpeed: AudioSpeedIcon,
  audioTrim: AudioTrimIcon,
  audioVolume: AudioVolumeIcon,
  clean: CleanPdfIcon,
  code: CodeIcon,
  compare: CompareIcon,
  convert: ConvertIcon,
  crop: CropIcon,
  extract: ExtractPagesIcon,
  findReplace: FindReplaceIcon,
  idTag: IdTagIcon,
  image: ImageIcon,
  imageToText: ImageToTextIcon,
  linkEncode: LinkEncodeIcon,
  merge: MergeIcon,
  pdf: PdfIcon,
  qr: QrIcon,
  regex: RegexIcon,
  resize: ResizeIcon,
  rotate: RotatePagesIcon,
  shield: ShieldIcon,
  split: SplitPagesIcon,
  text: TextIcon,
  timeConvert: TimeConvertIcon,
  unarchive: ExtractArchiveIcon,
};

export function ToolIcon({ icon, className }: ToolIconProps) {
  const Icon = iconMap[icon];

  return <Icon className={className} />;
}
