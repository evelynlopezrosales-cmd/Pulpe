const express = require('express');
const path = require('path');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', require('./routes/caja'));
app.use('/productos', require('./routes/productos'));
app.use('/clientes', require('./routes/clientes'));
app.use('/reportes', require('./routes/reportes'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Pulperia POS corriendo en http://localhost:${PORT}`));
