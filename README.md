# Inventario · Deditos y Empanadas

App móvil para controlar inventario, ventas, clientes y notas. Los datos se guardan en el navegador (`localStorage`).

## Requisitos

- Node.js 20+
- npm

## Instalación

```bash
npm install
```

## Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | ESLint |
| `npm run doctor` | Análisis con React Doctor |

## Funciones

- Inventario con alertas de stock bajo
- Registro de ventas con descuento automático de stock
- Historial de movimientos
- Clientes, notas y estadísticas
- Modo claro/oscuro
- Exportar e importar respaldo JSON

## Stack

Next.js 16 · React 19 · Tailwind CSS 4 · shadcn/ui
