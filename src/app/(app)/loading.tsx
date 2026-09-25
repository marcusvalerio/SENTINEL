export default function Loading() {
  return (
    <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-4 pt-14 sm:px-6 lg:px-8" aria-busy="true" aria-label="Carregando">
      <div className="flex flex-col gap-3">
        <div className="skeleton h-3 w-40" />
        <div className="skeleton h-10 w-64" />
      </div>
      <div className="skeleton h-9 w-96 max-w-full" />
      <div className="flex flex-col gap-px overflow-hidden rounded-lg">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="skeleton h-[76px] rounded-none opacity-60" style={{ animationDelay: `${i * 80}ms` }} />
        ))}
      </div>
    </div>
  );
}
