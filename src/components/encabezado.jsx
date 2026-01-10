// src/components/encabezado.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../database/authcontext";
import logo from "../assets/react.svg";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../App.css";

const menuItems = [
  { to: "/inicio", icon: "bi-house", label: "Inicio" },
  { to: "/inventario", icon: "bi-box-seam", label: "Inventario"},
  { to: "/catalogo", icon: "bi bi-front", label: "Catálogo"},
  { to: "/ventas", icon: "bi-receipt", label: "Ventas"},
  { to: "/empleados", icon: "bi-people", label: "Empleados"},
  { to: "/pagos", icon: "bi-credit-card", label: "Pagos"},
  { to: "/gestionventas", icon: "bi-graph-up", label: "Gestión de Ventas"},
  { to: "/configuracion", icon: "bi-gear", label: "Configuración"},
];

const Encabezado = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogoClick = () => navigate("/inicio");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // !Cierra el menú al pasar a desktop (evita estados raros)
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setIsMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${isMobileOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header" onClick={handleLogoClick}>
          <div className="sidebar-logo">
            <img src={logo} alt="Vidrimax logo" />
          </div>
          <div className="sidebar-title">
            <span className="sidebar-title-main">VIDRIMAX</span>
            <span className="sidebar-title-sub">Gestión de Vidriería</span>
          </div>
        </div>

        <nav className="sidebar-menu">
          {menuItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}
              onClick={() => setIsMobileOpen(false)}
              end
            >
              <i className={`bi ${item.icon} sidebar-icon`} />
              <span className="sidebar-label">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {isLoggedIn && (
          <div className="sidebar-footer">
            <button className="sidebar-logout" onClick={handleLogout} type="button">
              <i className="bi bi-box-arrow-right sidebar-icon" />
              <span className="sidebar-label">Cerrar sesión</span>
            </button>
          </div>
        )}
      </aside>

      {isMobileOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />
      )}

      <div className="content-shell">
        <header className="topbar">
          <button
            className="topbar-menu-btn"
            type="button"
            onClick={() => setIsMobileOpen((prev) => !prev)}
            aria-label="Abrir menú"
          >
            <i className="bi bi-list" />
          </button>
          <div />
        </header>

        <main className="content-main">{children}</main>
      </div>
    </div>
  );
};

export default Encabezado;
