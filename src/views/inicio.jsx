// src/views/Inicio.jsx
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import { useAuth } from "../database/authcontext";
import { Button } from "react-bootstrap";
import ModalInstalacionIOS from "../components/inicio/ModalInstalacionIOS";
import "../styles/inicio.css";

const LOW_STOCK = 5;

export default function Inicio() {
  const { user } = useAuth();

  // 👤 Perfil y empleado
  const [perfil, setPerfil] = useState(null);
  const [empleadoNombre, setEmpleadoNombre] = useState("");

  // 📦 Inventario
  const [alertasStock, setAlertasStock] = useState(0);
  const [totalInventario, setTotalInventario] = useState(0);

  // 📊 KPI top categorias
  const [topCategorias, setTopCategorias] = useState([]);

  // 🧾 Ventas recientes
  const [ventasRecientes, setVentasRecientes] = useState([]);

  // 📲 PWA
  const [solicitudInstalacion, setSolicitudInstalacion] = useState(null);
  const [mostrarBotonInstalacion, setMostrarBotonInstalacion] = useState(false);
  const [esDispositivoIOS, setEsDispositivoIOS] = useState(false);
  const [mostrarModalInstrucciones, setMostrarModalInstrucciones] = useState(false);

  const abrirModalInstrucciones = () => setMostrarModalInstrucciones(true);
  const cerrarModalInstrucciones = () => setMostrarModalInstrucciones(false);

  // ================== PWA ==================
  useEffect(() => {
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setEsDispositivoIOS(esIOS);
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setSolicitudInstalacion(e);
      setMostrarBotonInstalacion(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const instalacion = async () => {
    if (!solicitudInstalacion) return;
    try {
      await solicitudInstalacion.prompt();
      await solicitudInstalacion.userChoice;
    } catch (error) {
      console.error("Error al instalar PWA:", error);
    } finally {
      setSolicitudInstalacion(null);
      setMostrarBotonInstalacion(false);
    }
  };

  // ================== PERFIL ==================
  useEffect(() => {
    const obtenerPerfil = async () => {
      if (!user) return;
      try {
        const ref = doc(db, "users", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setPerfil(data);

          // obtener nombre del empleado
          if (data.empleadoId) {
            const empRef = doc(db, "empleados", data.empleadoId);
            const empSnap = await getDoc(empRef);
            if (empSnap.exists()) setEmpleadoNombre(empSnap.data().nombre);
          }
        }
      } catch (error) {
        console.error("Error perfil:", error);
      }
    };
    obtenerPerfil();
  }, [user]);

  // ================== INVENTARIO ==================
useEffect(() => {
  const unsub = onSnapshot(collection(db, "inventario"), (snapshot) => {
    let alertas = 0; // productos con stock bajo
    let valorInventario = 0; // valor total del inventario

    snapshot.forEach((doc) => {
      const r = doc.data();
      if (r.activo === false) return;

      const stockTotal = Number(r.stock_total ?? 0); // 🔹 solo stock_total
      const precioCompra = Number(r.precio_compra ?? 0);

      valorInventario += stockTotal * precioCompra; // usamos stock_total

      if (stockTotal < LOW_STOCK) { // 🔹 alertas según stock_total
        alertas++;
      }
    });

    setAlertasStock(alertas);       // cuántos productos tienen stock < 5
    setTotalInventario(valorInventario); // valor total del inventario
  });

  return () => unsub();
}, []);

  // ================== TOP CATEGORIAS ==================
  useEffect(() => {
    const cargarTopCategorias = async () => {
      try {
        const docs = await getDocs(collection(db, "ventas"));
        const categoriasMap = {};

        docs.forEach((doc) => {
          const venta = doc.data();
          if (!venta.items) return;
          venta.items.forEach((item) => {
            categoriasMap[item.categoria] = (categoriasMap[item.categoria] || 0) + item.cantidad;
          });
        });

        const top3 = Object.entries(categoriasMap)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([categoria, cantidad]) => ({ categoria, cantidad }));

        setTopCategorias(top3);
      } catch (error) {
        console.error("Error top categorias:", error);
      }
    };
    cargarTopCategorias();
  }, []);

  // ================== VENTAS RECIENTES ==================
  // ================== UI ==================
  return (
    <div className="inicio-container">
      {/* 👋 SALUDO */}
      <h4 className="mb-3">Bienvenido{empleadoNombre ? `, ${empleadoNombre}` : ""} 👋</h4>

      {/* 📲 BOTÓN PWA */}
      {!esDispositivoIOS && mostrarBotonInstalacion && (
        <div className="mb-4 text-center">
          <Button onClick={instalacion}>
            Instalar app <i className="bi bi-download"></i>
          </Button>
        </div>
      )}

      {esDispositivoIOS && (
        <div className="mb-4 text-center">
          <Button onClick={abrirModalInstrucciones}>
            Cómo instalar en iPhone <i className="bi bi-phone"></i>
          </Button>
          <ModalInstalacionIOS
            mostrar={mostrarModalInstrucciones}
            cerrar={cerrarModalInstrucciones}
          />
        </div>
      )}

      {/* 📊 KPI */}
      <div className="cards-grid">
        <div className="card card-inventario">
          <p>Inventario disponible</p>
          <h2>C${totalInventario.toFixed(2)}</h2>
          <small>Valor en bodega</small>
        </div>

        <div className="card card-alerta">
          <p>Stock bajo</p>
          <h2>{alertasStock}</h2>
          <span>&lt; {LOW_STOCK} unidades</span>
        </div>

        <div className="card card-top">
          <p>Top 3 categorías</p>
          {topCategorias.map((cat, i) => (
            <div key={i} style={{ marginTop: i === 0 ? "0.4rem" : "0.6rem" }}>
              <b>{cat.categoria}</b>: {cat.cantidad} unidades
            </div>
          ))}
        </div>
      </div>


{/* 🌟 MISIÓN, VISIÓN Y QUÉ SOMOS */}
<section className="info-negocio mt-5">
  <div className="text-center mb-4">
    <h4>Acerca de Vidrimax</h4>
    <p className="text-muted">
      Conoce nuestra filosofía y lo que nos motiva a ofrecer siempre lo mejor
      en vidriería y herrajes. Nuestra experiencia y compromiso están al servicio
      de tu negocio.
    </p>
  </div>

  <div className="cards-mision-vision">
    <div className="card-info">
      <h5>Misión</h5>
      <p>
        Brindar soluciones en vidriería y herrajes de alta calidad, garantizando
        satisfacción y confianza a nuestros clientes. Buscamos superar expectativas
        con cada producto y servicio.
      </p>
    </div>

    <div className="card-info">
      <h5>Visión</h5>
      <p>
        Ser la empresa líder en cristalería y herrajes en Nicaragua, innovando
        constantemente en productos y servicios, promoviendo un crecimiento
        sostenible y un servicio excepcional a nuestros clientes.
      </p>
    </div>

    <div className="card-info">
      <h5>Qué somos</h5>
      <p>
        Vidrimax es un sistema integral para la gestión de ventas, inventario y
        control de productos de vidriería. Facilitamos la operación diaria de
        tu negocio, permitiéndote tomar decisiones rápidas basadas en datos
        confiables.
      </p>
    </div>
  </div>
</section>
    </div>
  );
}
