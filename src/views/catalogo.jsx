// src/views/CatalogoEmpleados.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/catalogo.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { db } from "../database/firebaseconfig";
import { collection, getDocs } from "firebase/firestore";

const CatalogoEmpleados = () => {
  const inventarioCollection = collection(db, "inventario");

  const [loading, setLoading] = useState(true);
  const [materiales, setMateriales] = useState([]);

  // Filtros
  const [q, setQ] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("ALL");

  const fetchMateriales = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(inventarioCollection);
      const rows = snap.docs.map((d) => {
        const r = d.data();
        const stock_total = Number(r.stock_total ?? 0);

        return {
          id: d.id,
          nombre: r.nombre ?? "",
          descripcion: r.descripcion ?? "",
          color: r.color ?? "",
          categoria: r.categoria ?? "Sin categoría",
          stock_total,
          precio_venta: Number(r.precio_venta ?? 0),
          activo: Boolean(r.activo ?? true),
        };
      });
      setMateriales(rows);
    } catch (e) {
      console.error("Error al cargar inventario:", e);
      alert("No se pudo cargar el inventario. Revisa permisos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriales();
  }, []);

  const categorias = useMemo(() => {
    const set = new Set(materiales.map((m) => m.categoria || "Sin categoría"));
    return ["ALL", ...Array.from(set)];
  }, [materiales]);

  const filtrados = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return materiales.filter((m) => {
      const okQ =
        !needle ||
        m.nombre.toLowerCase().includes(needle) ||
        m.descripcion.toLowerCase().includes(needle) ||
        m.color.toLowerCase().includes(needle);

      const okCat = categoriaFiltro === "ALL" ? true : m.categoria === categoriaFiltro;
      return okQ && okCat;
    });
  }, [materiales, q, categoriaFiltro]);

  return (
    <div className="empCat-page">
      <div className="empCat-container">
        {/* HEADER */}
        <div className="empCat-head">
          <div>
            <h2 className="empCat-title">Catálogo</h2>
            <p className="empCat-subtitle">Consulta productos disponibles</p>
          </div>
        </div>

        {/* FILTROS */}
        <div className="empCat-toolbar">
          <div className="empCat-search">
            <i className="bi bi-search" />
            <input
              placeholder="Buscar por nombre, descripción o color..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="empCat-filter"
            value={categoriaFiltro}
            onChange={(e) => setCategoriaFiltro(e.target.value)}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "Todas las categorías" : c}
              </option>
            ))}
          </select>
        </div>

        {/* GRID DE PRODUCTOS */}
        {loading ? (
          <div className="empCat-empty">Cargando inventario...</div>
        ) : filtrados.length === 0 ? (
          <div className="empCat-empty">No hay productos que coincidan con tu búsqueda.</div>
        ) : (
          <div className="empCat-grid">
            {filtrados.map((m) => (
              <div key={m.id} className={`empCat-card ${m.activo ? "" : "is-off"}`}>
                <div className="empCat-card-top">
                  <div className="empCat-iconbox">
                    <i className="bi bi-box-seam" />
                  </div>
                  <span className="empCat-pill">{m.categoria}</span>
                </div>

                <h3 className="empCat-name">{m.nombre}</h3>

                <div className="empCat-meta">
                  <div className="empCat-line">
                    <span>Descripción:</span>
                    <span className="empCat-value">{m.descripcion}</span>
                  </div>
                  <div className="empCat-line">
                    <span>Color:</span>
                    <span className="empCat-value">{m.color}</span>
                  </div>
                  <div className="empCat-line">
                    <span>Existencia:</span>
                    <span className={`empCat-value ${m.stock_total < 5 ? "low-stock" : ""}`}>
                      {m.stock_total}
                      {m.stock_total < 5 && (
                        <span className="empCat-badge">Stock bajo</span>
                      )}
                    </span>
                  </div>
                  <div className="empCat-line">
                    <span>Precio:</span>
                    <span className="empCat-money">C$ {m.precio_venta.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogoEmpleados;
  