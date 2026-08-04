-- Campos que Candela ya lleva hoy en su Excel y no existían en la app.
--
-- La planilla tiene: Fecha · Nombre y Apellido · DNI · Localidad ·
-- Lugar de trabajo · Préstamo. Fecha, nombre y monto ya estaban; los otros tres
-- no, y son los que ella usa para ubicar a la persona.
--
-- `lugar_trabajo` no es un dato de color: en su cartera casi todos trabajan en
-- las mismas tres clínicas, y ahí es donde los va a buscar cuando no atienden.

alter table clientes
  add column dni text,
  add column localidad text,
  add column lugar_trabajo text;

comment on column clientes.dni is 'Como texto: puede venir con puntos y no se opera con él.';
comment on column clientes.localidad is 'Orán, Salta, Metán…';
comment on column clientes.lugar_trabajo is 'Dónde trabaja. Sirve para encontrarla si no atiende el teléfono.';

-- Buscar por DNI tiene que ser instantáneo: es el dato con el que se
-- desambigua a dos personas que se llaman parecido.
create index idx_clientes_dni on clientes(dni) where dni is not null;
