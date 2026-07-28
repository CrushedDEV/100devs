# DevJam Control

Centro de control interno para un evento en el que 100 desarrolladores construyen
videojuegos **por turnos y sin comunicarse entre ellos**.

La aplicación está pensada exclusivamente para el equipo organizador:

- **Discord** sigue siendo el canal de comunicación (login, sincronización de
  miembros y recordatorios automáticos por mensaje directo).
- **Google Drive** sigue siendo el almacén de los proyectos: la aplicación
  guarda **solo las URLs**, nunca los proyectos de Unity.
- **Esta aplicación** gestiona participantes, equipos, turnos y checkpoints.

---

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Components, Server Actions) |
| Lenguaje | TypeScript en modo `strict` |
| UI | Tailwind CSS v4 + shadcn/ui (preset `radix-nova`) + Kokonut UI |
| Base de datos | Vercel Postgres (Neon) con Drizzle ORM |
| Autenticación | Auth.js v5 con proveedor Discord |
| Gráficas | Recharts |
| Drag & drop | dnd-kit |
| Despliegue | Vercel (front, API Routes, Server Actions y Cron) |

---

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar la aplicación de Discord

En <https://discord.com/developers/applications>:

1. **OAuth2 → Redirects**: añade
   `http://localhost:3000/api/auth/callback/discord` y la URL equivalente de
   producción.
2. **Bot**: crea el bot, copia el token y activa **Server Members Intent**
   (`Privileged Gateway Intents`). Sin este permiso la sincronización no puede
   listar los miembros del servidor.
3. Invita el bot al servidor del evento con permisos de lectura de miembros y
   envío de mensajes directos.
4. Con el **modo desarrollador** activado en Discord, copia los IDs del servidor
   y de los roles de administrador, moderador y participante.

### 3. Variables de entorno

```bash
cp .env.example .env.local
```

```bash
npx auth secret
```

Rellena `DATABASE_URL`, las credenciales de Discord y `CRON_SECRET`.

### 4. Base de datos

```bash
npm run db:push
```

```bash
npm run db:seed
```

El seed es opcional: crea 10 equipos, 100 participantes ficticios y turnos de
ejemplo para poder ver todas las pantallas con datos reales.

### 5. Arrancar

```bash
npm run dev
```

La primera vez que alguien inicia sesión, la aplicación crea automáticamente el
evento a partir de las variables de entorno. A partir de ahí toda la
configuración se edita desde `/settings`.

---

## Control de acceso

El acceso se resuelve **en cada inicio de sesión** contra la API de Discord:

1. Se comprueba que la cuenta pertenece al servidor del evento (`DISCORD_GUILD_ID`).
2. Se leen sus roles y se traducen a un rol de aplicación:
   `admin` > `moderator` > `participant`.
3. Solo `admin` y `moderator` entran al panel; el resto ve un mensaje explicativo.

`src/proxy.ts` hace una comprobación barata de cookie en el borde para evitar
renderizar el panel a visitantes sin sesión, pero **la comprobación real** vive
en `requireStaff()` (`src/server/auth/guard.ts`), que se ejecuta en el layout del
panel y en cada Server Action.

---

## Sincronización con Discord

| Disparador | Qué hace |
| --- | --- |
| Botón «Sincronizar» (barra superior y `/settings`) | Sincronización manual inmediata |
| `GET /api/cron/sync` (cada 15 min) | Importa miembros y reconcilia estados de turno |
| Inicio de sesión | Actualiza el perfil y el rol del usuario que entra |

La sincronización:

- Da de alta o actualiza en `users` a todo miembro que tenga alguno de los roles
  configurados, con nombre, apodo, avatar, ID de Discord y lista de roles.
- Inscribe en el evento a quienes tengan rol de **participante**.
- Marca como `inactive` (nunca borra) a quienes pierdan el rol, de forma que su
  historial de turnos y checkpoints permanece auditable.

Cada ejecución queda registrada en `sync_runs` y se muestra en `/settings`.

---

## Recordatorios automáticos

`GET /api/cron/reminders` (cada 5 min):

1. Materializa las filas de recordatorio de los turnos de las próximas 24 h.
2. Envía por mensaje directo los que ya han vencido.

Los minutos de antelación son configurables (`60, 15` por defecto) y hay un aviso
adicional en el momento exacto del inicio del turno. Un índice único sobre
`(turno, tipo, antelación)` garantiza que nadie recibe el mismo aviso dos veces,
aunque una ejecución se solape con otra.

Ambos endpoints exigen `CRON_SECRET` mediante `Authorization: Bearer …` (así es
como los llama Vercel Cron) o `?secret=`.

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (panel)/            # Panel de administración (layout con guard)
│   │   ├── dashboard/      # Estado en tiempo real por equipo
│   │   ├── calendar/       # Vista semanal y mensual con drag & drop
│   │   ├── timeline/       # Histórico cronológico
│   │   ├── participants/   # Tabla + ficha de participante
│   │   ├── teams/          # Tablero drag & drop + detalle por equipo
│   │   ├── checkpoints/    # Historial global de entregas
│   │   ├── stats/          # Métricas y gráficas
│   │   └── settings/       # Configuración del evento
│   ├── api/
│   │   ├── auth/           # Auth.js
│   │   └── cron/           # sync + reminders
│   └── login/
├── components/
│   ├── ui/                 # shadcn/ui
│   ├── kokonutui/          # Kokonut UI (vendorizado)
│   ├── shared/             # StatusBadge, StatCard, EmptyState, PageHeader…
│   └── <dominio>/          # calendar, teams, participants, checkpoints…
├── hooks/
├── lib/                    # constantes, formato, validadores zod, env
└── server/
    ├── actions/            # Server Actions (auth + validación + revalidate)
    ├── auth/               # Auth.js, resolución de roles, guards
    ├── db/                 # esquema Drizzle, cliente, seed
    ├── discord/            # cliente REST, sincronización, notificaciones
    └── services/           # lógica de negocio (sin dependencias de React)
```

La regla de dependencias es unidireccional:

```
app/ → components/ → hooks/
app/ → server/actions/ → server/services/ → server/db/
                       → server/discord/
```

Los servicios no conocen React ni Next; las Server Actions son la única puerta
de escritura y siempre pasan por `runAction()`, que aplica autenticación,
validación con zod y un formato de error uniforme.

---

## Modelo de datos

Todo está delimitado por `eventId`, así que **soportar varias ediciones o varios
eventos simultáneos no requiere cambios de esquema**.

| Tabla | Contenido |
| --- | --- |
| `events` / `event_settings` | Edición del evento y su configuración editable |
| `users` | Identidad de Discord (global, se reutiliza entre ediciones) |
| `participants` | Inscripción de un usuario en un evento + orden de rotación |
| `teams` | Equipos, color, enlace a Drive, canal de Discord |
| `shifts` | Turnos: horario previsto, horario real y estado |
| `checkpoints` | Entregas: versión, URL de Drive, URL de vídeo, duración, notas |
| `timeline_events` | Registro append-only de toda la actividad |
| `reminders` | Recordatorios programados y su resultado |
| `sync_runs` | Histórico de sincronizaciones con Discord |

Los checkpoints guardan **únicamente información organizativa**. No existe
ninguna ruta de subida de ficheros en la aplicación.

---

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | ESLint (incluye las reglas del React Compiler) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:push` | Sincroniza el esquema con la base de datos |
| `npm run db:generate` / `db:migrate` | Migraciones SQL versionadas |
| `npm run db:studio` | Drizzle Studio |
| `npm run db:seed` | Datos de demostración |

---

## Despliegue en Vercel

1. Importa el repositorio y añade un almacén **Postgres**; Vercel inyecta
   `DATABASE_URL`.
2. Copia el resto de variables de `.env.example` al proyecto.
3. Añade la URL de producción a los *redirects* de OAuth2 en Discord.
4. `vercel.json` ya declara los dos cron jobs; Vercel envía `CRON_SECRET` en la
   cabecera `Authorization` automáticamente.
5. Ejecuta `npm run db:push` (o `db:migrate`) una sola vez contra la base de
   datos de producción.

---

## Extender el proyecto

El diseño anticipa estas ampliaciones sin refactor:

- **Varios eventos a la vez**: `getActiveEvent()` es el único punto que elige la
  edición activa; basta con resolverla desde la URL o desde un selector.
- **Nuevos tipos de participante**: añade el valor al enum `app_role` y su
  entrada en `ROLE_META`; badges, filtros y permisos se actualizan solos.
- **Nuevas integraciones**: crea un módulo en `src/server/<integración>/` y
  expónlo mediante una Server Action; los servicios de dominio no cambian.
- **Nuevas automatizaciones**: añade una ruta bajo `src/app/api/cron/` y su
  entrada en `vercel.json`; `assertCronRequest()` ya resuelve la autenticación.

---

## Componentes de Kokonut UI

En `src/components/kokonutui/` están vendorizados los componentes que la
aplicación usa realmente: `beams-background` (fondo del login), `shimmer-text`
(encabezado del login) y `hold-button` (acciones destructivas). Para añadir más:

```bash
npx shadcn@latest add https://kokonutui.com/r/bento-grid.json
```
