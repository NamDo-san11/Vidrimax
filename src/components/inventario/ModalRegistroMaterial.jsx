import React, { useEffect } from "react";

const ModalRegistroMaterial = ({
  showModal,
  setShowModal,
  nuevoMaterial,
  handleInputChange,
  handleAddMaterial,
}) => {
  // Cerrar con ESC
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setShowModal(false);
    };
    if (showModal) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showModal, setShowModal]);

  if (!showModal) return null;

  const onSubmit = (e) => {
    e.preventDefault();
    handleAddMaterial();
  };

  return (
    <div className="vmx-modal-overlay" onClick={() => setShowModal(false)}>
      <div className="vmx-modal" onClick={(e) => e.stopPropagation()}>
        <div className="vmx-modal-header">
          <div className="vmx-modal-badge">+</div>
          <div>
            <h3 className="vmx-modal-title">Agregar nuevo material</h3>
            <p className="vmx-modal-subtitle">
              Registra un vidrio, perfil u otro material en el inventario.
            </p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="vmx-modal-body">
            <div className="vmx-grid">
              <div className="vmx-field">
                <label>Descripción</label>
                <input
                  name="descripcion"
                  value={nuevoMaterial.descripcion}
                  onChange={handleInputChange}
                  placeholder="Ej: Vidrio claro 6mm"
                  autoFocus
                />
              </div>

              <div className="vmx-field">
                <label>Stock total</label>
                <input
                  name="longitud"
                  value={nuevoMaterial.longitud}
                  onChange={handleInputChange}
                  placeholder="Ej: 350"
                  inputMode="decimal"
                />
              </div>

              <div className="vmx-field">
                <label>Precio compra</label>
                <input
                  name="precio_compra"
                  value={nuevoMaterial.precio_compra}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>

              <div className="vmx-field">
                <label>Precio venta (unidad)</label>
                <input
                  name="precio_venta"
                  value={nuevoMaterial.precio_venta}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  inputMode="decimal"
                />
              </div>

              {/* Campos opcionales para tu colección (si luego quieres) */}
              {/* <div className="vmx-field">
                <label>Activo</label>
                <select name="activo" onChange={handleInputChange}>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </div> */}
            </div>
          </div>

          <div className="vmx-modal-footer">
            <button
              type="button"
              className="vmx-btn"
              onClick={() => setShowModal(false)}
            >
              Cancelar
            </button>

            <button type="submit" className="vmx-btn vmx-btn-primary">
              Guardar material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalRegistroMaterial;
