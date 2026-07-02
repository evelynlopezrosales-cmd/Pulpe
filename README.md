# Sistema POS para Pulpería

Sistema de punto de venta en **Node.js + Express + SQLite** (better-sqlite3) con:

- **Caja / Escaneo**: lector de código de barras USB (funciona como teclado, solo escanee con el cursor en el campo) o cámara del dispositivo (usando la librería html5-qrcode).
- **Inventario**: productos por unidad o por peso (kg), con alerta de stock bajo.
- **Fiado**: registro de clientes, saldo pendiente, abonos e historial.
- **Reportes / Corte de caja**: totales por forma de pago (efectivo, SINPE/tarjeta, fiado), productos más vendidos y guardado de cortes de caja históricos.
- **Recibo imprimible** al finalizar cada venta.

## Instalación

```bash
cd pulperia-pos
npm install
npm start
```

Abra `http://localhost:3000` en el navegador. La base de datos SQLite (`db/pulperia.db`) se crea sola la primera vez, con 4 productos de ejemplo.

## Notas

- Si `npm install` falla compilando `better-sqlite3` en Windows, instale las **Build Tools de Visual Studio** (o corra `npm install --global windows-build-tools` como administrador) — es un requisito normal de ese paquete la primera vez.
- El escaneo con cámara requiere `localhost` o HTTPS (el navegador bloquea la cámara en `http://` con IP normal). Para usarlo desde otro dispositivo en la red, considere exponer el sitio con HTTPS o usar el lector USB, que no tiene esa restricción.
- Los productos por peso (`kg`) piden la cantidad exacta al escanearlos/buscarlos (ej: 1.35 kg de arroz).

## Posibles mejoras futuras

- Login de cajero/administrador (multiusuario).
- Notificación automática de stock bajo por correo o WhatsApp.
- Respaldo automático de la base de datos.
