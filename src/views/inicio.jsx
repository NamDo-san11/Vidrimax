// src/views/Inicio.jsx
import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocs,
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
  const [empleadoNombre, setEmpleadoNombre] = useState("");

  // 📦 Inventario
  const [alertasStock, setAlertasStock] = useState(0);
  const [totalInventario, setTotalInventario] = useState(0);

  // 📊 KPI top categorias
  const [topCategorias, setTopCategorias] = useState([]);

  // 🧾 Ventas recientes
  // 📲 PWA
  const [solicitudInstalacion, setSolicitudInstalacion] = useState(null);
  const [mostrarBotonInstalacion, setMostrarBotonInstalacion] = useState(false);
  const [esDispositivoIOS, setEsDispositivoIOS] = useState(false);
  const [mostrarModalInstrucciones, setMostrarModalInstrucciones] = useState(false);

  const abrirModalInstrucciones = () => setMostrarModalInstrucciones(true);
  const cerrarModalInstrucciones = () => setMostrarModalInstrucciones(false);
  const fechaActual = new Intl.DateTimeFormat("es-NI", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const maxCategoria = Math.max(1, ...topCategorias.map((categoria) => categoria.cantidad));

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
      <header className="inicio-hero">
        <div className="inicio-hero-copy">
          <div className="inicio-eyebrow">
            <span className="inicio-live-dot" /> VIDRIMAX <span className="inicio-eyebrow-divider">/</span> RESUMEN
          </div>
          <h1>Bienvenido{empleadoNombre ? `, ${empleadoNombre}` : ""}</h1>
          <p>Todo listo para una nueva jornada.</p>
          <div className="inicio-date">
            <i className="bi bi-calendar3" />
            <span>{fechaActual}</span>
          </div>
        </div>

        <div className="inicio-hero-action">
          {!esDispositivoIOS && mostrarBotonInstalacion && (
            <Button className="inicio-install-button" onClick={instalacion}>
              <i className="bi bi-download" /> Instalar app
            </Button>
          )}
          {esDispositivoIOS && (
            <>
              <Button className="inicio-install-button" onClick={abrirModalInstrucciones}>
                <i className="bi bi-phone" /> Instalar en iPhone
              </Button>
              <ModalInstalacionIOS
                mostrar={mostrarModalInstrucciones}
                cerrar={cerrarModalInstrucciones}
              />
            </>
          )}
        </div>
        <div className="inicio-hero-mark" aria-hidden="true">
          <i className="bi bi-window" />
        </div>
      </header>

      <div className="cards-grid">
        <div className="inicio-metric inicio-metric-inventory">
          <div className="inicio-metric-head">
            <span>Inventario disponible</span>
            <i className="bi bi-box-seam" />
          </div>
          <h2>C${totalInventario.toFixed(2)}</h2>
          <small><span className="inicio-metric-dot" /> Valor actual en bodega</small>
        </div>

        <div className="inicio-metric inicio-metric-alert">
          <div className="inicio-metric-head">
            <span>Stock bajo</span>
            <i className="bi bi-exclamation-triangle" />
          </div>
          <h2>{alertasStock}</h2>
          <small><span className="inicio-metric-dot" /> Productos con menos de {LOW_STOCK} unidades</small>
        </div>

        <div className="inicio-metric inicio-metric-top">
          <div className="inicio-metric-head">
            <span>Categorías más vendidas</span>
            <i className="bi bi-bar-chart-line" />
          </div>
          {topCategorias.length ? (
            <div className="inicio-category-list">
              {topCategorias.map((categoria, index) => (
                <div className="inicio-category" key={categoria.categoria}>
                  <div className="inicio-category-label">
                    <span><b>0{index + 1}</b> {categoria.categoria}</span>
                    <strong>{categoria.cantidad}</strong>
                  </div>
                  <div className="inicio-category-track">
                    <span style={{ width: `${(categoria.cantidad / maxCategoria) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="inicio-empty-state">Todavía no hay ventas registradas.</p>
          )}
        </div>
      </div>

      <section className="info-negocio">
        <div className="info-negocio-heading">
          <div>
            <span className="inicio-section-kicker">NUESTRO NORTE</span>
            <h2>Acerca de Vidrimax</h2>
          </div>
          <i className="bi bi-bounding-box-circles" aria-hidden="true" />
        </div>

        <div className="cards-mision-vision">
          <article className="card-info card-info-mision">
            <span className="card-info-number">01</span>
            <h3>Misión</h3>
            <p>
              Brindar soluciones en vidriería y herrajes de alta calidad, garantizando
              satisfacción y confianza a nuestros clientes. Buscamos superar expectativas
              con cada producto y servicio.
            </p>
          </article>

          <article className="card-info card-info-vision">
            <span className="card-info-number">02</span>
            <h3>Visión</h3>
            <p>
              Ser la empresa líder en cristalería y herrajes en Nicaragua, innovando
              constantemente en productos y servicios, promoviendo un crecimiento
              sostenible y un servicio excepcional a nuestros clientes.
            </p>
          </article>

          <article className="card-info card-info-about">
            <span className="card-info-number">03</span>
            <h3>Qué somos</h3>
            <p>
              Vidrimax es un sistema integral para la gestión de ventas, inventario y
              control de productos de vidriería. Facilitamos la operación diaria de
              tu negocio, permitiéndote tomar decisiones rápidas basadas en datos
              confiables.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
