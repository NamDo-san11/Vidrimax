import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "bootstrap/dist/css/bootstrap.min.css";

export default function CatalogoVentanas() {
  const [ventanas, setVentanas] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Modal
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  // Form
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [usaX, setUsaX] = useState(false);
  const [usaY, setUsaY] = useState(false);
  const [usaZ, setUsaZ] = useState(false);
  const [materiales, setMateriales] = useState([]);

  // ===== VALIDACIÓN DE FÓRMULAS =====
  const validarFormula = (formula) => {
    const texto = String(formula || "").trim();

    if (!texto) {
      return { valida: false, mensaje: "La fórmula no puede estar vacía." };
    }

    const caracteresPermitidos = /^[0-9a-zA-Z+\-*/().\s]+$/;
    if (!caracteresPermitidos.test(texto)) {
      return {
        valida: false,
        mensaje: "Hay caracteres no permitidos. Usa solo números, alto, ancho, x, y, z, + - * / y paréntesis."
      };
    }

    const palabras = texto.match(/[a-zA-Z_]+/g) || [];
    const palabrasPermitidas = ["alto", "ancho", "x", "y", "z"];

    for (const palabra of palabras) {
      if (!palabrasPermitidas.includes(palabra)) {
        return {
          valida: false,
          mensaje: `La palabra "${palabra}" no es válida. Usa solo: alto, ancho, x, y, z.`
        };
      }
    }

    let balance = 0;
    for (const char of texto) {
      if (char === "(") balance++;
      if (char === ")") balance--;
      if (balance < 0) {
        return {
          valida: false,
          mensaje: "Hay un paréntesis de cierre sin abrir."
        };
      }
    }

    if (balance !== 0) {
      return {
        valida: false,
        mensaje: "Los paréntesis no están balanceados."
      };
    }

    if (/[\+\-\*\/]{2,}/.test(texto.replace(/\s+/g, ""))) {
      return {
        valida: false,
        mensaje: "Hay operadores repetidos o mal escritos."
      };
    }

    if (/[\+\-\*\/.]$/.test(texto)) {
      return {
        valida: false,
        mensaje: "La fórmula no puede terminar en operador."
      };
    }

    if (/^[\*\/\)]/.test(texto)) {
      return {
        valida: false,
        mensaje: "La fórmula empieza con un carácter inválido."
      };
    }

    return { valida: true, mensaje: "Fórmula válida." };
  };

  const cargarVentanas = async () => {
    const qs = await getDocs(collection(db, "tiposVentanas"));
    const data = qs.docs.map(d => ({ id: d.id, ...d.data() }));
    setVentanas(data);
    setCargando(false);
  };

  useEffect(() => {
    cargarVentanas();
  }, []);

  const abrirEditar = (v) => {
    setEditId(v.id);
    setNombre(v.nombre || "");
    setDescripcion(v.descripcion || "");
    setUsaX(!!v.usaX);
    setUsaY(!!v.usaY);
    setUsaZ(!!v.usaZ);
    setMateriales(v.materiales || []);
    setError("");
    setShow(true);
  };

  const cerrarModal = () => {
    setShow(false);
    setEditId(null);
    setError("");
  };

  const actualizarMaterial = (i, campo, valor) => {
    const copia = [...materiales];
    copia[i][campo] = valor;
    setMateriales(copia);
  };

  const agregarMaterial = () => {
    setMateriales([
      ...materiales,
      { nombre: "", formula: "", cantidad: 1, precio: 0 }
    ]);
  };

  const eliminarMaterial = (i) => {
    setMateriales(materiales.filter((_, idx) => idx !== i));
  };

  const guardarCambios = async () => {
    if (!nombre.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }

    if (materiales.length === 0) {
      setError("Debes agregar al menos un material.");
      return;
    }

    for (let i = 0; i < materiales.length; i++) {
      const m = materiales[i];

      if (!m.nombre?.trim()) {
        setError(`El material #${i + 1} no tiene nombre.`);
        return;
      }

      const validacion = validarFormula(m.formula);
      if (!validacion.valida) {
        setError(`Error en la fórmula de "${m.nombre}": ${validacion.mensaje}`);
        return;
      }

      if (!m.cantidad || Number(m.cantidad) <= 0) {
        setError(`La cantidad del material "${m.nombre}" debe ser mayor a 0.`);
        return;
      }

      if (Number(m.precio) < 0) {
        setError(`El precio del material "${m.nombre}" no puede ser negativo.`);
        return;
      }
    }

    try {
      setGuardando(true);
      setError("");

      await updateDoc(doc(db, "tiposVentanas", editId), {
        nombre,
        descripcion,
        usaX,
        usaY,
        usaZ,
        materiales
      });

      await cargarVentanas();
      cerrarModal();
    } catch {
      setError("Error al guardar cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const eliminarVentana = async (id) => {
    if (!confirm("¿Eliminar esta ventana?")) return;
    await deleteDoc(doc(db, "tiposVentanas", id));
    cargarVentanas();
  };

  if (cargando) return <p className="text-center mt-4">Cargando catálogo…</p>;

  return (
    <div className="container my-4">
      <h3 className="mb-3">Catálogo de Ventanas</h3>

      <table className="table table-bordered table-hover align-middle">
        <thead className="table-dark">
          <tr>
            <th>Ventana</th>
            <th>Descripción</th>
            <th>Variables</th>
            <th>Materiales</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ventanas.map(v => (
            <tr key={v.id}>
              <td className="fw-bold">{v.nombre}</td>
              <td>{v.descripcion}</td>
              <td>
                {v.usaX && <span className="badge bg-primary me-1">X</span>}
                {v.usaY && <span className="badge bg-success me-1">Y</span>}
                {v.usaZ && <span className="badge bg-warning text-dark">Z</span>}
              </td>
              <td>
                <details>
                  <summary className="text-primary" style={{ cursor: "pointer" }}>
                    Ver materiales ({v.materiales?.length || 0})
                  </summary>
                  <ul className="mt-2">
                    {(v.materiales || []).map((m, i) => (
                      <li key={i}>
                        <strong>{m.nombre}</strong> → {m.formula}
                      </li>
                    ))}
                  </ul>
                </details>
              </td>
              <td>
                <button
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => abrirEditar(v)}
                >
                  Editar
                </button>
                <button
                  className="btn btn-sm btn-outline-danger"
                  onClick={() => eliminarVentana(v.id)}
                >
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ===== MODAL ===== */}
      {show && (
        <>
          <div
            className="modal-backdrop show"
            style={{ zIndex: 1040 }}
            onClick={cerrarModal}
          />

          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            style={{ zIndex: 1050 }}
            onClick={cerrarModal}
          >
            <div
              className="modal-dialog modal-xl"
              role="document"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content">
                <div className="modal-header bg-dark text-white">
                  <h5 className="modal-title">Editar ventana</h5>
                  <button className="btn-close btn-close-white" onClick={cerrarModal} />
                </div>

                <div className="modal-body">
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nombre</label>
                      <input
                        className="form-control"
                        value={nombre}
                        onChange={e => setNombre(e.target.value)}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">Descripción</label>
                      <input
                        className="form-control"
                        value={descripcion}
                        onChange={e => setDescripcion(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="form-label fw-bold">Variables</label>
                    <div className="d-flex gap-3">
                      <label><input type="checkbox" checked={usaX} onChange={() => setUsaX(!usaX)} /> X</label>
                      <label><input type="checkbox" checked={usaY} onChange={() => setUsaY(!usaY)} /> Y</label>
                      <label><input type="checkbox" checked={usaZ} onChange={() => setUsaZ(!usaZ)} /> Z</label>
                    </div>

                    <div className="small text-muted mt-2">
                      Palabras válidas para fórmulas: <strong>alto</strong>, <strong>ancho</strong>, <strong>x</strong>, <strong>y</strong>, <strong>z</strong>
                    </div>
                  </div>

                  <hr />

                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h5>Materiales</h5>
                    <button className="btn btn-outline-primary" onClick={agregarMaterial}>
                      + Agregar
                    </button>
                  </div>

                  {materiales.map((m, i) => {
                    const validacion = validarFormula(m.formula);
                    const mostrarEstado = m.formula?.trim().length > 0;

                    return (
                      <div key={i} className="row g-2 mb-3 p-2 border rounded bg-light align-items-start">
                        <div className="col-md-3">
                          <input
                            className="form-control"
                            value={m.nombre}
                            onChange={e => actualizarMaterial(i, "nombre", e.target.value)}
                            placeholder="Material"
                          />
                        </div>

                        <div className="col-md-4">
                          <input
                            className={`form-control ${
                              mostrarEstado
                                ? validacion.valida
                                  ? "is-valid"
                                  : "is-invalid"
                                : ""
                            }`}
                            value={m.formula}
                            onChange={e => actualizarMaterial(i, "formula", e.target.value)}
                            placeholder="Fórmula"
                          />

                          {mostrarEstado && (
                            <div
                              className={`mt-1 small ${
                                validacion.valida ? "text-success" : "text-danger"
                              }`}
                            >
                              {validacion.mensaje}
                            </div>
                          )}
                        </div>

                        <div className="col-md-2">
                          <input
                            type="number"
                            className="form-control"
                            value={m.cantidad}
                            onChange={e => actualizarMaterial(i, "cantidad", +e.target.value)}
                            placeholder="Cantidad"
                          />
                        </div>

                        <div className="col-md-2">
                          <input
                            type="number"
                            className="form-control"
                            value={m.precio}
                            onChange={e => actualizarMaterial(i, "precio", +e.target.value)}
                            placeholder="Precio"
                          />
                        </div>

                        <div className="col-md-1">
                          <button
                            className="btn btn-outline-danger w-100"
                            onClick={() => eliminarMaterial(i)}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="modal-footer">
                  <button className="btn btn-outline-secondary" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button
                    className="btn btn-outline-success"
                    onClick={guardarCambios}
                    disabled={guardando}
                  >
                    {guardando ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}