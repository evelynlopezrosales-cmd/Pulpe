const express = require('express');
const router = express.Router();
const db = require('../db/database');

function rangoHoy() {
  const hoy = new Date();
  const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 0, 0, 0);
  const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate(), 23, 59, 59);
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  return { desde: fmt(desde), hasta: fmt(hasta) };
}

router.get('/', (req, res) => {
  const { desde, hasta } = req.query.desde ? req.query : rangoHoy();

  const ventas = db.prepare(`SELECT * FROM ventas WHERE fecha BETWEEN ? AND ? ORDER BY fecha DESC`).all(desde, hasta);

  const totales = { efectivo: 0, sinpe: 0, fiado: 0, general: 0 };
  for (const v of ventas) {
    totales[v.forma_pago] = (totales[v.forma_pago] || 0) + v.total;
    totales.general += v.total;
  }

  const productosVendidos = db.prepare(`
    SELECT nombre_producto, SUM(cantidad) AS cantidad, SUM(subtotal) AS total
    FROM venta_detalle
    WHERE venta_id IN (SELECT id FROM ventas WHERE fecha BETWEEN ? AND ?)
    GROUP BY nombre_producto
    ORDER BY total DESC
  `).all(desde, hasta);

  const stockBajo = db.prepare('SELECT * FROM productos WHERE stock <= stock_minimo AND activo = 1').all();

  const cortes = db.prepare('SELECT * FROM cortes_caja ORDER BY fecha_corte DESC LIMIT 10').all();

  res.render('reportes', { ventas, totales, productosVendidos, stockBajo, desde, hasta, cortes });
});

// Cerrar caja: guarda una foto de los totales del rango indicado
router.post('/cerrar-caja', (req, res) => {
  const { desde, hasta } = req.body;
  const ventas = db.prepare(`SELECT * FROM ventas WHERE fecha BETWEEN ? AND ?`).all(desde, hasta);

  const totales = { efectivo: 0, sinpe: 0, fiado: 0 };
  for (const v of ventas) totales[v.forma_pago] = (totales[v.forma_pago] || 0) + v.total;
  const total_general = totales.efectivo + totales.sinpe + totales.fiado;

  db.prepare(`
    INSERT INTO cortes_caja (desde, hasta, total_efectivo, total_sinpe, total_fiado, total_general, cantidad_ventas)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(desde, hasta, totales.efectivo, totales.sinpe, totales.fiado, total_general, ventas.length);

  res.redirect('/reportes');
});

module.exports = router;
