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

  // ===== VALIDACIÓN DE FÓRMULAS =====
  const validarFormula = (formula) => {
    const texto = String(formula || "").trim();

    if (!texto) {
      return { valida: false, mensaje: "La fórmula no puede estar vacía." };
    }

    // caracteres permitidos
    const caracteresPermitidos = /^[0-9a-zA-Z+\-*/().\s]+$/;
    if (!caracteresPermitidos.test(texto)) {
      return {
        valida: false,
        mensaje: "Hay caracteres no permitidos. Usa solo números, alto, ancho, x, y, z, + - * / y paréntesis."
      };
    }

    // palabras permitidas
    const palabras = texto.match(/[a-zA-Z_]+/g) || [];
    const palabrasPermitidas = ["alto", "ancho", "x", "y", "z"];

    for (const palabra of palabras) {
      if (!palabrasPermitidas.includes(palabra)) {
        return {
          valida: false,
          mensaje: `La palabra "${palabra}" no es válida. Usa solo: alto, ancho.`
        };
      }
    }

    // paréntesis balanceados
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

    // operadores repetidos
    if (/[\+\-\*\/]{2,}/.test(texto.replace(/\s+/g, ""))) {
      return {
        valida: false,
        mensaje: "Hay operadores repetidos o mal escritos."
      };
    }

    // no debe terminar en operador
    if (/[\+\-\*\/.]$/.test(texto)) {
      return {
        valida: false,
        mensaje: "La fórmula no puede terminar en operador."
      };
    }

    // no debe empezar con * o / o )
    if (/^[\*\/\)]/.test(texto)) {
      return {
        valida: false,
        mensaje: "La fórmula empieza con un carácter inválido."
      };
    }

    return { valida: true, mensaje: "Fórmula válida." };
  };

  const agregarMaterial = () => {
    setMateriales([
      ...materiales,
      {
        nombre: "",
        formula: "",
        cantidad: 1,
        precio: 0
      }
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
    if (!nombre.trim() || materiales.length === 0) {
      alert("Completa el nombre y agrega materiales");
      return;
    }

    for (let i = 0; i < materiales.length; i++) {
      const m = materiales[i];

      if (!m.nombre.trim()) {
        alert(`El material #${i + 1} no tiene nombre.`);
        return;
      }

      const validacion = validarFormula(m.formula);
      if (!validacion.valida) {
        alert(`Error en la fórmula del material "${m.nombre || `#${i + 1}`}": ${validacion.mensaje}`);
        return;
      }

      if (!m.cantidad || Number(m.cantidad) <= 0) {
        alert(`La cantidad del material "${m.nombre}" debe ser mayor a 0.`);
        return;
      }

      if (Number(m.precio) < 0) {
        alert(`El precio del material "${m.nombre}" no puede ser negativo.`);
        return;
      }
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
            <div className="small text-muted">
              Palabras válidas para fórmulas: <strong>alto</strong>, <strong>ancho</strong>
            </div>
            <div className="small text-muted">
              Ejemplo: <code>((alto + 0.16) + (((ancho / 2) + 0.027) * 2))</code>
            </div>
          </div>

          {/* MATERIALES */}
          <hr />
          <h5>Materiales</h5>

          {materiales.map((m, i) => {
            const validacion = validarFormula(m.formula);
            const mostrarEstado = m.formula.trim().length > 0;

            return (
              <div key={i} className="row g-2 align-items-start mb-3 material-row">
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
                    className={`form-control ${
                      mostrarEstado
                        ? validacion.valida
                          ? "is-valid"
                          : "is-invalid"
                        : ""
                    }`}
                    placeholder="Fórmula (ej: alto - 0.062)"
                    value={m.formula}
                    onChange={e => actualizarMaterial(i, "formula", e.target.value)}
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
                    className="btn btn-outline-danger w-100"
                    onClick={() => eliminarMaterial(i)}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}

          <button className="btn btn-outline-primary mt-2" onClick={agregarMaterial}>
            ➕ Agregar material
          </button>
        </div>

        <div className="card-footer text-end">
          <button className="btn btn-outline-success" onClick={guardarVentana}>
            💾 Guardar ventana
          </button>
        </div>
      </div>
    </div>
  );
}