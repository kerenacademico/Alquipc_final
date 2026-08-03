/* ---------------------------------------------------
   ALQUIPC — Facturación de alquiler de equipos
   Reglas de negocio (según Descripción del programa):
   - Tarifa: $35.000 por equipo / por día
   - Mínimo 2 equipos por solicitud
   - Opciones de alquiler:
       1) Dentro de la ciudad          -> sin ajuste
       2) Fuera de la ciudad           -> +5% (servicio a domicilio)
       3) Dentro del establecimiento   -> -5% (descuento)
   - Días adicionales: 2% de descuento por día adicional,
     con un TOPE máximo de 30% (mejora solicitada en el
     enunciado para que la empresa no pierda dinero: sin
     tope, el descuento crecería sin límite y el alquiler
     terminaría siendo gratis o negativo).
   - No se imprime recibo: los datos se muestran en pantalla
     y se envían por correo electrónico al cliente.
--------------------------------------------------- */

/* ---------- Control de acceso de operador ----------
   Nota pedagógica: esta validación ocurre en el cliente,
   por lo que es una mejora parcial de "Resistencia al
   acceso". Para un entorno real de producción, el código
   debe validarse contra un servicio de autenticación en
   el servidor (backend), no solo en el navegador. */
const CODIGO_OPERADOR = "ALQUIPC2024";

const gate = document.getElementById("gate");
const gateForm = document.getElementById("gateForm");
const gateError = document.getElementById("gateError");
const appEl = document.getElementById("app");

gateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const code = document.getElementById("gateCode").value.trim();
  if (code === CODIGO_OPERADOR) {
    gate.hidden = true;
    appEl.hidden = false;
    gateError.hidden = true;
  } else {
    gateError.hidden = false;
  }
});

const TARIFA_DIA = 35000;
const INCREMENTO_FUERA_CIUDAD = 0.05;
const DESCUENTO_ESTABLECIMIENTO = 0.05;
const DESCUENTO_POR_DIA_ADICIONAL = 0.02;
const TOPE_DESCUENTO_ADICIONAL = 0.30; // <-- mejora de la regla original

const OPCIONES = {
  "1": "Dentro de la ciudad",
  "2": "Fuera de la ciudad",
  "3": "Dentro del establecimiento",
};

const form = document.getElementById("rentalForm");
const formError = document.getElementById("formError");
const resultPanel = document.getElementById("resultPanel");
const sendMailBtn = document.getElementById("sendMailBtn");
const sendConfirm = document.getElementById("sendConfirm");
const sendConfirmMail = document.getElementById("sendConfirmMail");

let lastInvoice = null;

function moneyCOP(value) {
  return "$" + Math.round(value).toLocaleString("es-CO");
}

function generarIdCliente() {
  const n = Math.floor(1000 + Math.random() * 9000);
  const fecha = new Date();
  const sufijo = `${fecha.getFullYear()}${String(fecha.getMonth() + 1).padStart(2, "0")}${String(fecha.getDate()).padStart(2, "0")}`;
  return `ALQ-${sufijo}-${n}`;
}

function validar({ equipos, diasIniciales, diasAdicionales, correo }) {
  if (!Number.isInteger(equipos) || equipos < 2) {
    return "El número de equipos debe ser un entero y mínimo 2, según la política de ALQUIPC.";
  }
  if (!Number.isInteger(diasIniciales) || diasIniciales < 1) {
    return "El número de días iniciales debe ser un entero mayor o igual a 1.";
  }
  if (!Number.isInteger(diasAdicionales) || diasAdicionales < 0) {
    return "Los días adicionales deben ser un entero mayor o igual a 0.";
  }
  if (!correo || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return "Ingresa un correo electrónico válido para el envío del resumen.";
  }
  return null;
}

function calcularFactura({ opcion, equipos, diasIniciales, diasAdicionales }) {
  const subtotalInicial = equipos * diasIniciales * TARIFA_DIA;

  const descuentoAdicionalPct = Math.min(
    diasAdicionales * DESCUENTO_POR_DIA_ADICIONAL,
    TOPE_DESCUENTO_ADICIONAL
  );
  const subtotalAdicionalBruto = equipos * diasAdicionales * TARIFA_DIA;
  const subtotalAdicional = subtotalAdicionalBruto * (1 - descuentoAdicionalPct);

  const subtotal = subtotalInicial + subtotalAdicional;

  let ajusteOpcionPct = 0;
  if (opcion === "2") ajusteOpcionPct = INCREMENTO_FUERA_CIUDAD;
  if (opcion === "3") ajusteOpcionPct = -DESCUENTO_ESTABLECIMIENTO;

  const total = subtotal * (1 + ajusteOpcionPct);

  return {
    subtotalInicial,
    descuentoAdicionalPct,
    subtotalAdicional,
    ajusteOpcionPct,
    total,
  };
}

function renderResultado(datos, calculo, idCliente) {
  document.getElementById("idCliente").textContent = idCliente;
  document.getElementById("rOpcion").textContent = OPCIONES[datos.opcion];
  document.getElementById("rEquipos").textContent = datos.equipos;
  document.getElementById("rDiasIniciales").textContent = datos.diasIniciales;
  document.getElementById("rDiasAdicionales").textContent = datos.diasAdicionales;

  const ajusteTexto =
    calculo.ajusteOpcionPct === 0
      ? "Sin ajuste"
      : calculo.ajusteOpcionPct > 0
      ? `+${(calculo.ajusteOpcionPct * 100).toFixed(0)}% (servicio a domicilio)`
      : `${(calculo.ajusteOpcionPct * 100).toFixed(0)}% (descuento en establecimiento)`;
  document.getElementById("rAjusteOpcion").textContent = ajusteTexto;

  document.getElementById("rDescuentoAdicional").textContent =
    datos.diasAdicionales > 0
      ? `${(calculo.descuentoAdicionalPct * 100).toFixed(0)}% sobre ${datos.diasAdicionales} día(s) adicional(es)`
      : "No aplica";

  document.getElementById("rTotal").textContent = moneyCOP(calculo.total);

  resultPanel.hidden = false;
  sendConfirm.hidden = true;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const datos = {
    opcion: form.querySelector('input[name="opcion"]:checked').value,
    equipos: parseInt(document.getElementById("equipos").value, 10),
    diasIniciales: parseInt(document.getElementById("diasIniciales").value, 10),
    diasAdicionales: parseInt(document.getElementById("diasAdicionales").value || "0", 10),
    correo: document.getElementById("correo").value.trim(),
  };

  const error = validar(datos);
  if (error) {
    formError.textContent = error;
    formError.hidden = false;
    resultPanel.hidden = true;
    return;
  }
  formError.hidden = true;

  const calculo = calcularFactura(datos);
  const idCliente = generarIdCliente();

  lastInvoice = { datos, calculo, idCliente };
  renderResultado(datos, calculo, idCliente);
});

sendMailBtn.addEventListener("click", () => {
  if (!lastInvoice) return;
  const { datos, calculo, idCliente } = lastInvoice;

  const asunto = `ALQUIPC - Resumen de alquiler ${idCliente}`;
  const cuerpo = [
    `Id-cliente: ${idCliente}`,
    `Opción de alquiler: ${OPCIONES[datos.opcion]}`,
    `Equipos alquilados: ${datos.equipos}`,
    `Días iniciales: ${datos.diasIniciales}`,
    `Días adicionales: ${datos.diasAdicionales}`,
    `Ajuste por opción de alquiler: ${
      calculo.ajusteOpcionPct === 0
        ? "Sin ajuste"
        : (calculo.ajusteOpcionPct > 0 ? "+" : "") + (calculo.ajusteOpcionPct * 100).toFixed(0) + "%"
    }`,
    `Descuento por días adicionales: ${(calculo.descuentoAdicionalPct * 100).toFixed(0)}%`,
    `Valor total a cancelar: ${moneyCOP(calculo.total)}`,
  ].join("\n");

  const mailto = `mailto:${encodeURIComponent(datos.correo)}?subject=${encodeURIComponent(
    asunto
  )}&body=${encodeURIComponent(cuerpo)}`;

  window.location.href = mailto;

  sendConfirmMail.textContent = datos.correo;
  sendConfirm.hidden = false;
});
