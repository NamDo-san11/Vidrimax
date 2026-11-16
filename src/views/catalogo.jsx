// src/views/CatalogoEmpleados.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/catalogo.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { db } from "../database/firebaseconfig";
import { collection, getDocs } from "firebase/firestore";

const ITEMS_PER_PAGE = 15;
const LOW_STOCK = 5;

const normalizarTexto = (value) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

const CatalogoEmpleados = () => {
  const inventarioCollection = collection(db, "inventario");

  const [loading, setLoading] = useState(true);
  const [materiales, setMateriales] = useState([]);

  // Filtros
  const [q, setQ] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("ALL");
  const [stockFiltro, setStockFiltro] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);

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
    const needle = normalizarTexto(q.trim());
    return materiales.filter((m) => {
      const okQ =
        !needle ||
        normalizarTexto(m.nombre).includes(needle) ||
        normalizarTexto(m.descripcion).includes(needle) ||
        normalizarTexto(m.color).includes(needle);

      const okCat = categoriaFiltro === "ALL" ? true : m.categoria === categoriaFiltro;
      const okStock =
        stockFiltro === "available" ? m.stock_total >= LOW_STOCK :
        stockFiltro === "low" ? m.stock_total > 0 && m.stock_total < LOW_STOCK :
        stockFiltro === "out" ? m.stock_total <= 0 :
        true;

      return okQ && okCat && okStock;
    });
  }, [materiales, q, categoriaFiltro, stockFiltro]);

  const filtrosActivos = q.trim() !== "" || categoriaFiltro !== "ALL" || stockFiltro !== "ALL";

  const limpiarFiltros = () => {
    setQ("");
    setCategoriaFiltro("ALL");
    setStockFiltro("ALL");
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(filtrados.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const productosPagina = filtrados.slice(
    (safeCurrentPage - 1) * ITEMS_PER_PAGE,
    safeCurrentPage * ITEMS_PER_PAGE
  );

  const pageNumbers = useMemo(() => {
    const maxButtons = 7;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    const start = Math.max(2, safeCurrentPage - 2);
    const end = Math.min(totalPages - 1, safeCurrentPage + 2);
    const pages = [1];

    if (start > 2) pages.push("...");
    for (let page = start; page <= end; page += 1) pages.push(page);
    if (end < totalPages - 1) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [safeCurrentPage, totalPages]);

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
              aria-label="Buscar productos"
              placeholder="Buscar por nombre, descripción o color"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>

          <select
            className="empCat-filter"
            value={categoriaFiltro}
            onChange={(e) => {
              setCategoriaFiltro(e.target.value);
              setCurrentPage(1);
            }}
          >
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "Todas las categorías" : c}
              </option>
            ))}
          </select>

          <select
            className="empCat-filter"
            value={stockFiltro}
            aria-label="Filtrar por existencia"
            onChange={(e) => {
              setStockFiltro(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">Cualquier existencia</option>
            <option value="available">Stock normal ({LOW_STOCK}+ unidades)</option>
            <option value="low">Stock bajo (1–{LOW_STOCK - 1})</option>
            <option value="out">Agotado</option>
          </select>

          {filtrosActivos && (
            <button type="button" className="empCat-clearFilters" onClick={limpiarFiltros}>
              <i className="bi bi-x-circle" /> Limpiar filtros
            </button>
          )}
        </div>

        {!loading && (
          <div className="empCat-resultCount" aria-live="polite">
            {filtrados.length} {filtrados.length === 1 ? "producto encontrado" : "productos encontrados"}
          </div>
        )}

        {/* GRID DE PRODUCTOS */}
        {loading ? (
          <div className="empCat-empty">Cargando inventario...</div>
        ) : filtrados.length === 0 ? (
          <div className="empCat-empty">No hay productos que coincidan con tu búsqueda.</div>
        ) : (
          <div className="empCat-grid">
            {productosPagina.map((m) => (
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

        {!loading && filtrados.length > 0 && (
          <div className="empCat-pagination-wrap">
            <div className="empCat-pageInfo">
              Mostrando {(safeCurrentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(safeCurrentPage * ITEMS_PER_PAGE, filtrados.length)} de {filtrados.length} productos
            </div>

            {totalPages > 1 && (
              <nav className="empCat-pagination" aria-label="Paginación del catálogo">
                <button
                  type="button"
                  className="empCat-pageBtn"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage === 1}
                  aria-label="Página anterior"
                >
                  <i className="bi bi-chevron-left" /> Anterior
                </button>

                <div className="empCat-pageNumbers">
                  {pageNumbers.map((page, index) => page === "..." ? (
                    <span className="empCat-dots" key={`dots-${index}`} aria-hidden="true">…</span>
                  ) : (
                    <button
                      type="button"
                      className={`empCat-pageNum ${page === safeCurrentPage ? "active" : ""}`}
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === safeCurrentPage ? "page" : undefined}
                      aria-label={`Página ${page}`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="empCat-pageBtn"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage === totalPages}
                  aria-label="Página siguiente"
                >
                  Siguiente <i className="bi bi-chevron-right" />
                </button>
              </nav>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogoEmpleados;
  