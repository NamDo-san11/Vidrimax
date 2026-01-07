// src/views/inventario.jsx
import React, { useEffect, useMemo, useState } from "react";
import "../styles/inventario.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import { db } from "../database/firebaseconfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

const LOW_STOCK = 5;

const Inventario = () => {
  const inventarioCollection = collection(db, "inventario");

  const [loading, setLoading] = useState(true);
  const [materiales, setMateriales] = useState([]);

  // UI
  const [q, setQ] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("ALL");

  // Modales
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDel, setShowDel] = useState(false);

  // Selecciones
  const [selected, setSelected] = useState(null);

  // Form add
  const [nuevo, setNuevo] = useState({
    descripcion: "",
    categoria: "",
    stock_total: "",
    precio_compra: "",
    precio_venta: "",
    activo: true,
  });

  // Form edit
  const [edit, setEdit] = useState({
    descripcion: "",
    categoria: "",
    stock_total: "",
    precio_compra: "",
    precio_venta: "",
    activo: true,
  });

  const fetchMateriales = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(inventarioCollection);

      const rows = snap.docs.map((d) => {
        const r = d.data();
        const stock = Number(r.stock_total ?? 0);
        const vendidos = Number(r.vendidos ?? 0);
        const existencia = Math.max(stock - vendidos, 0);

        return {
          id: d.id,
          descripcion: r.descripcion ?? "",
          categoria: r.categoria ?? "Sin categoría",
          stock_total: stock,
          vendidos,
          existencia,
          precio_compra: Number(r.precio_compra ?? 0),
          precio_venta: Number(r.precio_venta ?? 0),
          activo: Boolean(r.activo ?? true),
          creadoEn: r.creadoEn ?? null,
        };
      });

      setMateriales(rows);
    } catch (e) {
      console.error("Error al cargar inventario:", e);
      alert("No se pudo cargar el inventario. Revisa permisos/reglas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMateriales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        m.descripcion.toLowerCase().includes(needle) ||
        (m.categoria || "").toLowerCase().includes(needle);

      const okCat = categoriaFiltro === "ALL" ? true : m.categoria === categoriaFiltro;
      return okQ && okCat;
    });
  }, [materiales, q, categoriaFiltro]);

  const onChangeNuevo = (e) => {
    const { name, value, type, checked } = e.target;
    setNuevo((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const onChangeEdit = (e) => {
    const { name, value, type, checked } = e.target;
    setEdit((p) => ({ ...p, [name]: type === "checkbox" ? checked : value }));
  };

  const guardar = async () => {
    try {
      const descripcion = (nuevo.descripcion || "").trim();
      const categoria = (nuevo.categoria || "").trim() || "Sin categoría";

      const stock_total = Number(nuevo.stock_total || 0);
      const precio_compra = Number(nuevo.precio_compra || 0);
      const precio_venta = Number(nuevo.precio_venta || 0);

      if (!descripcion) return alert("Escribe la descripción.");
      if (stock_total < 0 || precio_compra < 0 || precio_venta < 0)
        return alert("No uses valores negativos.");

      await addDoc(inventarioCollection, {
        descripcion,
        categoria,
        stock_total,
        vendidos: 0,
        precio_compra,
        precio_venta,
        activo: Boolean(nuevo.activo),
        creadoEn: serverTimestamp(),
      });

      setShowAdd(false);
      setNuevo({
        descripcion: "",
        categoria: "",
        stock_total: "",
        precio_compra: "",
        precio_venta: "",
        activo: true,
      });

      fetchMateriales();
    } catch (e) {
      console.error("Error al agregar material:", e);
      alert("Error al guardar. Si dice permissions, revisa reglas/rol admin.");
    }
  };

  const openEdit = (m) => {
    setSelected(m);
    setEdit({
      descripcion: m.descripcion ?? "",
      categoria: m.categoria ?? "",
      stock_total: String(m.stock_total ?? 0),
      precio_compra: String(m.precio_compra ?? 0),
      precio_venta: String(m.precio_venta ?? 0),
      activo: Boolean(m.activo ?? true),
    });
    setShowEdit(true);
  };

  const guardarEdicion = async () => {
    if (!selected?.id) return;

    try {
      const descripcion = (edit.descripcion || "").trim();
      const categoria = (edit.categoria || "").trim() || "Sin categoría";
      const stock_total = Number(edit.stock_total || 0);
      const precio_compra = Number(edit.precio_compra || 0);
      const precio_venta = Number(edit.precio_venta || 0);

      if (!descripcion) return alert("Escribe la descripción.");
      if (stock_total < 0 || precio_compra < 0 || precio_venta < 0)
        return alert("No uses valores negativos.");

      const ref = doc(db, "inventario", selected.id);

      // OJO: no tocamos vendidos aquí
      await updateDoc(ref, {
        descripcion,
        categoria,
        stock_total,
        precio_compra,
        precio_venta,
        activo: Boolean(edit.activo),
      });

      setShowEdit(false);
      setSelected(null);
      fetchMateriales();
    } catch (e) {
      console.error("Error al editar material:", e);
      alert("No se pudo editar. Revisa permisos.");
    }
  };

  const openDelete = (m) => {
    setSelected(m);
    setShowDel(true);
  };

  const confirmarDelete = async () => {
    if (!selected?.id) return;
    try {
      await deleteDoc(doc(db, "inventario", selected.id));
      setShowDel(false);
      setSelected(null);
      fetchMateriales();
    } catch (e) {
      console.error("Error al eliminar:", e);
      alert("No se pudo eliminar. Revisa permisos.");
    }
  };

  return (
    <div className="inv-page">
      <div className="inv-container">
        <div className="inv-head">
          <div>
            <h2 className="inv-title">Inventario</h2>
            <p className="inv-subtitle">Gestiona tus productos y existencias</p>
          </div>

          <div className="inv-head-actions">
            <button className="inv-add-btn" onClick={() => setShowAdd(true)}>
              <span className="inv-plus">+</span> Agregar Producto
            </button>
          </div>
        </div>

        <div className="inv-toolbar">
          <div className="inv-search">
            <i className="bi bi-search" />
            <input
              placeholder="Buscar productos..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <select
            className="inv-filter"
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

        {loading ? (
          <div className="inv-empty">Cargando inventario...</div>
        ) : filtrados.length === 0 ? (
          <div className="inv-empty">No hay materiales que coincidan con tu búsqueda.</div>
        ) : (
          <div className="inv-grid">
            {filtrados.map((m) => {
              const low = Number(m.existencia) < LOW_STOCK;

              return (
                <div key={m.id} className={`inv-card ${m.activo ? "" : "is-off"}`}>
                  <div className="inv-card-top">
                    <div className="inv-iconbox">
                      <i className="bi bi-box-seam" />
                    </div>
                    <span className="inv-pill">{m.categoria}</span>
                  </div>

                  <h3 className="inv-name">{m.descripcion}</h3>

                  <div className="inv-meta">
                    <div className="inv-line">
                      <span>Existencia:</span>
                      <span className="inv-value">{m.existencia}</span>
                    </div>
                    <div className="inv-line">
                      <span>Stock total:</span>
                      <span className="inv-value">{m.stock_total}</span>
                    </div>
                    <div className="inv-line">
                      <span>Vendidos:</span>
                      <span className="inv-value">{m.vendidos}</span>
                    </div>
                    <div className="inv-line">
                      <span>Compra:</span>
                      <span className="inv-money">C$ {Number(m.precio_compra).toFixed(2)}</span>
                    </div>
                    <div className="inv-line">
                      <span>Venta:</span>
                      <span className="inv-money">C$ {Number(m.precio_venta).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="inv-card-actions">
                    <button className="inv-action-btn" onClick={() => openEdit(m)}>
                      <i className="bi bi-pencil-square" /> Editar
                    </button>
                    <button className="inv-action-btn danger" onClick={() => openDelete(m)}>
                      <i className="bi bi-trash" /> Eliminar
                    </button>
                  </div>

                  {low && (
                    <div className="inv-alert">
                      <i className="bi bi-exclamation-triangle-fill" />
                      <div>
                        Stock bajo — Mínimo: {LOW_STOCK}
                        <div style={{ fontWeight: 800, marginTop: 4 }}>
                          Quedan: {m.existencia}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* MODAL AGREGAR */}
        {showAdd && (
          <div className="vmx-modal-overlay" onClick={() => setShowAdd(false)}>
            <div className="vmx-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vmx-modal-header">
                <div className="vmx-modal-badge">+</div>
                <div>
                  <h3 className="vmx-modal-title">Agregar producto</h3>
                  <p className="vmx-modal-subtitle">
                    Completa los campos para registrar un producto.
                  </p>
                </div>
              </div>

              <div className="vmx-modal-body">
                <div className="vmx-grid">
                  <div className="vmx-field">
                    <label>Descripción</label>
                    <input
                      name="descripcion"
                      value={nuevo.descripcion}
                      onChange={onChangeNuevo}
                      placeholder="Ej: Vidrio claro 6mm"
                    />
                  </div>

                  <div className="vmx-field">
                    <label>Categoría</label>
                    <input
                      name="categoria"
                      value={nuevo.categoria}
                      onChange={onChangeNuevo}
                      placeholder="Ej: Vidrios, Espejos..."
                    />
                  </div>

                  <div className="vmx-field">
                    <label>Stock total</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="stock_total"
                      value={nuevo.stock_total}
                      onChange={onChangeNuevo}
                      placeholder="Ej: 240"
                    />
                  </div>

                  <div className="vmx-field">
                    <label>Precio compra</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="precio_compra"
                      value={nuevo.precio_compra}
                      onChange={onChangeNuevo}
                      placeholder="Ej: 2000"
                    />
                  </div>

                  <div className="vmx-field">
                    <label>Precio venta (unidad)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="precio_venta"
                      value={nuevo.precio_venta}
                      onChange={onChangeNuevo}
                      placeholder="Ej: 3000"
                    />
                  </div>

                  <div className="vmx-field" style={{ alignSelf: "end" }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        name="activo"
                        checked={nuevo.activo}
                        onChange={onChangeNuevo}
                      />
                      Activo
                    </label>
                  </div>
                </div>
              </div>

              <div className="vmx-modal-footer">
                <button className="vmx-btn" onClick={() => setShowAdd(false)}>
                  Cancelar
                </button>
                <button className="vmx-btn vmx-btn-primary" onClick={guardar}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL EDITAR */}
        {showEdit && (
          <div className="vmx-modal-overlay" onClick={() => setShowEdit(false)}>
            <div className="vmx-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vmx-modal-header">
                <div className="vmx-modal-badge">✎</div>
                <div>
                  <h3 className="vmx-modal-title">Editar producto</h3>
                  <p className="vmx-modal-subtitle">Actualiza los datos del producto.</p>
                </div>
              </div>

              <div className="vmx-modal-body">
                <div className="vmx-grid">
                  <div className="vmx-field">
                    <label>Descripción</label>
                    <input name="descripcion" value={edit.descripcion} onChange={onChangeEdit} />
                  </div>

                  <div className="vmx-field">
                    <label>Categoría</label>
                    <input name="categoria" value={edit.categoria} onChange={onChangeEdit} />
                  </div>

                  <div className="vmx-field">
                    <label>Stock total</label>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="stock_total"
                      value={edit.stock_total}
                      onChange={onChangeEdit}
                    />
                  </div>

                  <div className="vmx-field">
                    <label>Precio compra</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="precio_compra"
                      value={edit.precio_compra}
                      onChange={onChangeEdit}
                    />
                  </div>

                  <div className="vmx-field">
                    <label>Precio venta</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      name="precio_venta"
                      value={edit.precio_venta}
                      onChange={onChangeEdit}
                    />
                  </div>

                  <div className="vmx-field" style={{ alignSelf: "end" }}>
                    <label style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <input
                        type="checkbox"
                        name="activo"
                        checked={edit.activo}
                        onChange={onChangeEdit}
                      />
                      Activo
                    </label>
                  </div>
                </div>
              </div>

              <div className="vmx-modal-footer">
                <button className="vmx-btn" onClick={() => setShowEdit(false)}>
                  Cancelar
                </button>
                <button className="vmx-btn vmx-btn-primary" onClick={guardarEdicion}>
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL ELIMINAR */}
        {showDel && (
          <div className="vmx-modal-overlay" onClick={() => setShowDel(false)}>
            <div className="vmx-modal" onClick={(e) => e.stopPropagation()}>
              <div className="vmx-modal-header">
                <div className="vmx-modal-badge">!</div>
                <div>
                  <h3 className="vmx-modal-title">Eliminar producto</h3>
                  <p className="vmx-modal-subtitle">
                    Esta acción no se puede deshacer.
                  </p>
                </div>
              </div>

              <div className="vmx-modal-body">
                ¿Seguro que deseas eliminar <strong>{selected?.descripcion}</strong>?
              </div>

              <div className="vmx-modal-footer">
                <button className="vmx-btn" onClick={() => setShowDel(false)}>
                  Cancelar
                </button>
                <button className="vmx-btn vmx-btn-primary" onClick={confirmarDelete}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventario;
