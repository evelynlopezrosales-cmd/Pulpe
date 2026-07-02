const express = require('express');
const router = express.Router();
const db = require('../db/database');

// Pantalla principal de caja
router.get('/', (req, res) => {
  const clientes = db.prepare('SELECT id, nombre FROM clientes ORDER BY nombre').all();
  res.render('caja', { clientes });
});

// Buscar producto por codigo de barra (AJAX desde el escaner)
router.get('/api/producto/:codigo', (req, res) => {
  const producto = db.prepare('SELECT * FROM productos WHERE codigo_barra = ? AND activo = 1').get(req.params.codigo);
  if (!producto) return res.status(404).json({ error: 'Producto no encontrado' });
  res.json(producto);
});

// Buscar productos por nombre (para cuando no hay codigo a mano)
router.get('/api/buscar', (req, res) => {
  const q = `%${req.query.q || ''}%`;
  const productos = db.prepare('SELECT * FROM productos WHERE nombre LIKE ? AND activo = 1 LIMIT 10').all(q);
  res.json(productos);
});

// Registrar una venta
router.post('/api/venta', (req, res) => {
  const { items, forma_pago, cliente_id, monto_recibido } = req.body;

  if (!items || items.length === 0) return res.status(400).json({ error: 'El carrito esta vacio' });
  if (forma_pago === 'fiado' && !cliente_id) return res.status(400).json({ error: 'Debe seleccionar un cliente para fiar' });

  const total = items.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0);

  const transaccion = db.transaction(() => {
    // Validar y descontar stock
    for (const it of items) {
      const prod = db.prepare('SELECT * FROM productos WHERE id = ?').get(it.producto_id);
      if (!prod) throw new Error(`Producto ${it.nombre} no existe`);
      if (prod.stock < it.cantidad) throw new Error(`Stock insuficiente de ${prod.nombre} (disponible: ${prod.stock})`);
      db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run(it.cantidad, it.producto_id);
    }

    const vuelto = forma_pago === 'efectivo' && monto_recibido ? (monto_recibido - total) : null;

    const ventaInfo = db.prepare(`
      INSERT INTO ventas (total, forma_pago, cliente_id, monto_recibido, vuelto)
      VALUES (?, ?, ?, ?, ?)
    `).run(total, forma_pago, cliente_id || null, monto_recibido || null, vuelto);

    const ventaId = ventaInfo.lastInsertRowid;

    const insertDetalle = db.prepare(`
      INSERT INTO venta_detalle (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    for (const it of items) {
      insertDetalle.run(ventaId, it.producto_id, it.nombre, it.cantidad, it.precio_unitario, it.cantidad * it.precio_unitario);
    }

    if (forma_pago === 'fiado') {
      db.prepare('UPDATE clientes SET saldo_fiado = saldo_fiado + ? WHERE id = ?').run(total, cliente_id);
    }

    return { ventaId, total, vuelto };
  });

  try {
    const resultado = transaccion();
    res.json({ ok: true, ...resultado });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Recibo simple en HTML para imprimir
router.get('/recibo/:id', (req, res) => {
  const venta = db.prepare('SELECT * FROM ventas WHERE id = ?').get(req.params.id);
  if (!venta) return res.status(404).send('Venta no encontrada');
  const detalle = db.prepare('SELECT * FROM venta_detalle WHERE venta_id = ?').all(req.params.id);
  const cliente = venta.cliente_id ? db.prepare('SELECT * FROM clientes WHERE id = ?').get(venta.cliente_id) : null;
  res.render('recibo', { venta, detalle, cliente });
});

module.exports = router;
