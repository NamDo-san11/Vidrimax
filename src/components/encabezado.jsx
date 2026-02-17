// src/components/encabezado.jsx
import React, { useEffect, useMemo, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../database/authcontext";
import logo from "../assets/logoex.png";
import "bootstrap-icons/font/bootstrap-icons.css";
import "../App.css";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../database/firebaseconfig";

// ========= MENU (AGRUPADO) =========
const menuGroups = [
  {
    key: "general",
    title: "General",
    icon: "bi-speedometer2",
    roles: ["admin", "empleado"],
    items: [
      { to: "/inicio", icon: "bi-house", label: "Inicio", roles: ["admin", "empleado"] },
    ],
  },
  {
    key: "operaciones",
    title: "Operaciones",
    icon: "bi-briefcase",
    roles: ["admin", "empleado"],
    items: [
      { to: "/catalogo", icon: "bi-front", label: "Catálogo", roles: ["admin", "empleado"] },
      { to: "/ventas", icon: "bi-receipt", label: "Ventas", roles: ["admin", "empleado"] },
    ],
  },
  {
    key: "inventario",
    title: "Inventario",
    icon: "bi-box-seam",
    roles: ["admin"],
    items: [
      { to: "/inventario", icon: "bi-box-seam", label: "Inventario", roles: ["admin"] },
      { to: "/pagos", icon: "bi-credit-card", label: "Pagos", roles: ["admin"] },
      { to: "/gestionventas", icon: "bi-graph-up", label: "Gestión de Ventas", roles: ["admin"] },
      { to: "/empleados", icon: "bi-people", label: "Empleados", roles: ["admin"] },
    ],
  },
  {
    key: "ventanas",
    title: "Ventanas",
    icon: "bi-window",
    roles: ["admin", "empleado"],
    items: [
      { to: "/catalogoventanas", icon: "bi-card-list", label: "Administrar Ventanas", roles: ["admin"] },
      { to: "/calcularventana", icon: "bi-calculator", label: "Calcular Ventana", roles: ["admin", "empleado"] },
      { to: "/ventasventanas", icon: "bi-cart4", label: "Ventas de Ventanas", roles: ["admin", "empleado"] },
    ],
  },
];

const Encabezado = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { isLoggedIn, logout, user } = useAuth();
  const navigate = useNavigate();

  const [rol, setRol] = useState(null);
  const [loadingRol, setLoadingRol] = useState(true);

  // Estado de grupos abiertos/cerrados (para no saturar)
  const [openGroups, setOpenGroups] = useState({
    general: true,
    operaciones: true,
    inventario: true,
    ventanas: true,
  });

  const toggleGroup = (key) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Obtener rol desde Firestore
  useEffect(() => {
    const obtenerRol = async () => {
      if (!user) return;
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setRol(snap.data().role);
      } catch (e) {
        console.error("Error obteniendo rol:", e);
      } finally {
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

  // Filtra grupos y items por rol (memo para rendimiento)
  const groupsForRole = useMemo(() => {
    if (!rol) return [];
    return menuGroups
      .filter((g) => g.roles.includes(rol))
      .map((g) => ({
        ...g,
        items: g.items.filter((it) => it.roles.includes(rol)),
      }))
      .filter((g) => g.items.length > 0);
  }, [rol]);

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
            groupsForRole.map((group) => (
              <div key={group.key} className="sidebar-group">
                {/* Título de sección (colapsable) */}
                <button
                  type="button"
                  className="sidebar-section-title"
                  onClick={() => toggleGroup(group.key)}
                >
                  <span className="sidebar-section-left">
                    <i className={`bi ${group.icon}`} />
                    <span className="sidebar-section-text">{group.title}</span>
                  </span>

                  <i
                    className={`bi ${
                      openGroups[group.key] ? "bi-chevron-up" : "bi-chevron-down"
                    } sidebar-section-chevron`}
                  />
                </button>

                {/* Items */}
                {openGroups[group.key] && (
                  <div className="sidebar-section-items">
                    {group.items.map((item) => (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          `sidebar-link ${isActive ? "active" : ""}`
                        }
                        onClick={() => setIsMobileOpen(false)}
                        end
                      >
                        <i className={`bi ${item.icon} sidebar-icon`} />
                        <span className="sidebar-label">{item.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
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
