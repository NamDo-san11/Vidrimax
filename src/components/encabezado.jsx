// src/components/encabezado.jsx
import React, { useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../database/authcontext";
import logo from "../assets/logoex.png";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../App.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../database/firebaseconfig";

// Define los items de menú y a qué roles se les permite ver
const menuItems = [
  { to: "/inicio", icon: "bi-house", label: "Inicio", roles: ["admin", "empleado"] },
  { to: "/inventario", icon: "bi-box-seam", label: "Inventario", roles: ["admin"] },
  { to: "/catalogo", icon: "bi-front", label: "Catálogo", roles: ["admin", "empleado"] },
  { to: "/ventas", icon: "bi-receipt", label: "Ventas", roles: ["admin", "empleado"] },
  { to: "/empleados", icon: "bi-people", label: "Empleados", roles: ["admin"] },
  { to: "/pagos", icon: "bi-credit-card", label: "Pagos", roles: ["admin"] },
  { to: "/gestionventas", icon: "bi-graph-up", label: "Gestión de Ventas", roles: ["admin"] },
  { to: "/catalogoventanas", icon: "bi-card-list", label: "Administrar Ventanas", roles: ["admin"] },
  { to: "/calcularventana", icon: "bi-calculator", label: "Calcular Ventana", roles: ["empleado","admin"] },
];

const Encabezado = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isLoggedIn, logout, user } = useAuth();
  const navigate = useNavigate();

  const [rol, setRol] = useState(null);
  const [loadingRol, setLoadingRol] = useState(true);

  // Obtener el rol del usuario desde Firestore
  useEffect(() => {
    const obtenerRol = async () => {
      if (user) {
        const ref = doc(db, "users", user.uid); // colección "users"
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setRol(snap.data().role); // campo role
        }
        setLoadingRol(false);
      }
    };
    obtenerRol();
  }, [user]);

  const handleLogoClick = () => navigate("/inicio");

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Cierra menú en desktop
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 900) setIsMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!isLoggedIn) return null;

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
          {loadingRol ? (
            <div className="sidebar-loading">Cargando menú...</div>
          ) : (
            menuItems
              .filter((item) => item.roles.includes(rol)) // Filtra según rol
              .map((item) => (
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
              ))
          )}
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

      {isMobileOpen && <div className="sidebar-overlay" onClick={() => setIsMobileOpen(false)} />}

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
