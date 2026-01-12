// src/views/empleados.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import "../styles/empleados.css";

const Empleados = () => {
  const auth = getAuth();

  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editId, setEditId] = useState(null);

  const [nombre, setNombre] = useState("");
  const [puesto, setPuesto] = useState("");
  const [salario, setSalario] = useState("");

  // Modal usuario
  const [usuarioModalOpen, setUsuarioModalOpen] = useState(false);
  const [usuarioEmail, setUsuarioEmail] = useState("");
  const [usuarioPassword, setUsuarioPassword] = useState("");
  const [usuarioRol, setUsuarioRol] = useState("empleado");
  const [empleadoUid, setEmpleadoUid] = useState(null);

  // Cargar empleados
  const cargar = async () => {
    setLoading(true);
    setError("");
    try {
      const qEmp = query(collection(db, "empleados"), orderBy("createdAt", "desc"));
      const snap = await getDocs(qEmp);
      setEmpleados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      setError("No se pudo cargar empleados.");
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
    setPuesto("");
    setSalario("");
  };

  const abrirNuevo = () => {
    resetForm();
    setFormOpen(true);
    setError("");
  };

  const abrirEditar = (emp) => {
    setEditId(emp.id);
    setNombre(emp.nombre || "");
    setPuesto(emp.puesto || "");
    setSalario(String(emp.salario ?? ""));
    setFormOpen(true);
    setError("");
  };

  const validar = () => {
    if (!nombre.trim()) return "Escribe el nombre.";
    if (!puesto.trim()) return "Escribe el puesto.";
    const s = Number(salario);
    if (!Number.isFinite(s) || s <= 0) return "Salario inválido.";
    return "";
  };

  // Guardar empleado
  const guardar = async (e) => {
    e.preventDefault();
    const msg = validar();
    if (msg) {
      setError(msg);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const s = Number(salario);
      let newEmpleadoId = editId;

      if (!editId) {
        const docRef = await addDoc(collection(db, "empleados"), {
          nombre: nombre.trim(),
          puesto: puesto.trim(),
          salario: s,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        newEmpleadoId = docRef.id;

        // Abrir modal usuario
        setEmpleadoUid(newEmpleadoId);
        setUsuarioEmail("");
        setUsuarioPassword("");
        setUsuarioRol("empleado");
        setUsuarioModalOpen(true);
      } else {
        await updateDoc(doc(db, "empleados", editId), {
          nombre: nombre.trim(),
          puesto: puesto.trim(),
          salario: s,
          updatedAt: serverTimestamp(),
        });
      }

      setFormOpen(false);
      resetForm();
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  };

  const eliminar = async (emp) => {
    const ok = window.confirm(`Eliminar a ${emp.nombre}?`);
    if (!ok) return;

    setSaving(true);
    setError("");
    try {
      await deleteDoc(doc(db, "empleados", emp.id));
      await cargar();
    } catch (e) {
      console.error(e);
      setError("No se pudo eliminar.");
    } finally {
      setSaving(false);
    }
  };

  // Guardar usuario con UID = ID del empleado
  const guardarUsuario = async (e) => {
    e.preventDefault();
    if (!usuarioEmail || !usuarioPassword || !empleadoUid) {
      alert("Completa todos los datos del usuario");
      return;
    }
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        usuarioEmail,
        usuarioPassword
      );
      const uid = userCredential.user.uid;

      await setDoc(doc(db, "users", uid), {
        email: usuarioEmail,
        role: usuarioRol,
        empleadoId: empleadoUid,
        createdAt: serverTimestamp(),
      });

      alert("Usuario creado correctamente");
      setUsuarioModalOpen(false);
    } catch (e) {
      console.error(e);
      alert("Error al crear usuario: " + e.message);
    }
  };

  const moneda = (n) => {
    try {
      return new Intl.NumberFormat("es-NI", {
        style: "currency",
        currency: "NIO",
        maximumFractionDigits: 0,
      }).format(Number(n || 0));
    } catch {
      return `$${n}`;
    }
  };

  const totalNomina = useMemo(() => {
    return empleados.reduce((acc, e) => acc + Number(e.salario || 0), 0);
  }, [empleados]);

  return (
    <div className="emp-page">
      {/* Header */}
      <div className="emp-header">
        <div>
          <h1 className="emp-title">Empleados</h1>
          <p className="emp-subtitle">Agrega, edita y elimina empleados</p>
        </div>
        <button className="emp-primary" onClick={abrirNuevo} disabled={saving}>
          + Nuevo
        </button>
      </div>

      {error && <div className="emp-error">{error}</div>}

      {/* KPIs */}
      <div className="emp-kpis">
        <div className="emp-kpi emp-kpi-blue">
          <div className="emp-kpi-title">Total Nómina</div>
          <div className="emp-kpi-value">{moneda(totalNomina)}</div>
        </div>
        <div className="emp-kpi emp-kpi-green">
          <div className="emp-kpi-title">Empleados</div>
          <div className="emp-kpi-value">{empleados.length}</div>
        </div>
      </div>

      {/* Lista de empleados */}
      <div className="emp-card">
        <div className="emp-card-title">Listado</div>
        {loading ? (
          <div className="emp-muted">Cargando...</div>
        ) : empleados.length === 0 ? (
          <div className="emp-muted">No tienes empleados aún.</div>
        ) : (
          <div className="emp-table">
            <div className="emp-thead">
              <div>Empleado</div>
              <div>Puesto</div>
              <div>Salario</div>
              <div>Acciones</div>
            </div>

            {empleados.map((e) => (
              <div className="emp-tr" key={e.id}>
                <div className="emp-td emp-name">{e.nombre}</div>
                <div className="emp-td emp-muted2">{e.puesto}</div>
                <div className="emp-td">{moneda(e.salario)}</div>
                <div className="emp-td emp-actions">
                  <button className="emp-btn" onClick={() => abrirEditar(e)} disabled={saving}>
                    Editar
                  </button>
                  <button className="emp-btn emp-danger" onClick={() => eliminar(e)} disabled={saving}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal empleado */}
      {formOpen && (
        <div className="emp-modal" onClick={() => { setFormOpen(false); resetForm(); }}>
          <div className="emp-modal-card" onClick={(ev) => ev.stopPropagation()}>
            <div className="emp-modal-title">{editId ? "Editar empleado" : "Nuevo empleado"}</div>
            <form onSubmit={guardar} className="emp-form">
              <label className="emp-label">Nombre</label>
              <input className="emp-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Carlos Mendoza" />
              <label className="emp-label">Puesto</label>
              <input className="emp-input" value={puesto} onChange={(e) => setPuesto(e.target.value)} placeholder="Ej. Instalador Senior" />
              <label className="emp-label">Salario</label>
              <input className="emp-input" value={salario} onChange={(e) => setSalario(e.target.value)} placeholder="Ej. 8500" inputMode="numeric" />
              <div className="emp-form-actions">
                <button type="button" className="emp-btn" onClick={() => { setFormOpen(false); resetForm(); setError(""); }} disabled={saving}>Cancelar</button>
                <button type="submit" className="emp-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal crear usuario */}
      {usuarioModalOpen && (
        <div className="emp-modal" onClick={() => setUsuarioModalOpen(false)}>
          <div className="emp-modal-card" onClick={(ev) => ev.stopPropagation()}>
            <div className="emp-modal-title">Crear usuario para empleado</div>
            <form onSubmit={guardarUsuario} className="emp-form">
              <label className="emp-label">Email</label>
              <input className="emp-input" type="email" value={usuarioEmail} onChange={(e) => setUsuarioEmail(e.target.value)} placeholder="email@dominio.com" />
              <label className="emp-label">Contraseña</label>
              <input className="emp-input" type="password" value={usuarioPassword} onChange={(e) => setUsuarioPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
              <label className="emp-label">Rol</label>
              <select className="emp-input" value={usuarioRol} onChange={(e) => setUsuarioRol(e.target.value)}>
                <option value="empleado">Empleado</option>
                <option value="admin">Administrador</option>
              </select>
              <div className="emp-form-actions">
                <button type="button" className="emp-btn" onClick={() => setUsuarioModalOpen(false)}>Cancelar</button>
                <button type="submit" className="emp-primary">Crear Usuario</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Empleados;
