// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";

import { AuthProvider } from "./database/authcontext";
import ProtectedRoute from "./components/protectedRoute";
import Login from "./views/login";
import Encabezado from "./components/encabezado";

import Inicio from "./views/inicio";
import Inventario from "./views/inventario";
import Ventas from "./views/ventas";
import Empleados from "./views/empleados";
import Configuracion from "./views/configuracion";
import GestionVentas from "./views/gestionventas";
import Catalogoventa from "./views/CatalogoVentanas";
import Pagos from "./views/pagos";
import VentasVentanas from "./views/VentaVentanas";
import Catalogo from "./views/catalogo";
import VentanasAdmin from "./views/ventanasAdmin";
import CatalogoVentanas from "./views/CatalogoVentanas";
import CalcularVentana from "./views/CalcularVentana";
import "./App.css";

const withLayout = (PageComponent) => (
  <Encabezado>
    <PageComponent />
  </Encabezado>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />

          <Route
            path="/inicio"
            element={<ProtectedRoute element={withLayout(Inicio)} />}
          />
          <Route
            path="/catalogo"
            element={<ProtectedRoute element={withLayout(Catalogo)} />}
          />
          <Route
            path="/ventasventanas"
            element={<ProtectedRoute element={withLayout(VentasVentanas)} />}
          />
          < Route
            path="/catalogoventanas"
            element={<ProtectedRoute element={withLayout(CatalogoVentanas)} />}
          />
          < Route
            path="/calcularventana"
            element={<ProtectedRoute element={withLayout(CalcularVentana)} />}
          />
          <Route
            path="/ventanasadmin"
            element={<ProtectedRoute element={withLayout(VentanasAdmin)} />}
          />
          <Route
            path="/inventario"
            element={<ProtectedRoute element={withLayout(Inventario)} />}
          />
          <Route
            path="/catalogoventa"
            element={<ProtectedRoute element={withLayout(Catalogoventa)} />}
          />
          <Route
            path="/gestionventas"
            element={<ProtectedRoute element={withLayout(GestionVentas)} />}
          />
          <Route
            path="/ventas"
            element={<ProtectedRoute element={withLayout(Ventas)} />}
          />
          <Route
            path="/empleados"
            element={<ProtectedRoute element={withLayout(Empleados)} />}
          />

          <Route
            path="/pagos"
            element={<ProtectedRoute element={withLayout(Pagos)} />}
          />

          <Route
            path="/configuracion"
            element={<ProtectedRoute element={withLayout(Configuracion)} />}
          />

          <Route path="*" element={<Navigate to="/inicio" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
