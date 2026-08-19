# Soho Flow

Sistema de turnos, pagos y liquidación — Soho Box | Espacio de bienestar

Quiero que construyas una aplicación web de gestión interna para un estudio de estética y masajes. A continuación te doy el contexto del negocio, el modelo de datos completo, cada módulo con su funcionalidad, las reglas de negocio (algunas son sutiles y son la parte más importante de todo esto), y el criterio de diseño visual. Es una app que va a usar el equipo del local todos los días, desde compu y desde el celular, así que tiene que ser rápida, clara y cómoda al tacto.

1. Contexto del negocio

Nombre: Soho Box | Espacio de bienestar. Dirección: El Huerto 598, La Puntilla. Teléfono: 2617176580.

Dos modalidades de servicio: Cosmiatría y Masajes. El catálogo de servicios concretos (nombre, duración, precio) tiene que ser configurable desde la app, no fijo en el código. Como ejemplo de carga inicial:

Cosmiatría: Facial Express, Facial con Punta de Diamante, Dermapen, Masaje/Yoga Facial, Dermaplaning.

Masajes: Relajante, Linfático, Reductor, Descontracturante.

Horario de atención configurable por día de semana (no fijo). Como ejemplo de carga inicial: martes y jueves de 14 a 20hs, sábados de 9 a 14hs.

El equipo lo forman una administradora y una o más prestadoras (las que hacen los servicios). Dos personas del staff (o clientas puntuales) son además dueñas del local — su consumo de servicios se contabiliza como parte del alquiler que pagan, no como una deuda pendiente de cobrar.

2. Roles y autenticación

Login simple con nombre + PIN numérico (4 a 6 dígitos). No hace falta integración con cuentas de Google ni con ningún proveedor externo — es autenticación propia de la app.

Dos roles:

Administradora: acceso total. Es la única que ve clientes, catálogo de servicios, prestadores, y liquidación/comisiones.

Prestador/a: puede ver y crear turnos, cargar y ver el estado de pago de cualquier turno (importante: antes el sistema le ocultaba los datos de pago a las prestadoras, pero se cambió a propósito para que puedan ver si un turno está pagado o no y así saber si tienen que cobrar en el momento). No accede a los reportes financieros agregados (liquidación, comisiones, deuda de clientes) ni a la gestión de catálogo/clientes/prestadores.

3. Modelo de datos

Usá una base de datos real (relacional o de documentos, lo que prefiera Base44) con estas entidades. Dejo entre paréntesis notas sobre el tipo de cada campo.

Personas (staff)

id, nombre, rol (admin | prestador), pin, activo (booleano)

Servicios (catálogo)

id, modalidad (texto libre, ej. "Cosmiatría"/"Masajes"), nombre, duracionMin (número), precio (número), activo

Clientes

id, nombre, telefono, email, notas, esPropietario (booleano — marca si es dueño/a del local, ver sección de reglas de negocio), activo

Horarios (configuración de atención)

dia (Lunes..Domingo), horaDesde, horaHasta, activo

Turnos — la entidad central

id, fecha, hora, cliente (nombre, por si no está en el catálogo), clienteId (referencia a Clientes, puede estar vacío), telefono

modalidad, servicioId, servicioNombre, duracionMin (estos tres se copian del servicio elegido al momento de crear el turno, pero son editables después si se cambia de servicio)

prestador, estado (Confirmado | Completado | No-show | Cancelado — ver nota importante en reglas de negocio sobre esto)

paqueteId (si el turno se cubre con una sesión de un paquete ya comprado, referencia a Paquetes; vacío si no)

esCanje (booleano — el servicio se hizo sin cobrar, ver reglas de negocio)

pagado (booleano), montoTotal (número), sena (booleano), montoSena (número), metodoPagoSena, metodoPagoResto (texto: Efectivo/Transferencia/Débito/Crédito/Mercado Pago)

precioLista, descuentoTipo (vacío | porcentaje | monto), descuentoValor — para poder mostrar de dónde salió el montoTotal

notas, creadoPor (nombre de quién lo cargó), fechaCreacion, activo

Paquetes (venta de sesiones combinadas)

id, cliente, clienteId, telefono, precioListaTotal, precioFinal, montoPagado, pagado, metodoPago, fechaCompra, activo

PaquetesDetalle (líneas de un paquete — puede incluir varios servicios distintos)

id, paqueteId, servicioId, cantidad

Reparto (comisión por prestador/a y modalidad — NO es un % fijo único, cada prestadora puede tener un % distinto en cada modalidad)

prestador, modalidad, porcentaje, activo

PagosLiquidacion (registro de que se le pagó a una prestadora lo que se le debía)

id, prestador, desde, hasta (el período que cubre el pago), fecha (fecha real en que se pagó), monto, metodoPago, notas, creadoPor, activo

En todas las entidades, borrar es siempre un borrado lógico (marcar activo = false), nunca eliminar la fila/documento de verdad. Esto es importante: en varios lugares se calculan cosas a partir del historial completo (comisiones, consumo de clientes, paquetes), y hay que poder recuperar algo si se borró por error.

4. Módulos y funcionalidad

4.1 Calendario (pantalla principal al iniciar sesión)

Es el módulo más elaborado de la app, pensá el diseño con calma.

Vista Semana (arranca así en pantallas grandes):

Grilla estilo Google Calendar: columnas = solo los días de la semana que tienen horario configurado (si el local no atiende los lunes, no hay columna de lunes), filas = horas dentro del rango que abarcan los horarios activos.

El encabezado (fila con los nombres de los días) queda fijo arriba al hacer scroll hacia abajo (sticky), y también la columna de horas queda fija a la izquierda al hacer scroll horizontal — la esquina superior izquierda queda ancla en las dos direcciones a la vez, como si congelaras filas y columnas en una planilla.

Cada columna de día muestra arriba el nombre corto del día (MAR, JUE...) y abajo el número de fecha en grande; el día de hoy se resalta con un círculo de color de fondo.

Las celdas fuera del horario de atención se ven visualmente "cerradas" (un tono de fondo distinto) y no son clickeables.

Tocar una celda dentro del horario abre el formulario de nuevo turno con la fecha y hora ya precargadas.

Cada turno aparece como una tarjeta chica dentro de su celda, coloreada así (esto es clave, se pidió expresamente):

Fondo de la tarjeta = color según la modalidad del servicio (un color estable por modalidad — la misma modalidad siempre el mismo color).

Borde izquierdo, ancho = color según quién cargó el turno (creadoPor) — también estable por persona.

Un punto de color chico en la esquina que indica el estado de pago: verde si está pagado o cubierto por un paquete, ámbar si tiene seña o es canje, rojo si está pendiente.

Arriba de la grilla hay una leyenda chica con los nombres de quienes cargaron turnos en ese período y su color correspondiente (para poder leer el borde de las tarjetas).

Arriba de la grilla, en la misma fila que el desplegable "Configurar horarios de atención" (usando el espacio horizontal disponible, sin agregar una fila nueva), van unos KPIs: cantidad de turnos totales del período, un chip por cada modalidad con su color correspondiente, y (solo para la administradora) cuánto falta cobrar. Todos los KPIs con el mismo tamaño y forma — lo único que cambia entre ellos es el color.

Botones de navegación: Anterior / Esta semana / Siguiente, con "Esta semana" resaltado visualmente cuando estás parado ahí.

Vista Día (arranca así en pantallas de celular — más cómoda para tocar):

Lista vertical de tarjetas grandes, una por turno, ordenadas por hora: hora, cliente, servicio, prestador/a, y el estado de pago bien visible (con un botón "Marcar pagado" si todavía no se cobró, que abre un popup chico para elegir el método sin tener que entrar al formulario completo de edición).

Navegación Anterior / Hoy / Siguiente, con "Hoy" resaltado cuando corresponde.

Un botón para alternar entre vista Semana y vista Día en cualquier momento.

4.2 Agenda

Lista tabular de turnos con filtros rápidos (Hoy / Esta semana / Semana pasada / Este mes / Mes pasado) y selector de rango manual. Columnas: fecha, hora, cliente, servicio, prestador/a, estado, pago. Tocar una fila abre el panel de edición del turno. En pantallas angostas, cada fila se convierte en una tarjeta apilada en vez de columnas de tabla.

4.3 Nuevo turno

Accesible desde un botón fijo en el encabezado ("+ Nuevo turno"), disponible en cualquier pestaña — y también, como se explicó arriba, al tocar un slot del calendario. Es el mismo formulario en los dos casos, con fecha/hora precargadas cuando viene del calendario.

Campos:

Cliente (con autocompletado por nombre contra la base de clientes existente; si escribís un nombre que no existe, ofrece crearlo al vuelo sin salir del formulario), teléfono.

Fecha, hora (la hora se elige de una lista de horas en punto — nada de minutos sueltos, todos los turnos duran horas completas).

Modalidad → Servicio (el segundo select se filtra según la modalidad elegida), Prestador/a, Notas.

Si el cliente elegido tiene un paquete con sesiones restantes, aparece un aviso ofreciendo descontar esta sesión del paquete — al activarlo, se ocultan los campos de precio y pago porque ya está pagado.

Pago, resuelto como un chip de dos opciones — "Canje" | "Paga" — ninguna tocada por defecto:

Si no se toca ninguna: el turno se guarda igual, con el monto en el precio de lista del servicio elegido, y queda pendiente de pago.

Si se toca "Paga": se despliegan los campos de precio (con descuento opcional, tipo % o monto fijo) y de pago (seña parcial con su propio método, o pagado por completo con su método).

Si se toca "Canje": no se despliega nada más, se guarda directo con el monto en precio de lista, marcado como canje (no se cobra, pero cuenta para el reparto de comisiones — ver reglas de negocio).

4.4 Editar turno

Panel que se abre al tocar cualquier turno (desde el calendario o la agenda). Tiene que permitir editar todos los datos del turno, incluyendo modalidad y servicio (esto es importante: al principio esto no se podía cambiar después de creado el turno, y hubo que agregarlo — un turno cargado con el servicio equivocado, o que la clienta cambió de opinión, tiene que poder corregirse sin borrar y crear uno nuevo). También: fecha, hora, prestador/a, estado, notas, monto, seña, pagado, métodos de pago, es canje, y el vínculo con un paquete (un desplegable con los paquetes del cliente — permite vincular un turno que no se había cargado como parte de un paquete, o desvincular uno que sí, en cualquier momento, de forma retroactiva). Botón para eliminar el turno (borrado lógico).

4.5 Paquetes

Listado de paquetes activos: cliente, servicios incluidos, sesiones restantes/compradas, estado de vencimiento, estado de pago (solo admin).

Vencimiento calculado a partir de la cantidad de sesiones compradas (fórmula usada hasta ahora: redondear sesiones/4, multiplicar por 30, sumar 15 días desde la compra — podés ajustarla si te parece que hay algo mejor, pero mantené la idea de "más sesiones, más tiempo para usarlas").

Vender paquete: cliente (mismo autocompletado que en Nuevo turno), armar una o más líneas de servicio + cantidad (un paquete puede combinar servicios distintos), precio de lista sumado automáticamente vs. precio final editable (mostrando el descuento resultante), pago inicial.

Detalle de un paquete: historial de las sesiones ya usadas (fecha, servicio, prestador/a, estado), edición del pago, eliminar.

4.6 Clientes (solo administradora)

Listado con el monto que cada cliente adeuda (calculado — ver reglas de negocio sobre qué cuenta como deuda y qué no).

Agregar/editar cliente: nombre, teléfono, email, notas, y un checkbox "Es propietario/a del local" (para el tratamiento especial de canje como alquiler).

Dentro de la edición de cada cliente, un reporte de consumo por período: elegís un rango de fechas (con atajos "Este mes"/"Mes pasado") y te muestra el detalle turno por turno (fecha, servicio, prestador/a, monto) más el total — pensado sobre todo para saber cuánto consumieron los dueños del local en un mes, pero sirve para cualquier cliente.

4.7 Servicios (solo administradora)

Catálogo de servicios: modalidad, nombre, duración en minutos, precio. Alta de servicios nuevos.

4.8 Prestadores (solo administradora)

Alta de personas del staff (nombre, rol, PIN).

Configuración del % de comisión por prestador/a y por modalidad — no es un porcentaje único por persona, cada una puede tener, por ejemplo, 40% en masajes y 60% en cosmiatría.

4.9 Liquidación (solo administradora)

Filtros rápidos de período (Esta semana / Semana pasada / Este mes / Mes pasado) y rango manual.

KPIs del período:

"Le queda al box": destacado como el número principal, es el valor facturado menos las comisiones a pagar. Al lado (con una nota chica, no hace falta otro KPI separado) se aclara que ese número es sobre lo facturado, no necesariamente lo cobrado en efectivo o transferencia — y se muestra también la "caja real": lo efectivamente cobrado menos las comisiones, que es el número que de verdad importa para saber qué quedó en caja.

Turnos, Facturado, Cobrado, Falta cobrar (este último en texto rojo para que se note, sin necesidad de un fondo rojo agresivo).

Canje y Alquiler como chips aparte (solo aparecen si son mayores a cero — no hace falta mostrar un KPI en $0).

Todos los KPIs con el mismo tamaño y forma, diferenciados solo por color.

Desglose por medio de pago: un acordeón por cada método (Efectivo, Transferencia, etc.) que al abrirse muestra el detalle turno por turno que lo compone (cliente, fecha, qué parte fue — seña o resto —, monto).

Reparto por prestador/a y modalidad: tabla con cantidad de turnos, facturado, % configurado, monto a pagar.

Pagos a prestadoras: por cada prestadora, cuánto se le debe en el período vs. cuánto ya se le pagó (con un badge "Al día" o "Falta $X"), un botón para registrar un pago nuevo (monto, fecha real del pago, método, notas opcionales — el monto se sugiere automáticamente con lo que falta pagar, pero es editable), y un historial desplegable de los pagos ya cargados a esa prestadora, con opción de eliminar uno si se cargó por error.

5. Reglas de negocio importantes (la parte más delicada de todo esto)

Estas reglas costaron varias vueltas de ajuste en la versión anterior del sistema — son las que más importa que queden bien:

La comisión de la prestadora se calcula siempre sobre el precio de lista del servicio, sin importar si el cliente pagó en efectivo, si el servicio se cubrió con un paquete ya comprado, o si fue un canje sin cobro. La prestadora hizo el trabajo igual, así que cobra su % igual.

Un turno cubierto por un paquete no genera un cobro propio (esa plata ya entró cuando se vendió el paquete), pero sí cuenta como "facturado" y se contabiliza como si ya estuviera "cobrado" — no debe aparecer nunca como pendiente de cobro.

Canje: el servicio se dio sin cobrar nada, pero cuenta como facturado (para que la prestadora cobre su %). No forma parte de "cobrado" ni de "falta cobrar" — tiene su propio total aparte.

Alquiler: mismo tratamiento que el canje, pero se separa en un total aparte específicamente para los turnos de clientes marcados como "propietario/a del local". Canje y Alquiler son excluyentes entre sí (un turno de un propietario cuenta como alquiler, no también como canje genérico) — la idea es distinguir "le hicimos un canje a una influencer" de "esto es parte del arreglo con los dueños del local".

La deuda de un cliente (para el listado de Clientes) excluye los turnos cubiertos por paquete o marcados como canje — esos no son plata pendiente de cobrar.

El campo estado del turno (Confirmado/Completado/No-show/Cancelado) existe pero en la práctica el negocio no distingue mucho entre Confirmado y Completado — si un turno sigue existiendo (no fue borrado) es porque se dio o se va a dar. Cuando alguien no viene, en la práctica se borra el turno directamente en vez de marcarlo como "No-show". Tené esto en cuenta para no exigir que el usuario ande cambiando el estado a mano en el uso diario — que los reportes financieros cuenten por defecto todo lo que no esté cancelado/borrado, sin obligar a tildar nada.

Las fechas se muestran siempre en formato dd-mm-aaaa en toda la interfaz (Argentina).

Si en algún momento un campo de monto queda sin completar (por ejemplo, si el usuario no tocó nada de precio al cargar un turno nuevo), el sistema tiene que caer solo al precio de lista del servicio elegido — nunca debería quedar guardado un turno con $0 si el servicio tiene un precio de catálogo.

6. Diseño visual y experiencia

Paleta: fondo general color crema/hueso muy claro, tarjetas en blanco, un verde salvia como color principal (uno más oscuro para textos/acentos fuertes, uno más claro para fondos suaves), un tono ciruela/mauve como color secundario para elementos ocasionales, ámbar para alertas suaves y rojo para alertas fuertes. Evitá una estética genérica de plantilla — es un espacio de estética y bienestar, tiene que sentirse cálido y cuidado, no corporativo.

Tipografía: una serif con carácter para títulos y números destacados (tipo Fraunces), una sans-serif limpia para el resto del texto (tipo Inter).

Navegación en una barra lateral izquierda con íconos (no pestañas horizontales arriba), que colapsa a solo íconos en pantallas angostas. El contenido usa todo el ancho disponible de la pantalla, no una columna centrada angosta.

Mobile-first de verdad, no como agregado: los campos de formulario con letra de al menos 16px (si son más chicos, iOS hace zoom automático al tocarlos, algo que hay que evitar); botones e íconos táctiles de al menos 42-44px en pantallas de celular; las tablas se convierten en tarjetas apiladas en mobile en vez de scroll horizontal de columnas; los formularios largos (nuevo turno, editar turno) se abren como panel deslizante desde la derecha que ocupa toda la pantalla en celular.

Pensada para instalarse como PWA (ícono propio en la pantalla de inicio de iPhone y Android, se abre a pantalla completa sin barra de navegador). Si Base44 lo soporta nativamente, mejor — si no, al menos dejar la estructura (manifest, ícono, meta tags) lista para poder agregarlo.

7. Mejoras adicionales a incluir

Además de todo lo de las secciones 1 a 6 (que es lo que el negocio ya usa y necesita tal cual), sumá estas funcionalidades:

Aviso de vencimiento próximo de paquetes, para poder contactar proactivamente a la clienta antes de que se le venza sin haber usado las sesiones.

Historial de auditoría: no solo quién cargó un turno, sino un registro de qué se modificó y cuándo, en especial para los montos y estados de pago.

Un reporte combinado de alquiler que sume automáticamente el consumo de ambos propietarios del local en un solo número, en vez de tener que calcularlo cliente por cliente y sumarlo a mano.

Notificaciones push dentro de la app (ya que va a poder instalarse como PWA), por ejemplo para avisarle a la administradora cuando entra un turno nuevo o un pago pendiente lleva mucho tiempo sin cobrarse.

Carga masiva por planilla (Excel/CSV), tanto para Clientes como para Servicios, para no tener que cargar uno por uno desde el formulario:

Para clientes: columnas nombre, teléfono, email, notas.

Para servicios: columnas modalidad, nombre, duración, precio.

Tiene que servir también para actualizar precios existentes de forma masiva, no solo para cargar cosas nuevas — este es el caso de uso principal: cuando hay un aumento general de precios, poder exportar el catálogo actual a una planilla, editar los precios ahí, y volver a subirla. El sistema tiene que reconocer los servicios que ya existen (por nombre + modalidad, o por un identificador si el archivo exportado lo incluye) y actualizarles el precio en vez de crear uno duplicado; si una fila no coincide con ningún servicio existente, que se cree como nuevo.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://soho-turnos.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c7619e2f-1884-4a2f-89ae-03f5a5c60e55).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
