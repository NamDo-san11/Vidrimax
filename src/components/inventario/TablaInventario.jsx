import React, { useState } from "react";

const stockChipClass = (existencia) => {
  if (existencia <= 0) return "inv-chip out";
  if (existencia <= 10) return "inv-chip low";
  return "inv-chip ok";
};

const TablaInventario = ({ materiales, openEditModal, openDeleteModal, handleVenta }) => {
  const [ventaInput, setVentaInput] = useState({});

  const onVenta = (id) => {
    const qty = Number(ventaInput[id] || 0);
    if (!qty || qty <= 0) return alert("Ingresa una cantidad válida.");
    handleVenta(id, qty);
    setVentaInput((prev) => ({ ...prev, [id]: "" }));
  };

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Stock</th>
            <th>Vendidos</th>
            <th>Existencia</th>
            <th>Compra</th>
            <th>Venta</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {materiales.length === 0 ? (
            <tr>
              <td colSpan="7" style={{ padding: 18, color: "var(--color-text-muted)" }}>
                No hay materiales registrados.
              </td>
            </tr>
          ) : (
            materiales.map((m) => (
              <tr key={m.id}>
                <td style={{ fontWeight: 700 }}>{m.descripcion}</td>
                <td>{Number(m.stock_total || 0).toFixed(2)}</td>
                <td>{Number(m.vendidos || 0).toFixed(2)}</td>

                <td>
                  <span className={stockChipClass(Number(m.existencia || 0))}>
                    {Number(m.existencia || 0).toFixed(2)}
                  </span>
                </td>

                <td>C$ {Number(m.precio_compra || 0).toFixed(2)}</td>
                <td>C$ {Number(m.precio_venta || 0).toFixed(2)}</td>

                <td>
                  <div className="inv-actions-cell">
                    <input
                      style={{
                        width: 90,
                        padding: "10px 12px",
                        borderRadius: 12,
                        border: "1px solid rgba(15,23,42,0.12)",
                      }}
                      placeholder="Vender"
                      inputMode="decimal"
                      value={ventaInput[m.id] ?? ""}
                      onChange={(e) =>
                        setVentaInput((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                    />

                    <button className="inv-icon-btn" title="Venta" onClick={() => onVenta(m.id)}>
                      <i className="bi bi-bag-check" />
                    </button>

                    <button className="inv-icon-btn" title="Editar" onClick={() => openEditModal(m)}>
                      <i className="bi bi-pencil-square" />
                    </button>

                    <button className="inv-icon-btn" title="Eliminar" onClick={() => openDeleteModal(m)}>
                      <i className="bi bi-trash" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TablaInventario;
