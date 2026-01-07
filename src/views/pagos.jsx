// src/views/pagos.jsx
import React, { useEffect, useMemo, useState } from "react";

import {
  escucharEmpleados,
  escucharPagosPorPeriodo,
  marcarComoPagado,
  borrarPago,
} from "../components/pagos/pagosService";

import "../styles/pagos.css";

function periodoActual() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`; // input type="month" usa YYYY-MM
}

function money(n) {
  const v = Number(n || 0);
  return `C$${v.toLocaleString("es-NI", { maximumFractionDigits: 0 })}`;
}

function formatFecha(ts) {
  if (!ts) return "-";
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return Number.isNaN(d.getTime()) ? "-" : d.toISOString().slice(0, 10);
}

export default function Pagos() {
  const [periodo, setPeriodo] = useState(periodoActual());
  const [empleados, setEmpleados] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubEmp = escucharEmpleados(setEmpleados);
    return () => unsubEmp && unsubEmp();
  }, []);

  useEffect(() => {
    const unsubPagos = escucharPagosPorPeriodo(periodo, setPagos);
    return () => unsubPagos && unsubPagos();
  }, [periodo]);

  const pagosMap = useMemo(() => {
    const m = {};
    for (const p of pagos) {
      if (p?.empleadoId) m[p.empleadoId] = p;
    }
    return m;
  }, [pagos]);

  const listado = useMemo(() => {
    return empleados.map((e) => {
      const nombre = e.nombre || e.Nombre || "Sin nombre";
      const puesto = e.puesto || e.Puesto || "-";
      const salario = Number(e.salario ?? e.Salario ?? 0);
      const pago = pagosMap[e.id] || null;

      return {
        id: e.id,
        nombre,
        puesto,
        salario,
        pago,
        estado: pago ? "Pagado" : "Pendiente",
      };
    });
  }, [empleados, pagosMap]);

  const resumen = useMemo(() => {
    const totalNomina = listado.reduce((acc, x) => acc + (Number(x.salario) || 0), 0);
    const pagados = listado.filter((x) => x.estado === "Pagado").length;
    const pendientes = listado.length - pagados;
    return { totalNomina, pagados, pendientes };
  }, [listado]);

  async function onPagar(emp) {
    setError("");
    setBusyId(emp.id);
    try {
      await marcarComoPagado({
        empleadoId: emp.id,
        periodo,
        monto: emp.salario,
      });
    } catch (e) {
      console.error(e);
      setError("No se pudo guardar el pago. Revisa sesión y reglas.");
    } finally {
      setBusyId("");
    }
  }

  async function onDeshacer(emp) {
    setError("");
    setBusyId(emp.id);
    try {
      await borrarPago({ empleadoId: emp.id, periodo });
    } catch (e) {
      console.error(e);
      setError("No se pudo borrar el pago. Revisa sesión y reglas.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="pg-page">
      <div className="pg-head">
        <div>
          <h1 className="pg-title">Pagos de Empleados</h1>
          <p className="pg-sub">Control mensual, pagado o pendiente</p>
        </div>

        <div className="pg-tools">
          <div className="pg-period">
            <label>Periodo</label>
            <input
              type="month"
              value={periodo}
              onChange={(e) => setPeriodo(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="pg-cards">
        <div className="pg-card blue">
          <div className="k">Total Nómina</div>
          <div className="v">{money(resumen.totalNomina)}</div>
        </div>

        <div className="pg-card green">
          <div className="k">Pagos Realizados</div>
          <div className="v">{resumen.pagados}</div>
        </div>

        <div className="pg-card red">
          <div className="k">Pagos Pendientes</div>
          <div className="v">{resumen.pendientes}</div>
        </div>
      </div>

      {error && <div className="pg-error">{error}</div>}

      <div className="pg-tablebox">
        <div className="pg-tabletitle">Listado</div>

        <div className="pg-tablewrap">
          <table className="pg-table">
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Puesto</th>
                <th>Salario</th>
                <th>Fecha</th>
                <th>Estado</th>
                <th className="act">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {listado.map((emp) => (
                <tr key={emp.id}>
                  <td className="strong">{emp.nombre}</td>
                  <td className="muted">{emp.puesto}</td>
                  <td>{money(emp.salario)}</td>
                  <td className="muted">{formatFecha(emp.pago?.fechaPago)}</td>
                  <td>
                    <span className={emp.estado === "Pagado" ? "badge ok" : "badge pend"}>
                      {emp.estado}
                    </span>
                  </td>
                  <td className="act">
                    {emp.estado === "Pendiente" ? (
                      <button
                        className="btn pay"
                        disabled={busyId === emp.id}
                        onClick={() => onPagar(emp)}
                        type="button"
                      >
                        {busyId === emp.id ? "Guardando..." : "Pagar"}
                      </button>
                    ) : (
                      <button
                        className="btn undo"
                        disabled={busyId === emp.id}
                        onClick={() => onDeshacer(emp)}
                        type="button"
                      >
                        {busyId === emp.id ? "Quitando..." : "Deshacer"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}

              {listado.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty">
                    No hay empleados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
