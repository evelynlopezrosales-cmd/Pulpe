const express = require('express');
const router = express.Router();
const db = require('../db/database');

router.get('/', (req, res) => {
  const productos = db.prepare('SELECT * FROM productos WHERE activo = 1 ORDER BY nombre').all();
  res.render('productos', { productos });
});

router.post('/', (req, res) => {
  const { codigo_barra, nombre, precio, costo, stock, unidad, stock_minimo } = req.body;
  db.prepare(`
    INSERT INTO productos (codigo_barra, nombre, precio, costo, stock, unidad, stock_minimo)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(codigo_barra || null, nombre, precio, costo || 0, stock || 0, unidad || 'unidad', stock_minimo || 5);
  res.redirect('/productos');
});

router.post('/:id/editar', (req, res) => {
  const { nombre, precio, costo, stock, unidad, stock_minimo, codigo_barra } = req.body;
  db.prepare(`
    UPDATE productos SET nombre=?, precio=?, costo=?, stock=?, unidad=?, stock_minimo=?, codigo_barra=?
    WHERE id=?
  `).run(nombre, precio, costo, stock, unidad, stock_minimo, codigo_barra || null, req.params.id);
  res.redirect('/productos');
});

router.post('/:id/eliminar', (req, res) => {
  db.prepare('UPDATE productos SET activo = 0 WHERE id = ?').run(req.params.id);
  res.redirect('/productos');
});

module.exports = router;
