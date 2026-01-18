// src/views/ventas.jsx
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "../styles/ventas.css";

import jsPDF from "jspdf";
import logoVidrimax from "../assets/logoex.png";

function Ventas() {
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const [busqueda, setBusqueda] = useState("");

  // ===== Modal empleado y cliente =====
  const [modalEmpleado, setModalEmpleado] = useState(false);
  const [empleados, setEmpleados] = useState([]);
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState("");
  const [cliente, setCliente] = useState("");

  // ===== Cargar inventario =====
  useEffect(() => {
    const cargarInventario = async () => {
      try {
        const snap = await getDocs(collection(db, "inventario"));
        const data = snap.docs.map(d => {
          const i = d.data();
          const stock = Number(i.stock_total ?? 0);
          return {
            id: d.id,
            nombre: i.nombre ?? "",
            color: i.color ?? "",
            categoria: i.categoria ?? "",
            precio: Number(i.precio_venta ?? 0),
            existencia: stock
          };
        });
        setInventario(data);
      } catch (e) {
        console.error("Error cargando inventario:", e);
      }
    };
    cargarInventario();
  }, []);

  // ===== Cargar empleados =====
  useEffect(() => {
    const cargarEmpleados = async () => {
      try {
        const snap = await getDocs(collection(db, "empleados"));
        const data = snap.docs.map(d => ({ id: d.id, nombre: d.data().nombre }));
        setEmpleados(data);
      } catch (e) {
        console.error("Error cargando empleados:", e);
      }
    };
    cargarEmpleados();
  }, []);

  // ===== Filtrado seguro =====
  const inventarioFiltrado = inventario.filter(p => {
    const nombre = String(p.nombre ?? "");
    const color = String(p.color ?? "");
    const categoria = String(p.categoria ?? "");
    const busq = busqueda.toLowerCase();

    return (
      nombre.toLowerCase().includes(busq) ||
      color.toLowerCase().includes(busq) ||
      categoria.toLowerCase().includes(busq)
    );
  });

  // ===== Carrito =====
  const agregar = (p) => {
    if (p.existencia <= 0) return;
    const existe = carrito.find(i => i.id === p.id);

    if (existe) {
      if (existe.cantidad + 1 > p.existencia) return;
      setCarrito(carrito.map(i =>
        i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
      ));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const sumar = (id) => {
    setCarrito(carrito.map(i => {
      if (i.id === id && i.cantidad < i.existencia) return { ...i, cantidad: i.cantidad + 1 };
      return i;
    }));
  };

  const restar = (id) => {
    setCarrito(
      carrito
        .map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i)
        .filter(i => i.cantidad > 0)
    );
  };

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

  // ===== Generar PDF =====
  const generarFacturaPDF = (factura) => {
    const EMPRESA = {
      nombre: "VIDRIMAX",
      telefono: "Tel: 5802-8225",
      direccion: "Del Hotel Pergolas 100 v alsur, 20 v al Este",
      frase: "Calidad y confianza en cada detalle"
    };

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [140, 216] });

    const M_LEFT = 6, M_RIGHT = 134, M_TOP = 12;
    let y = M_TOP;

    // Logo
    const logoWidth = 30, logoHeight = 18, logoX = (140 - logoWidth) / 2;
    doc.addImage(logoVidrimax, "PNG", logoX, y, logoWidth, logoHeight);
    y += logoHeight + 2;

    // Encabezado
    doc.setFontSize(14); doc.text(EMPRESA.nombre, 70, y, { align: "center" });
    y += 5; doc.setFontSize(9); doc.text(EMPRESA.frase, 70, y, { align: "center" });
    y += 4; doc.text(EMPRESA.direccion, 70, y, { align: "center" });
    y += 4; doc.text(EMPRESA.telefono, 70, y, { align: "center" });

    y += 4; doc.setLineWidth(0.4); doc.line(M_LEFT, y, M_RIGHT, y);

    // Datos de factura
    y += 8; doc.setFontSize(9);
    doc.text(`Factura #: ${factura.numero}`, M_LEFT, y);
    doc.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString()}`, M_RIGHT, y, { align: "right" });
    y += 6; doc.text(`Cliente: ${factura.cliente}`, M_LEFT, y);
    y += 6; doc.text(`Empleado: ${factura.empleado}`, M_LEFT, y);

    // Cabecera tabla
    y += 8; doc.setFontSize(8); doc.setLineWidth(0.3); doc.line(M_LEFT, y, M_RIGHT, y);
    y += 5;
    doc.text("Producto", M_LEFT + 2, y);
    doc.text("Cant", 90, y, { align: "right" });
    doc.text("Precio", 112, y, { align: "right" });
    doc.text("Subt", 134, y, { align: "right" });
    y += 3; doc.line(M_LEFT, y, M_RIGHT, y); y += 5;

    factura.items.forEach((i) => {
      const nombre = `${i.nombre} - ${i.color}`;
      doc.text(nombre, M_LEFT + 2, y, { maxWidth: 75 });
      doc.text(String(i.cantidad), 90, y, { align: "right" });
      doc.text(`C$ ${i.precio.toFixed(2)}`, 112, y, { align: "right" });
      doc.text(`C$ ${i.subtotal.toFixed(2)}`, 134, y, { align: "right" });
      y += 6;
      if (y > 185) { doc.addPage(); y = M_TOP + 10; }
    });

    // Total
    y += 2; doc.setLineWidth(0.4); doc.line(M_LEFT, y, M_RIGHT, y);
    y += 8; doc.setFontSize(11);
    doc.text(`TOTAL: C$ ${factura.total.toFixed(2)}`, M_RIGHT, y, { align: "right" });

    // Pie
    y += 14; doc.setFontSize(8);
    doc.text("Gracias por su preferencia", 70, y, { align: "center" });
    doc.text("Factura válida como comprobante de venta, Revisen su mercancía y no se aceptan devoluciones", 70, y + 5, { align: "center" });

    doc.save(`Factura_${factura.numero}.pdf`);
  };

  // ===== Guardar venta =====
  const guardarVentaFinal = async () => {
    setModalEmpleado(false);
    setGuardando(true);

    try {
      for (const item of carrito) {
        const ref = doc(db, "inventario", item.id);
        const snap = await getDoc(ref);
        const stockActual = snap.data().stock_total ?? 0;
        if (item.cantidad > stockActual) throw new Error(`Stock insuficiente: ${item.nombre}`);
      }

      const factura = {
        numero: Date.now(),
        cliente,
        empleado: empleadoSeleccionado,
        fecha: new Date(),
        items: carrito.map(i => ({
          id: i.id,
          nombre: i.nombre,
          categoria: i.categoria,
          color: i.color,
          cantidad: i.cantidad,
          precio: i.precio,
          subtotal: i.precio * i.cantidad
        })),
        total
      };

      await addDoc(collection(db, "ventas"), factura);

      // Actualizar stock
      for (const item of carrito) {
        const ref = doc(db, "inventario", item.id);
        const snap = await getDoc(ref);
        const stockActual = snap.data().stock_total ?? 0;
        await updateDoc(ref, { stock_total: stockActual - item.cantidad });
      }

      generarFacturaPDF(factura);
      alert("Venta guardada y factura generada");
      setCarrito([]);
      setCliente("");
      setEmpleadoSeleccionado("");
      setBusqueda("");
    } catch (e) {
      alert(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="ventas-container">
      <h2>Nueva Venta</h2>
      <div className="ventas-grid">
        {/* INVENTARIO */}
        <div className="card">
          <h3>Inventario</h3>
          <input
            className="inv-search-input"
            type="text"
            placeholder="Buscar por nombre, color o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {inventarioFiltrado.map(p => (
            <div className="inv-row" key={p.id}>
              <div>
                <strong>{p.nombre}</strong>{" "}
                <span style={{ color: "#999" }}>({p.color})</span>
                <small>Stock: {p.existencia}</small>
              </div>
              <button
                className={`btn-agregar ${p.existencia === 0 ? "disabled" : ""}`}
                disabled={p.existencia === 0}
                onClick={() => agregar(p)}
              >
                Agregar
              </button>
            </div>
          ))}
        </div>

        {/* CARRITO */}
        <div className="card">
          <h3>Venta</h3>
          {carrito.map(i => (
            <div className="cart-row" key={i.id}>
              <span>{i.nombre} ({i.color})</span>
              <div className="qty-box">
                <button className="qty-btn" onClick={() => restar(i.id)}>−</button>
                <div className="qty-value">{i.cantidad}</div>
                <button className="qty-btn" onClick={() => sumar(i.id)}>+</button>
              </div>
              <span className="price">
                C$ {(i.precio * i.cantidad).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="total">
            Total: C$ {total.toLocaleString("es-NI", { minimumFractionDigits: 2 })}
          </div>

          <button
            className="btn-confirmar"
            onClick={() => setModalEmpleado(true)}
            disabled={guardando || carrito.length === 0}
          >
            {guardando ? "Guardando..." : "Confirmar Venta"}
          </button>
        </div>
      </div>

      {/* Modal empleado y cliente */}
      {modalEmpleado && (
        <div className="modal-overlay" onClick={() => setModalEmpleado(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <h3>Información de la venta</h3>
            <label>Empleado</label>
            <select
              value={empleadoSeleccionado}
              onChange={e => setEmpleadoSeleccionado(e.target.value)}
            >
              <option value="">Selecciona un empleado</option>
              {empleados.map(emp => (
                <option key={emp.id} value={emp.nombre}>{emp.nombre}</option>
              ))}
            </select>

            <label>Cliente</label>
            <input
              type="text"
              placeholder="Nombre del cliente"
              value={cliente}
              onChange={e => setCliente(e.target.value)}
            />

            <div className="modal-actions">
              <button onClick={() => setModalEmpleado(false)}>Cancelar</button>
              <button
                onClick={() => {
                  if (!empleadoSeleccionado || !cliente) {
                    alert("Selecciona un empleado y escribe el cliente");
                    return;
                  }
                  guardarVentaFinal();
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Ventas;
