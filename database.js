const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'pulperia.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS productos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo_barra TEXT UNIQUE,
  nombre TEXT NOT NULL,
  precio REAL NOT NULL,
  costo REAL DEFAULT 0,
  stock REAL NOT NULL DEFAULT 0,
  unidad TEXT NOT NULL DEFAULT 'unidad', -- 'unidad' o 'kg'
  stock_minimo REAL DEFAULT 5,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  telefono TEXT,
  saldo_fiado REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS ventas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  total REAL NOT NULL,
  forma_pago TEXT NOT NULL, -- efectivo, sinpe, fiado
  cliente_id INTEGER,
  monto_recibido REAL,
  vuelto REAL,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS venta_detalle (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  venta_id INTEGER NOT NULL,
  producto_id INTEGER NOT NULL,
  nombre_producto TEXT NOT NULL,
  cantidad REAL NOT NULL,
  precio_unitario REAL NOT NULL,
  subtotal REAL NOT NULL,
  FOREIGN KEY (venta_id) REFERENCES ventas(id),
  FOREIGN KEY (producto_id) REFERENCES productos(id)
);

CREATE TABLE IF NOT EXISTS abonos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  monto REAL NOT NULL,
  fecha TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);

CREATE TABLE IF NOT EXISTS cortes_caja (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_corte TEXT NOT NULL DEFAULT (datetime('now','localtime')),
  desde TEXT NOT NULL,
  hasta TEXT NOT NULL,
  total_efectivo REAL NOT NULL,
  total_sinpe REAL NOT NULL,
  total_fiado REAL NOT NULL,
  total_general REAL NOT NULL,
  cantidad_ventas INTEGER NOT NULL
);
`);

// Datos de ejemplo si la tabla productos esta vacia
const count = db.prepare('SELECT COUNT(*) AS c FROM productos').get().c;
if (count === 0) {
  const insert = db.prepare(`INSERT INTO productos (codigo_barra, nombre, precio, costo, stock, unidad, stock_minimo) VALUES (?,?,?,?,?,?,?)`);
  insert.run('7501000111116', 'Coca Cola 600ml', 700, 450, 24, 'unidad', 6);
  insert.run('7441027300019', 'Pan cuadrado', 1650, 1100, 10, 'unidad', 3);
  insert.run('0000000000001', 'Arroz (granel)', 650, 450, 50, 'kg', 10);
  insert.run('7702006000012', 'Frijoles negros 1lb', 900, 600, 15, 'unidad', 5);
}

module.exports = db;
