import { useState } from "react";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/adminVentanas.css";

export default function AdminVentanas() {
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");

  const [usaX, setUsaX] = useState(false);
  const [usaY, setUsaY] = useState(false);
  const [usaZ, setUsaZ] = useState(false);

  const [materiales, setMateriales] = useState([]);

  const agregarMaterial = () => {
    setMateriales([
      ...materiales,
      { nombre: "", formula: "", cantidad: 1, precio: 0 }
    ]);
  };

  const actualizarMaterial = (i, campo, valor) => {
    const copia = [...materiales];
    copia[i][campo] = valor;
    setMateriales(copia);
  };

  const eliminarMaterial = (i) => {
    setMateriales(materiales.filter((_, index) => index !== i));
  };

  const guardarVentana = async () => {
    if (!nombre || materiales.length === 0) {
      alert("Completa el nombre y agrega materiales");
      return;
    }

    await addDoc(collection(db, "tiposVentanas"), {
      nombre,
      descripcion,
      usaX,
      usaY,
      usaZ,
      materiales,
      createdAt: Timestamp.now()
    });

    alert("Ventana guardada correctamente ✅");

    setNombre("");
    setDescripcion("");
    setMateriales([]);
    setUsaX(false);
    setUsaY(false);
    setUsaZ(false);
  };

  return (
    <div className="container my-4 admin-ventanas">

      <div className="card shadow">
        <div className="card-header bg-dark text-white">
          <h4 className="mb-0">Administrador de Tipos de Ventanas</h4>
        </div>

        <div className="card-body">

          {/* DATOS GENERALES */}
          <div className="row mb-3">
            <div className="col-md-6">
              <label className="form-label">Nombre de la ventana</label>
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

          {/* VARIABLES */}
          <div className="mb-3">
            <label className="form-label fw-bold">Variables usadas</label>
            <div className="d-flex gap-4">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={usaX} onChange={() => setUsaX(!usaX)} />
                <label className="form-check-label">X</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={usaY} onChange={() => setUsaY(!usaY)} />
                <label className="form-check-label">Y</label>
              </div>
              <div className="form-check">
                <input className="form-check-input" type="checkbox" checked={usaZ} onChange={() => setUsaZ(!usaZ)} />
                <label className="form-check-label">Z</label>
              </div>
            </div>
          </div>

          {/* MATERIALES */}
          <hr />
          <h5>Materiales</h5>

          {materiales.map((m, i) => (
            <div key={i} className="row g-2 align-items-end mb-2 material-row">
              <div className="col-md-3">
                <input
                  className="form-control"
                  placeholder="Material"
                  value={m.nombre}
                  onChange={e => actualizarMaterial(i, "nombre", e.target.value)}
                />
              </div>

              <div className="col-md-3">
                <input
                  className="form-control"
                  placeholder="Fórmula (ej: alto - y)"
                  value={m.formula}
                  onChange={e => actualizarMaterial(i, "formula", e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Cant."
                  value={m.cantidad}
                  onChange={e => actualizarMaterial(i, "cantidad", +e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <input
                  type="number"
                  className="form-control"
                  placeholder="Precio"
                  value={m.precio}
                  onChange={e => actualizarMaterial(i, "precio", +e.target.value)}
                />
              </div>

              <div className="col-md-2">
                <button
                  className="btn btn-danger w-100"
                  onClick={() => eliminarMaterial(i)}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}

          <button className="btn btn-outline-primary mt-2" onClick={agregarMaterial}>
            ➕ Agregar material
          </button>

        </div>

        <div className="card-footer text-end">
          <button className="btn btn-success" onClick={guardarVentana}>
            💾 Guardar ventana
          </button>
        </div>
      </div>
    </div>
  );
}
