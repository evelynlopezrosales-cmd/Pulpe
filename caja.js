let carrito = []; // {producto_id, nombre, cantidad, precio_unitario}
let productoPendientePeso = null;

const inputCodigo = document.getElementById('inputCodigo');
const inputBuscar = document.getElementById('inputBuscar');
const resultadosBusqueda = document.getElementById('resultadosBusqueda');
const tablaCarritoBody = document.querySelector('#tablaCarrito tbody');
const totalVenta = document.getElementById('totalVenta');
const formaPago = document.getElementById('formaPago');
const clienteBox = document.getElementById('clienteBox');
const efectivoBox = document.getElementById('efectivoBox');
const montoRecibido = document.getElementById('montoRecibido');
const vueltoTexto = document.getElementById('vueltoTexto');
const mensajeError = document.getElementById('mensajeError');

// --- Escaneo por teclado (lector de código de barras USB tipo "wedge") ---
inputCodigo.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    const codigo = inputCodigo.value.trim();
    inputCodigo.value = '';
    if (!codigo) return;
    await buscarYAgregarPorCodigo(codigo);
  }
});

async function buscarYAgregarPorCodigo(codigo) {
  mensajeError.textContent = '';
  try {
    const resp = await fetch(`/api/producto/${encodeURIComponent(codigo)}`);
    if (!resp.ok) {
      mensajeError.textContent = 'Producto no encontrado para el código: ' + codigo;
      return;
    }
    const producto = await resp.json();
    agregarProducto(producto);
  } catch (err) {
    mensajeError.textContent = 'Error buscando el producto';
  }
}

// --- Búsqueda por nombre ---
let timeoutBusqueda;
inputBuscar.addEventListener('input', () => {
  clearTimeout(timeoutBusqueda);
  const q = inputBuscar.value.trim();
  resultadosBusqueda.innerHTML = '';
  if (!q) return;
  timeoutBusqueda = setTimeout(async () => {
    const resp = await fetch(`/api/buscar?q=${encodeURIComponent(q)}`);
    const productos = await resp.json();
    resultadosBusqueda.innerHTML = '';
    productos.forEach(p => {
      const div = document.createElement('div');
      div.textContent = `${p.nombre} - ₡${p.precio} (stock: ${p.stock} ${p.unidad})`;
      div.onclick = () => { agregarProducto(p); resultadosBusqueda.innerHTML = ''; inputBuscar.value = ''; };
      resultadosBusqueda.appendChild(div);
    });
  }, 250);
});

// --- Escaneo por cámara (html5-qrcode) ---
const btnCamara = document.getElementById('btnCamara');
const readerDiv = document.getElementById('reader');
let html5QrCode = null;
let camaraActiva = false;

btnCamara.addEventListener('click', async () => {
  if (!camaraActiva) {
    readerDiv.style.display = 'block';
    html5QrCode = new Html5Qrcode('reader');
    try {
      await html5QrCode.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 200 },
        async (decodedText) => {
          await buscarYAgregarPorCodigo(decodedText);
        }
      );
      camaraActiva = true;
      btnCamara.textContent = '⏹ Detener cámara';
    } catch (err) {
      mensajeError.textContent = 'No se pudo acceder a la cámara';
      readerDiv.style.display = 'none';
    }
  } else {
    await html5QrCode.stop();
    readerDiv.style.display = 'none';
    camaraActiva = false;
    btnCamara.textContent = '📷 Usar cámara para escanear';
  }
});

// --- Agregar producto al carrito ---
function agregarProducto(producto) {
  if (producto.unidad === 'kg') {
    productoPendientePeso = producto;
    document.getElementById('pesoNombre').textContent = producto.nombre;
    document.getElementById('pesoCantidad').value = '';
    document.getElementById('pesoModal').classList.remove('hidden');
    document.getElementById('pesoCantidad').focus();
    return;
  }
  const existente = carrito.find(it => it.producto_id === producto.id);
  if (existente) {
    existente.cantidad += 1;
  } else {
    carrito.push({ producto_id: producto.id, nombre: producto.nombre, cantidad: 1, precio_unitario: producto.precio });
  }
  renderCarrito();
  inputCodigo.focus();
}

document.getElementById('pesoConfirmar').addEventListener('click', () => {
  const cantidad = parseFloat(document.getElementById('pesoCantidad').value);
  if (!cantidad || cantidad <= 0) return;
  carrito.push({ producto_id: productoPendientePeso.id, nombre: productoPendientePeso.nombre, cantidad, precio_unitario: productoPendientePeso.precio });
  document.getElementById('pesoModal').classList.add('hidden');
  renderCarrito();
  inputCodigo.focus();
});
document.getElementById('pesoCancelar').addEventListener('click', () => {
  document.getElementById('pesoModal').classList.add('hidden');
  inputCodigo.focus();
});

function renderCarrito() {
  tablaCarritoBody.innerHTML = '';
  let total = 0;
  carrito.forEach((it, idx) => {
    const subtotal = it.cantidad * it.precio_unitario;
    total += subtotal;
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${it.nombre}</td>
      <td>${it.cantidad}</td>
      <td>₡${it.precio_unitario}</td>
      <td>₡${subtotal.toFixed(2)}</td>
      <td><button class="secundario" onclick="quitarDelCarrito(${idx})">✕</button></td>
    `;
    tablaCarritoBody.appendChild(tr);
  });
  totalVenta.textContent = `₡${total.toFixed(2)}`;
  actualizarVuelto();
}

function quitarDelCarrito(idx) {
  carrito.splice(idx, 1);
  renderCarrito();
}

// --- Forma de pago ---
formaPago.addEventListener('change', () => {
  clienteBox.classList.toggle('hidden', formaPago.value !== 'fiado');
  efectivoBox.classList.toggle('hidden', formaPago.value !== 'efectivo');
});

montoRecibido.addEventListener('input', actualizarVuelto);

function actualizarVuelto() {
  const total = carrito.reduce((acc, it) => acc + it.cantidad * it.precio_unitario, 0);
  const recibido = parseFloat(montoRecibido.value) || 0;
  if (formaPago.value === 'efectivo' && recibido > 0) {
    const vuelto = recibido - total;
    vueltoTexto.textContent = vuelto >= 0 ? `Vuelto: ₡${vuelto.toFixed(2)}` : `Falta: ₡${Math.abs(vuelto).toFixed(2)}`;
  } else {
    vueltoTexto.textContent = '';
  }
}

// --- Cobrar ---
document.getElementById('btnCobrar').addEventListener('click', async () => {
  mensajeError.textContent = '';
  if (carrito.length === 0) { mensajeError.textContent = 'El carrito está vacío'; return; }

  const body = {
    items: carrito,
    forma_pago: formaPago.value,
    cliente_id: formaPago.value === 'fiado' ? document.getElementById('clienteSelect').value : null,
    monto_recibido: formaPago.value === 'efectivo' ? parseFloat(montoRecibido.value) || null : null
  };

  try {
    const resp = await fetch('/api/venta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await resp.json();
    if (!resp.ok) { mensajeError.textContent = data.error; return; }

    window.open(`/recibo/${data.ventaId}`, '_blank');
    carrito = [];
    renderCarrito();
    montoRecibido.value = '';
    document.getElementById('clienteSelect').value = '';
    inputCodigo.focus();
  } catch (err) {
    mensajeError.textContent = 'Error al procesar la venta';
  }
});

renderCarrito();
