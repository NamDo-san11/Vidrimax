import React, { useEffect } from "react";

const ModalEliminacionMaterial = ({
  showDeleteModal,
  setShowDeleteModal,
  handleDeleteMaterial,
}) => {
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowDeleteModal(false);
    };
    if (showDeleteModal) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showDeleteModal, setShowDeleteModal]);

  if (!showDeleteModal) return null;

  const close = () => setShowDeleteModal(false);

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
                "linear-gradient(135deg, rgba(239,68,68,1), rgba(245,158,11,1))",
              color: "#fff",
              display: "grid",
              placeItems: "center",
              fontWeight: 900,
            }}
          >
            !
          </div>

          <div>
            <h3 style={{ margin: 0, fontWeight: 800 }}>Eliminar material</h3>
            <p
              style={{
                margin: "4px 0 0",
                color: "var(--color-text-muted)",
                fontSize: "0.9rem",
              }}
            >
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>

        <div style={{ padding: 18, color: "var(--color-text-main)" }}>
          ¿Seguro que deseas eliminar este material del inventario?
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

          <button
            type="button"
            onClick={handleDeleteMaterial}
            style={{
              borderRadius: 999,
              padding: "10px 16px",
              border: "none",
              cursor: "pointer",
              color: "#fff",
              background:
                "linear-gradient(135deg, rgba(239,68,68,1), rgba(153,27,27,1))",
              boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
            }}
          >
            Eliminar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalEliminacionMaterial;
