import logoImg from "@/assets/logo.png";

type Props = { size?: number; showText?: boolean; className?: string };

export function Beyond21Logo({ size = 48, showText = false, className }: Props) {
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <img
        src={logoImg}
        alt="Beyond 21"
        width={size}
        height={size}
        className="rounded-xl object-contain"
      />
      {showText && (
        <span className="font-bold text-xl tracking-tight text-foreground">
          Beyond <span className="text-purple-500">21</span>
        </span>
      )}
    </div>
  );
}
