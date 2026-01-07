import React, { useEffect } from "react";

const ModalEdicionMaterial = ({
  showEditModal,
  setShowEditModal,
  materialEditado,
  handleInputChange,
  handleEditMaterial,
}) => {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowEditModal(false);
    };
    if (showEditModal) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showEditModal, setShowEditModal]);

  if (!showEditModal || !materialEditado) return null;

  const close = () => setShowEditModal(false);

  const onSubmit = (e) => {
    e.preventDefault();
    handleEditMaterial();
  };

  return (
    <div className="vmx-modal-overlay" onClick={close}>
      <div className="vmx-modal" onClick={(e) => e.stopPropagation()}>
        <div
          className="vmx-modal-header"
          style={{ padding: 18, borderBottom: "1px solid rgba(15,23,42,0.06)" }}
        >
          <div
            className="vmx-modal-badge"
            style={{
              width: 44,
              height: 44,
              borderRadius: 999,
              background:
                "linear-gradient(135deg, var(--color-primary), var(--color-accent))",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            ✎
          </div>

          <div>
            <h3 style={{ margin: 0, fontWeight: 800 }}>Editar material</h3>
            <p
              style={{
                margin: "4px 0 0",
                color: "var(--color-text-muted)",
                fontSize: "0.9rem",
              }}
            >
              Ajusta stock, precios y estado.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div style={{ padding: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  Descripción
                </label>
                <input
                  name="descripcion"
                  value={materialEditado.descripcion || ""}
                  onChange={handleInputChange}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  Activo
                </label>
                <select
                  name="activo"
                  value={String(materialEditado.activo ?? true)}
                  onChange={(e) =>
                    handleInputChange({
                      target: { name: "activo", value: e.target.value === "true" },
                    })
                  }
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                    background: "#fff",
                  }}
                >
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  Stock total
                </label>
                <input
                  type="number"
                  name="stock_total"
                  min="0"
                  step="0.01"
                  value={materialEditado.stock_total ?? 0}
                  onChange={handleInputChange}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  Vendidos
                </label>
                <input
                  type="number"
                  name="vendidos"
                  min="0"
                  step="0.01"
                  value={materialEditado.vendidos ?? 0}
                  onChange={handleInputChange}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  Precio compra
                </label>
                <input
                  type="number"
                  name="precio_compra"
                  min="0"
                  step="0.01"
                  value={materialEditado.precio_compra ?? 0}
                  onChange={handleInputChange}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ color: "var(--color-text-muted)", fontSize: "0.85rem" }}>
                  Precio venta
                </label>
                <input
                  type="number"
                  name="precio_venta"
                  min="0"
                  step="0.01"
                  value={materialEditado.precio_venta ?? 0}
                  onChange={handleInputChange}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(15,23,42,0.12)",
                  }}
                />
              </div>
            </div>

            <style>{`
              @media (max-width: 720px) {
                form > div > div { grid-template-columns: 1fr !important; }
              }
            `}</style>
          </div>

          <div
            style={{
              padding: "0 18px 18px",
              display: "flex",
              justifyContent: "flex-end",
              gap: 10,
            }}
          >
            <button
              type="button"
              className="vmx-btn"
              onClick={close}
              style={{
                borderRadius: 999,
                padding: "10px 16px",
                border: "1px solid rgba(15,23,42,0.12)",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancelar
            </button>

            <button type="submit" className="btn-primary-vmx">
              Guardar cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEdicionMaterial;
