type LogoMarkProps = {
  compact: boolean;
};

export function LogoMark({ compact = false }: LogoMarkProps) {
  return (
    <div className={`flex w-full items-center justify-center px-1 ${compact ? "h-28" : "h-[clamp(7rem,20vh,13rem)]"}`}>
      <img
        src="/brand/gestasports-full-transparent.png?v=2"
        alt="GestaSports"
        className={`w-auto max-w-full shrink-0 object-contain drop-shadow-[0_14px_22px_rgba(15,23,42,0.18)] ${
          compact ? "h-[6.4rem]" : "h-[clamp(6.25rem,17.5vh,11.5rem)]"
        }`}
      />
    </div>
  );
}
