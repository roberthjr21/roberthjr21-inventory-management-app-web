# Inventario · Deditos y Empanadas

Aplicación para registrar productos, ventas, clientes, movimientos y notas. Usa PostgreSQL como almacenamiento compartido y una contraseña de administrador para acceder desde tus dispositivos.

## Puesta en marcha

1. Instala Node.js 22.13+ y crea una base PostgreSQL vacía. Puedes usar PostgreSQL en Fedora o un servicio administrado si alojas la app en Internet. Usa una base propia para este proyecto.
2. En la raíz del repositorio ejecuta:

   ```bash
   npm ci
   cp .env.example .env.local
   read -rsp 'Contraseña del inventario: ' inventory_password
   printf '%s' "$inventory_password" | npm run --silent auth:hash
   unset inventory_password
   ```

3. Edita `.env.local` con la conexión `DATABASE_URL`, el resultado de ese comando en `INVENTORY_PASSWORD_HASH` y la dirección exacta donde abrirás la app en `APP_ORIGIN`. La contraseña de la base de datos y la contraseña de ingreso a la app son independientes.
4. Prepara la base y arranca:

   ```bash
   npm run db:migrate
   npm run dev
   ```

   Abre [http://localhost:3000](http://localhost:3000) e ingresa con la contraseña elegida. En zsh, define el valor con `read -rs 'inventory_password?Contraseña del inventario: '` en lugar del comando `read` de Bash.

### Producción

Configura las mismas tres variables en el entorno del servidor. `APP_ORIGIN` debe coincidir con el dominio HTTPS que usarás, sin ruta; si cambias de dominio, actualiza la variable. Ejecuta `npm run db:migrate` contra la base de destino antes de poner en servicio la app. En Vercel usa PostgreSQL administrado y su URL con pool para el tráfico de la aplicación si el proveedor la ofrece. Habilita TLS según las instrucciones del proveedor. Para alojarla en un servidor propio ejecuta `npm run build` y `npm run start` detrás de HTTPS. Cada ambiente que deba tener datos independientes necesita su propia base.

El acceso corresponde a un solo negocio y una contraseña. Todas las sesiones autorizadas ven el mismo inventario. La sesión dura hasta 12 horas. Cambiar `INVENTORY_PASSWORD_HASH` y reiniciar el despliegue invalida las sesiones previas.

## Recuperar tus datos de la versión anterior

1. Desde la versión anterior, abre **Más → Configuración → Descargar respaldo** y guarda el JSON.
2. Ingresa en la nueva app con la contraseña del negocio.
3. En **Más → Configuración**, abre **Restaurar respaldo** y elige el archivo. Si actualizaste en el mismo navegador y en la misma dirección, también puedes usar **Importar datos de este navegador**.
4. Revisa el recuento antes de confirmar y verifica tus productos y ventas después de importar. Las ventas antiguas sin precio guardado aparecen con el importe histórico desconocido. Las salidas manuales están en Movimientos. Las estadísticas usan las ventas registradas vigentes.

La restauración, el vaciado del inventario y el borrado del historial guardan una copia del estado anterior en la base. Descárgala desde **Configuración → Descargar copia anterior**. Cada una de esas operaciones actualiza esa copia. Guarda respaldos JSON fuera del servidor. Cada respaldo admite hasta 4 MB.

Los productos archivados se pueden reactivar desde Inventario. Las ventas anuladas quedan visibles como anuladas y sus unidades se devuelven al producto cuando sigue disponible en el catálogo, incluso si está archivado.

## Comprobaciones

| Comando | Descripción |
|---|---|
| `npm run lint` | ESLint |
| `npm test` | Pruebas de ventas, persistencia, respaldos y sesión |
| `npm run build` | Compilación de producción con TypeScript |
| `npm audit --omit=dev` | Auditoría de dependencias de producción |

Las pruebas que escriben en PostgreSQL requieren una base de prueba, previamente migrada, y `INVENTORY_TEST_DATABASE=1`. Si ejecutas esas pruebas localmente, exporta `DATABASE_URL` hacia esa base de prueba. Las pruebas de aplicación se ejecutan aunque no configures PostgreSQL.
