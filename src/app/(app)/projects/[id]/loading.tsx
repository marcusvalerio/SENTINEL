export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Carregando seção">
      <div className="skeleton h-6 w-48" />
      <div className="skeleton h-4 w-80 max-w-full" />
      <div className="skeleton h-40 w-full opacity-60" />
    </div>
  );
}
