// صورة اختيارية: إن لم يوجد الملف في public تُخفى ويبقى الرسم الافتراضي
export function HeroImg({ slot }: { slot: string }) {
  return <img className="ph" src={`/hero-${slot}.jpg`} alt="" onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")} />;
}
