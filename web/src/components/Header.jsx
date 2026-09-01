export default function Header() {
  const hoy = new Date().toLocaleDateString('es-PE', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  return (
    <header className="border-b border-neutral-800 bg-neutral-950 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-white font-semibold text-lg">Diges'k</h1>
        <p className="text-neutral-500 text-xs capitalize">{hoy}</p>
      </div>
    </header>
  );
}