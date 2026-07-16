import {
  AiIcon,
  CodeIcon,
  ConvertIcon,
  ImageIcon,
  MergeIcon,
  PdfIcon,
  QrIcon,
  ShieldIcon,
  TextIcon,
} from "./icons";

export const features = [
  {
    title: "Image Tools",
    description: "Compress, convert, resize, and optimize images for web and print.",
    Icon: ImageIcon,
    href: "/tools",
  },
  {
    title: "PDF Tools",
    description: "Merge, split, compress, and prepare documents with less friction.",
    Icon: PdfIcon,
    href: "/tools",  
  },
  {
    title: "Text Tools",
    description: "Format, clean, count, and transform text for everyday work.",
    Icon: TextIcon,
    href: "/tools",
  },
  {
    title: "Developer Tools",
    description: "Format code, inspect data, and speed through common dev tasks.",
    Icon: CodeIcon,
    href: "/tools",
  },
  {
    title: "AI Tools",
    description: "Practical AI utilities built for quick, focused productivity.",
    Icon: AiIcon,
    href: "/tools",
  },
  {
    title: "File Conversion",
    description: "Convert common file types with a simple, polished workflow.",
    Icon: ConvertIcon,
    href: "/tools",
  },
];

export const popularTools = [
  {
    title: "Image Compressor",
    description: "Reduce image size while keeping visual quality crisp.",
    Icon: ImageIcon,
    href: "/tools",
  },
  {
    title: "Image Converter",
    description: "Switch image formats for sharing, publishing, or storage.",
    Icon: ConvertIcon,
    href: "/tools",
  },
  {
    title: "Password Generator",
    description: "Create strong, reliable passwords for safer accounts.",
    Icon: ShieldIcon,
    href: "/tools",
  },
  {
    title: "QR Generator",
    description: "Generate clean QR codes for links, text, and quick sharing.",
    Icon: QrIcon,
    href: "/tools",
  },
  {
    title: "JSON Formatter",
    description: "Make JSON readable, structured, and easier to debug.",
    Icon: CodeIcon,
    href: "/tools",
  },
  {
    title: "PDF Merger",
    description: "Combine PDF files into one organized document.",
    Icon: MergeIcon,
    href: "/tools",
  },
];
