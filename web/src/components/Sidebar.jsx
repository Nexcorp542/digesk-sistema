import { NavLink } from 'react-router-dom';

const MODULOS = [
  { path: '/sellos', label: 'Sellos' },
  { path: '/banner-vinil', label: 'Banner / Vinil' },
  { path: '/impresiones', label: 'Impresiones' },
  { path: '/comprobantes', label: 'Comprobantes' },
  { path: '/tarjetas', label: 'Tarjetas' },
  { path: '/volantes', label: 'Volantes' },
  { path: '/tazas', label: 'Tazas' },
  { path: '/globos', label: 'Globos' },
];

const linkClass = ({ isActive }) =>
  `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-emerald-600 text-white' : 'text-neutral-300 hover:bg-neutral-800 hover:text-white'}`;

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-neutral-800 p-4 space-y-1">
      <NavLink to="/" end className={linkClass}>Resumen</NavLink>
      <p className="text-xs uppercase text-neutral-600 mt-4 mb-1 px-3">Ventas</p>
      {MODULOS.map((m) => (
        <NavLink key={m.path} to={m.path} className={linkClass}>{m.label}</NavLink>
      ))}
    </aside>
  );
}