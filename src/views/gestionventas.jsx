// src/views/GestionVentas.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "../styles/empleados.css";
import jsPDF from "jspdf";
import logoVidrimax from "../assets/logoex.png";

const ITEMS_PER_PAGE = 8;

const GestionVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [ventaSel, setVentaSel] = useState(null);

  const [busqCliente, setBusqCliente] = useState("");
  const [busqFecha, setBusqFecha] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "ventas"), orderBy("fecha", "desc"));
      const snap = await getDocs(q);

      const data = snap.docs.map(d => {
        const r = d.data();
        return {
          id: d.id,
          numero: r.numero || d.id,
          fecha: r.fecha?.toDate ? r.fecha.toDate() : new Date(),
          cliente: r.cliente || "Cliente",
          empleado: r.empleado || "Empleado",
          total: Number(r.total || 0),
          items: Array.isArray(r.items)
            ? r.items.map(i => ({
                ...i,
                subtotal: Number(i.precio) * Number(i.cantidad)
              }))
            : [],
        };
      });

      setVentas(data);
    } catch (e) {
      console.error(e);
      setError("No se pudieron cargar las ventas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  // ===== FILTRO =====
  const ventasFiltradas = useMemo(() => {
    return ventas.filter(v => {
      const matchCliente = v.cliente.toLowerCase().includes(busqCliente.toLowerCase());
      const matchFecha = busqFecha
        ? v.fecha.toISOString().split("T")[0] === busqFecha
        : true;
      return matchCliente && matchFecha;
    });
  }, [ventas, busqCliente, busqFecha]);

  const totalPages = Math.ceil(ventasFiltradas.length / ITEMS_PER_PAGE);
  const pageRows = ventasFiltradas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const verDetalle = (v) => {
    setVentaSel(v);
    setDetalleOpen(true);
  };

  // ===== DISEÑO EXACTO DE FACTURA =====
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
    doc.text("Factura válida como comprobante de venta", 70, y + 5, { align: "center" });

    doc.save(`Factura_${factura.numero}.pdf`);
  };

  return (
    <div className="emp-page">
      <div className="emp-header">
        <div>
          <h1 className="emp-title">Gestión de Ventas</h1>
          <p className="emp-subtitle">Historial de facturas registradas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="emp-card" style={{ marginBottom: 12 }}>
        <div className="emp-card-title">Filtrar ventas</div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", padding:"8px 0" }}>
          <input
            className="emp-input"
            placeholder="Buscar por cliente..."
            value={busqCliente}
            onChange={e=>setBusqCliente(e.target.value)}
          />
          <input
            className="emp-input"
            type="date"
            value={busqFecha}
            onChange={e=>setBusqFecha(e.target.value)}
          />
          <button className="emp-primary" onClick={()=>cargar()}>Buscar</button>
        </div>
      </div>

      {error && <div className="emp-error">{error}</div>}

      {/* LISTADO */}
      <div className="emp-card">
        <div className="emp-card-title">Ventas</div>
        {loading ? (
          <div className="emp-muted">Cargando...</div>
        ) : ventasFiltradas.length === 0 ? (
          <div className="emp-muted">No hay ventas registradas.</div>
        ) : (
          <div className="emp-table">
            <div className="emp-thead">
              <div>Fecha</div>
              <div>Cliente</div>
              <div>Total</div>
              <div>Acciones</div>
            </div>
            {pageRows.map(v=>(
              <div className="emp-tr" key={v.id}>
                <div className="emp-td">{v.fecha.toLocaleDateString()}</div>
                <div className="emp-td emp-name">{v.cliente}</div>
                <div className="emp-td">C$ {v.total.toFixed(2)}</div>
                <div className="emp-td emp-actions">
                  <button className="emp-btn" onClick={()=>verDetalle(v)}>Ver</button>
                  <button className="emp-primary" onClick={()=>generarFacturaPDF(v)}>Imprimir</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {totalPages>1 && (
          <div className="emp-form-actions" style={{justifyContent:"center", marginTop:12}}>
            <button className="emp-btn" onClick={()=>setCurrentPage(p=>Math.max(p-1,1))} disabled={currentPage===1}>Anterior</button>
            <span style={{padding:"0 12px"}}>{currentPage} / {totalPages}</span>
            <button className="emp-btn" onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))} disabled={currentPage===totalPages}>Siguiente</button>
          </div>
        )}
      </div>

      {/* Modal Detalle */}
      {detalleOpen && ventaSel && (
        <div className="emp-modal" onClick={()=>setDetalleOpen(false)}>
          <div className="emp-modal-card" onClick={e=>e.stopPropagation()} style={{ maxWidth:720 }}>
            <div className="emp-modal-title">Detalle de Venta</div>
            <div style={{ marginBottom:12 }}>
              <strong>Cliente:</strong> {ventaSel.cliente}<br/>
              <strong>Empleado:</strong> {ventaSel.empleado}<br/>
              <strong>Fecha:</strong> {ventaSel.fecha.toLocaleString()}<br/>
              <strong>Total:</strong> C$ {ventaSel.total.toFixed(2)}
            </div>
            <div className="emp-card" style={{ padding:12 }}>
              <div className="emp-card-title">Productos</div>
              <div className="emp-table">
                <div className="emp-thead">
                  <div>Producto</div>
                  <div>Color</div>
                  <div>Categoría</div>
                  <div>Cant.</div>
                  <div>Precio</div>
                  <div>Subtotal</div>
                </div>
                {ventaSel.items.map((i,idx)=>(
                  <div className="emp-tr" key={idx}>
                    <div className="emp-td emp-name">{i.nombre}</div>
                    <div className="emp-td">{i.color}</div>
                    <div className="emp-td">{i.categoria}</div>
                    <div className="emp-td">{i.cantidad}</div>
                    <div className="emp-td">C$ {Number(i.precio).toFixed(2)}</div>
                    <div className="emp-td">C$ {i.subtotal.toFixed(2)}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="emp-form-actions">
              <button className="emp-btn" onClick={()=>setDetalleOpen(false)}>Cerrar</button>
              <button className="emp-primary" onClick={()=>generarFacturaPDF(ventaSel)}>Imprimir Factura</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionVentas;
