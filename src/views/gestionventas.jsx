import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "../styles/empleados.css";

const ITEMS_PER_PAGE = 8;

const GestionVentas = () => {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const [detalleOpen, setDetalleOpen] = useState(false);
  const [ventaSel, setVentaSel] = useState(null);

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
          fecha: r.fecha?.toDate ? r.fecha.toDate() : new Date(),
          cliente: r.cliente || "Cliente",
          total: Number(r.total || 0),
          items: Array.isArray(r.items) ? r.items : [],
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

  // ===== PAGINADO =====
  const totalPages = Math.ceil(ventas.length / ITEMS_PER_PAGE);
  const pageRows = ventas.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const verDetalle = (v) => {
    setVentaSel(v);
    setDetalleOpen(true);
  };

  return (
    <div className="emp-page">

      {/* ===== HEADER ===== */}
      <div className="emp-header">
        <div>
          <h1 className="emp-title">Gestión de Ventas</h1>
          <p className="emp-subtitle">
            Historial de facturas registradas
          </p>
        </div>
      </div>

      {error && <div className="emp-error">{error}</div>}

      {/* ===== LISTADO ===== */}
      <div className="emp-card">
        <div className="emp-card-title">Ventas</div>

        {loading ? (
          <div className="emp-muted">Cargando...</div>
        ) : ventas.length === 0 ? (
          <div className="emp-muted">No hay ventas registradas.</div>
        ) : (
          <div className="emp-table">

            <div className="emp-thead">
              <div>Fecha</div>
              <div>Cliente</div>
              <div>Total</div>
              <div>Acciones</div>
            </div>

            {pageRows.map(v => (
              <div className="emp-tr" key={v.id}>
                <div className="emp-td">
                  {v.fecha.toLocaleDateString()}
                </div>
                <div className="emp-td emp-name">
                  {v.cliente}
                </div>
                <div className="emp-td">
                  C$ {v.total.toFixed(2)}
                </div>
                <div className="emp-td emp-actions">
                  <button
                    className="emp-btn"
                    onClick={() => verDetalle(v)}
                  >
                    Ver detalles
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ===== PAGINADO ===== */}
        {totalPages > 1 && (
          <div
            className="emp-form-actions"
            style={{ justifyContent: "center", marginTop: 12 }}
          >
            <button
              className="emp-btn"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
            >
              Anterior
            </button>

            <span style={{ padding: "0 12px" }}>
              {currentPage} / {totalPages}
            </span>

            <button
              className="emp-btn"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* ===== DETALLE (CARD ESTILO INVENTARIO) ===== */}
      {detalleOpen && ventaSel && (
        <div className="emp-modal" onClick={() => setDetalleOpen(false)}>
          <div
            className="emp-modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 720 }}
          >
            <div className="emp-modal-title">Detalle de Venta</div>

            <div style={{ marginBottom: 12 }}>
              <strong>Cliente:</strong> {ventaSel.cliente}<br />
              <strong>Fecha:</strong> {ventaSel.fecha.toLocaleString()}<br />
              <strong>Total:</strong> C$ {ventaSel.total.toFixed(2)}
            </div>

            <div className="emp-card" style={{ padding: 12 }}>
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

                {ventaSel.items.map((i, idx) => (
                  <div className="emp-tr" key={idx}>
                    <div className="emp-td emp-name">{i.nombre}</div>
                    <div className="emp-td">{i.color}</div>
                    <div className="emp-td">{i.categoria}</div>
                    <div className="emp-td">{i.cantidad}</div>
                    <div className="emp-td">C$ {Number(i.precio).toFixed(2)}</div>
                    <div className="emp-td">
                      C$ {(i.precio * i.cantidad).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="emp-form-actions">
              <button className="emp-btn" onClick={() => setDetalleOpen(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default GestionVentas;
