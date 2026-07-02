const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const clientes = db.prepare('SELECT * FROM clientes ORDER BY saldo_fiado DESC, nombre').all();
  res.render('clientes', { clientes });
});

router.post('/', (req, res) => {
  const { nombre, telefono } = req.body;
  db.prepare('INSERT INTO clientes (nombre, telefono) VALUES (?, ?)').run(nombre, telefono || null);
  res.redirect('/clientes');
});

// Registrar abono (pago) a la deuda de un cliente
router.post('/:id/abono', (req, res) => {
  const monto = parseFloat(req.body.monto);
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  if (!cliente) return res.status(404).send('Cliente no encontrado');
  if (monto <= 0 || monto > cliente.saldo_fiado + 0.001) {
    return res.status(400).send('Monto invalido');
  }
  const tx = db.transaction(() => {
    db.prepare('INSERT INTO abonos (cliente_id, monto) VALUES (?, ?)').run(req.params.id, monto);
    db.prepare('UPDATE clientes SET saldo_fiado = saldo_fiado - ? WHERE id = ?').run(monto, req.params.id);
  });
  tx();
  res.redirect('/clientes');
});

// Historial de un cliente
router.get('/:id', (req, res) => {
  const cliente = db.prepare('SELECT * FROM clientes WHERE id = ?').get(req.params.id);
  const ventas = db.prepare("SELECT * FROM ventas WHERE cliente_id = ? ORDER BY fecha DESC").all(req.params.id);
  const abonos = db.prepare('SELECT * FROM abonos WHERE cliente_id = ? ORDER BY fecha DESC').all(req.params.id);
  res.render('cliente_detalle', { cliente, ventas, abonos });
});

module.exports = router;
