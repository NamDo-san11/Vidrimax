// src/views/inventario.jsx
import React, { useEffect, useState, useMemo } from "react";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "../styles/empleados.css";

const ITEMS_PER_PAGE = 8;

const Inventario = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailItem, setDetailItem] = useState(null); // modal detalle

  const [nombre, setNombre] = useState("");
  const [categoria, setCategoria] = useState("");
  const [stock_total, setStock_total] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [precio_compra, setPrecio_compra] = useState("");
  const [precio_venta, setPrecio_venta] = useState("");
  const [color, setColor] = useState("");

  const [currentPage, setCurrentPage] = useState(1);

  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const q = query(collection(db, "inventario"), orderBy("creadoEn", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setItems(data);
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar inventario.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setNombre("");
    setCategoria("");
    setStock_total("");
    setDescripcion("");
    setPrecio_compra("");
    setPrecio_venta("");
    setColor("");
  };

  const abrirNuevo = () => {
    resetForm();
    setFormOpen(true);
    setError("");
  };

  const abrirEditar = (item) => {
    setEditId(item.id);
    setNombre(item.nombre || "");
    setCategoria(item.categoria || "");
    setStock_total(String(item.stock_total ?? ""));
    setDescripcion(item.descripcion || "");
    setPrecio_compra(String(item.precio_compra ?? ""));
    setPrecio_venta(String(item.precio_venta ?? ""));
    setColor(item.color || "");
    setFormOpen(true);
    setError("");
  };

  const abrirDetalle = (item) => {
    setDetailItem(item);
  };

  const validar = () => {
    if (!nombre.trim()) return "Escribe el nombre del artículo.";
    if (!categoria.trim()) return "Escribe la categoría.";
    if (!Number.isFinite(Number(stock_total)) || Number(stock_total) < 0) return "Stock inválido.";
    return "";
  };

  const agregarStock = async (item) => {
  const cantidad = prompt(`Ingrese la cantidad a agregar a ${item.nombre}:`, "0");
  if (!cantidad) return;
  const cantNum = Number(cantidad);
  if (!Number.isFinite(cantNum) || cantNum <= 0) {
    alert("Cantidad inválida.");
    return;
  }

  try {
    const ref = doc(db, "inventario", item.id);
    await updateDoc(ref, {
      stock_total: (Number(item.stock_total) + cantNum),
      actualizadoEn: serverTimestamp()
    });
    await cargar(); // recarga los datos
  } catch (e) {
    console.error(e);
    alert("No se pudo actualizar el stock.");
  }
  };


  const guardar = async (e) => {
    e.preventDefault();
    const msg = validar();
    if (msg) { setError(msg); return; }
    setSaving(true);
    setError("");
    try {
      const st = Number(stock_total);
      const pc = Number(precio_compra);
      const pv = Number(precio_venta);
      if (!editId) {
        await addDoc(collection(db, "inventario"), {
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          stock_total: st,
          descripcion: descripcion.trim(),
          precio_compra: pc,
          precio_venta: pv,
          color: color.trim(),
          creadoEn: serverTimestamp(),
          actualizadoEn: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "inventario", editId), {
          nombre: nombre.trim(),
          categoria: categoria.trim(),
          stock_total: st,
          descripcion: descripcion.trim(),
          precio_compra: pc,
          precio_venta: pv,
          color: color.trim(),
          actualizadoEn: serverTimestamp(),
        });
      }
      setFormOpen(false);
      resetForm();
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar.");
    } finally { setSaving(false); }
  };

  const eliminar = async (item) => {
    const ok = window.confirm(`Eliminar ${item.nombre}?`);
    if (!ok) return;
    setSaving(true);
    setError("");
    try { await deleteDoc(doc(db, "inventario", item.id)); await cargar(); } 
    catch (e) { console.error(e); setError("No se pudo eliminar."); } 
    finally { setSaving(false); }
  };

  const totalItems = useMemo(() => items.length, [items]);
  const totalStock = useMemo(() => items.reduce((acc,i)=>acc + Number(i.stock_total||0),0), [items]);

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);
  const paginatedItems = items.slice((currentPage-1)*ITEMS_PER_PAGE, currentPage*ITEMS_PER_PAGE);

  return (
    <div className="emp-page">
      <div className="emp-header">
        <div>
          <h1 className="emp-title">Inventario</h1>
          <p className="emp-subtitle">Agrega, edita y elimina artículos</p>
        </div>
        <button className="emp-primary" onClick={abrirNuevo} disabled={saving}>
          + Nuevo
        </button>
      </div>

      {error && <div className="emp-error">{error}</div>}

      <div className="emp-kpis">
        <div className="emp-kpi emp-kpi-blue">
          <div className="emp-kpi-title">Total Artículos</div>
          <div className="emp-kpi-value">{totalItems}</div>
        </div>
        <div className="emp-kpi emp-kpi-green">
          <div className="emp-kpi-title">Stock Total</div>
          <div className="emp-kpi-value">{totalStock}</div>
        </div>
      </div>

      <div className="emp-card">
        <div className="emp-card-title">Listado</div>
        {loading ? (
          <div className="emp-muted">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="emp-muted">No hay artículos aún.</div>
        ) : (
          <div className="emp-table">
            <div className="emp-thead">
              <div>Nombre</div>
              <div>Categoría</div>
              <div>Stock</div>
              <div>Detalle</div>
            </div>
            {paginatedItems.map(item => (
              <div className={`emp-tr`} key={item.id}>
                <div className="emp-td emp-name">{item.nombre}</div>
                <div className="emp-td emp-muted2">{item.categoria}</div>
                <div className="emp-td">{item.stock_total}</div>
                <div className="emp-td emp-actions">
                  <button className="emp-btn" onClick={()=>abrirDetalle(item)}>Ver</button>
                  <button className="emp-primary" onClick={() => agregarStock(item)}>+ Stock</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages>1 && (
          <div className="emp-form-actions" style={{justifyContent:"center", marginTop:"12px"}}>
            <button onClick={()=>setCurrentPage(p=>Math.max(p-1,1))} disabled={currentPage===1} className="emp-btn">Anterior</button>
            <span style={{padding:"0 12px"}}>{currentPage} / {totalPages}</span>
            <button onClick={()=>setCurrentPage(p=>Math.min(p+1,totalPages))} disabled={currentPage===totalPages} className="emp-btn">Siguiente</button>
          </div>
        )}
      </div>

      {/* Modal Detalle */}
      {detailItem && (
        <div className="emp-modal" onClick={()=>setDetailItem(null)}>
          <div className="emp-modal-card" onClick={e=>e.stopPropagation()}>
            <div className="emp-modal-title">Detalle: {detailItem.nombre}</div>
            <p><b>Categoría:</b> {detailItem.categoria}</p>
            <p><b>Descripción:</b> {detailItem.descripcion}</p>
            <p><b>Color:</b> {detailItem.color}</p>
            <p><b>Stock:</b> {detailItem.stock_total}</p>
            <p><b>Precio Compra:</b> {detailItem.precio_compra}</p>
            <p><b>Precio Venta:</b> {detailItem.precio_venta}</p>

            <div className="emp-form-actions" style={{marginTop:"12px"}}>
              <button className="emp-btn" onClick={()=>{abrirEditar(detailItem); setDetailItem(null)}}>Editar</button>
              <button className="emp-btn emp-danger" onClick={()=>{eliminar(detailItem); setDetailItem(null)}}>Eliminar</button>
              <button className="emp-btn" onClick={()=>setDetailItem(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulario */}
      {formOpen && (
        <div className="emp-modal" onClick={()=>{setFormOpen(false); resetForm();}}>
          <div className="emp-modal-card" onClick={e=>e.stopPropagation()}>
            <div className="emp-modal-title">{editId?"Editar artículo":"Nuevo artículo"}</div>
            <form className="emp-form" onSubmit={guardar}>
              <label className="emp-label">Nombre</label>
              <input className="emp-input" value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Ej. Puerta de cobre" />

              <label className="emp-label">Categoría</label>
              <input className="emp-input" value={categoria} onChange={e=>setCategoria(e.target.value)} placeholder="Ej. Puerta" />

              <label className="emp-label">Stock Total</label>
              <input className="emp-input" type="number" value={stock_total} onChange={e=>setStock_total(e.target.value)} placeholder="Ej. 400" />

              <label className="emp-label">Precio Compra</label>
              <input className="emp-input" type="number" value={precio_compra} onChange={e=>setPrecio_compra(e.target.value)} placeholder="Ej. 6000" />

              <label className="emp-label">Precio Venta</label>
              <input className="emp-input" type="number" value={precio_venta} onChange={e=>setPrecio_venta(e.target.value)} placeholder="Ej. 20000" />

              <label className="emp-label">Color</label>
              <input className="emp-input" value={color} onChange={e=>setColor(e.target.value)} placeholder="Ej. Cobre" />

              <label className="emp-label">Descripción</label>
              <input className="emp-input" value={descripcion} onChange={e=>setDescripcion(e.target.value)} placeholder="Ej. Puerta de cobre" />

              <div className="emp-form-actions">
                <button type="button" className="emp-btn" onClick={()=>{setFormOpen(false); resetForm();}}>Cancelar</button>
                <button type="submit" className="emp-primary" disabled={saving}>{saving?"Guardando...":"Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventario;
  