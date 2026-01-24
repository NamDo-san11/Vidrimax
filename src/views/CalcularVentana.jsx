import { useEffect, useMemo, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import { evaluarFormula } from "../components/utils/formulas";
import "bootstrap/dist/css/bootstrap.min.css";

export default function CalcularVentana() {
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [tipoId, setTipoId] = useState("");
  const tipoSeleccionado = useMemo(
    () => tipos.find(t => t.id === tipoId),
    [tipos, tipoId]
  );

  const [ancho, setAncho] = useState("");
  const [alto, setAlto] = useState("");

  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("0");

  // ✅ NUEVO: cantidad de ventanas
  const [cantidadVentanas, setCantidadVentanas] = useState(1);

  // ✅ NUEVO: tasa USD
  const TASA_USD = 36.78; // 1 USD = 36.78 C$

  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      const qs = await getDocs(collection(db, "tiposVentanas"));
      const data = qs.docs.map(d => ({ id: d.id, ...d.data() }));
      setTipos(data);
      setCargando(false);
      if (data.length) setTipoId(data[0].id);
    };
    cargar();
  }, []);

  // Reset cuando cambias tipo
  useEffect(() => {
    setResultado(null);
    setError("");
    setX("0");
    setY("0");
    setZ("0");
    setCantidadVentanas(1);
  }, [tipoId]);

  const calcular = () => {
    setError("");
    setResultado(null);

    if (!tipoSeleccionado) return setError("Selecciona un tipo de ventana.");
    if (!ancho || !alto) return setError("Ingresa ancho y alto.");
    if (Number(ancho) <= 0 || Number(alto) <= 0) return setError("Medidas inválidas.");

    const cantVent = Math.max(1, Number(cantidadVentanas || 1));

    const contexto = {
      ancho: Number(ancho),
      alto: Number(alto),
      x: tipoSeleccionado.usaX ? Number(x) : 0,
      y: tipoSeleccionado.usaY ? Number(y) : 0,
      z: tipoSeleccionado.usaZ ? Number(z) : 0
    };

    try {
      const detalle = (tipoSeleccionado.materiales || []).map(mat => {
        const longitudNeta = evaluarFormula(mat.formula, contexto);

        const cantidad = Number(mat.cantidad ?? 1);
        const precio = Number(mat.precio ?? 0);

        // ✅ como Excel: longitud total = longitud neta * cantidad
        const longitudTotal = longitudNeta * cantidad;

        // ✅ subtotal por 1 ventana
        const subtotalBase = longitudTotal * precio;

        // ✅ subtotal por N ventanas
        const subtotalFinal = subtotalBase * cantVent;

        return {
          material: mat.nombre,
          formula: mat.formula,
          longitudNeta,
          cantidad,
          longitudTotal,
          precio,
          subtotalBase,
          subtotalFinal
        };
      });

      const totalBase = detalle.reduce((acc, it) => acc + it.subtotalBase, 0);
      const totalFinal = detalle.reduce((acc, it) => acc + it.subtotalFinal, 0);
      const totalUSD = totalFinal / TASA_USD;

      setResultado({
        detalle,
        cantVent,
        totalBase,
        totalFinal,
        totalUSD
      });
    } catch (e) {
      setError(e.message || "Error al calcular");
    }
  };

  const limpiar = () => {
    setAncho("");
    setAlto("");
    setX("0");
    setY("0");
    setZ("0");
    setCantidadVentanas(1);
    setResultado(null);
    setError("");
  };

  return (
    <div className="container my-4">
      <div className="card shadow border-0" style={{ borderRadius: 12 }}>
        <div className="card-header bg-dark text-white" style={{ borderRadius: "12px 12px 0 0" }}>
          <h4 className="mb-0">Calcular Presupuesto</h4>
        </div>

        <div className="card-body">
          {cargando ? (
            <div className="text-center py-4">Cargando tipos de ventanas…</div>
          ) : (
            <>
              {/* Selector + medidas */}
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Tipo de ventana</label>
                  <select
                    className="form-select"
                    value={tipoId}
                    onChange={e => setTipoId(e.target.value)}
                  >
                    {tipos.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>

                  {tipoSeleccionado?.descripcion ? (
                    <div className="text-muted mt-1">{tipoSeleccionado.descripcion}</div>
                  ) : null}
                </div>

                <div className="col-md-2">
                  <label className="form-label fw-bold">Alto (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="form-control"
                    value={alto}
                    onChange={e => setAlto(e.target.value)}
                    placeholder="Ej: 1.660"
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label fw-bold">Ancho (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="form-control"
                    value={ancho}
                    onChange={e => setAncho(e.target.value)}
                    placeholder="Ej: 0.854"
                  />
                </div>

                {/* ✅ NUEVO: Cantidad ventanas */}
                <div className="col-md-2">
                  <label className="form-label fw-bold">Cant. ventanas</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    className="form-control"
                    value={cantidadVentanas}
                    onChange={e => setCantidadVentanas(Math.max(1, Number(e.target.value)))}
                    placeholder="Ej: 2"
                  />
                </div>
              </div>

              {/* Variables X Y Z dinámicas */}
              <div className="mt-4">
                <div className="d-flex align-items-center justify-content-between">
                  <h6 className="mb-2">Variables</h6>
                  <div className="text-muted" style={{ fontSize: 13 }}>
                    Se muestran solo las que usa la ventana
                  </div>
                </div>

                <div className="row g-3">
                  {tipoSeleccionado?.usaX ? (
                    <div className="col-md-4">
                      <label className="form-label">X</label>
                      <input
                        type="number"
                        step="0.001"
                        className="form-control"
                        value={x}
                        onChange={e => setX(e.target.value)}
                        placeholder="Ej: 0.062"
                      />
                    </div>
                  ) : null}

                  {tipoSeleccionado?.usaY ? (
                    <div className="col-md-4">
                      <label className="form-label">Y</label>
                      <input
                        type="number"
                        step="0.001"
                        className="form-control"
                        value={y}
                        onChange={e => setY(e.target.value)}
                        placeholder="Ej: 0.228"
                      />
                    </div>
                  ) : null}

                  {tipoSeleccionado?.usaZ ? (
                    <div className="col-md-4">
                      <label className="form-label">Z</label>
                      <input
                        type="number"
                        step="0.001"
                        className="form-control"
                        value={z}
                        onChange={e => setZ(e.target.value)}
                        placeholder="Ej: 0.050"
                      />
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Botones */}
              <div className="mt-4 d-flex gap-2">
                <button className="btn btn-outline-success" onClick={calcular}>
                  Calcular
                </button>
                <button className="btn btn-outline-secondary" onClick={limpiar}>
                  Limpiar
                </button>
              </div>

              {/* Error */}
              {error ? (
                <div className="alert alert-danger mt-3 mb-0">{error}</div>
              ) : null}

              {/* Resultado */}
              {resultado ? (
                <div className="mt-4">
                  <div className="table-responsive">
                    <table className="table table-bordered table-hover align-middle">
                      <thead className="table-dark">
                        <tr>
                          <th>Material</th>
                          <th>Fórmula</th>
                          <th>Long. neta</th>
                          <th>Cant.</th>
                          <th>Long. total</th>
                          <th>Precio</th>
                          <th>Subt. (1)</th>
                          <th>Subt. (x{resultado.cantVent})</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultado.detalle.map((it, idx) => (
                          <tr key={idx}>
                            <td className="fw-semibold">{it.material}</td>
                            <td><code>{it.formula}</code></td>
                            <td>{it.longitudNeta.toFixed(3)}</td>
                            <td>{it.cantidad}</td>
                            <td className="fw-bold">{it.longitudTotal.toFixed(3)}</td>
                            <td>{it.precio.toFixed(2)}</td>
                            <td className="fw-bold">{it.subtotalBase.toFixed(2)}</td>
                            <td className="fw-bold">{it.subtotalFinal.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="d-flex justify-content-end">
                    <div className="p-3 bg-light border rounded" style={{ minWidth: 340 }}>
                      <div className="d-flex justify-content-between">
                        <span className="fw-bold">Total (1 ventana)</span>
                        <span className="fw-bold">{resultado.totalBase.toFixed(2)} C$</span>
                      </div>

                      <div className="d-flex justify-content-between">
                        <span className="fw-bold">Cantidad ventanas</span>
                        <span className="fw-bold">{resultado.cantVent}</span>
                      </div>

                      <hr />

                      <div className="d-flex justify-content-between">
                        <span className="fw-bold fs-5">TOTAL (C$)</span>
                        <span className="fw-bold fs-5">{resultado.totalFinal.toFixed(2)} C$</span>
                      </div>

                      <div className="d-flex justify-content-between mt-1">
                        <span className="fw-bold">TOTAL (USD)</span>
                        <span className="fw-bold">${resultado.totalUSD.toFixed(2)}</span>
                      </div>

                      <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                        Tasa: 1 USD = {TASA_USD} C$
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
