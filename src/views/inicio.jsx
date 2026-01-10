// src/views/Inicio.jsx
import { useEffect, useState } from "react";
import { collection, onSnapshot, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import { useAuth } from "../database/authcontext";
import { Button, Card, Container, Row, Col } from "react-bootstrap";
import ModalInstalacionIOS from "../components/inicio/ModalInstalacionIOS";
import Idefault from "../assets/default.jpeg";
import "../styles/inicio.css";

const LOW_STOCK = 5;

export default function Inicio() {
  const { user } = useAuth();

  // Datos de usuario
  const [perfil, setPerfil] = useState(null);

  // Inventario
  const [alertasStock, setAlertasStock] = useState(0);
  const [totalInventario, setTotalInventario] = useState(0);

  // Ventas
  const [ventasMes, setVentasMes] = useState(0);
  const [totalAcumulado, setTotalAcumulado] = useState(0);
  const [numVentasMes, setNumVentasMes] = useState(0);

  // PWA
  const [solicitudInstalacion, setSolicitudInstalacion] = useState(null);
  const [mostrarBotonInstalacion, setMostrarBotonInstalacion] = useState(false);
  const [esDispositivoIOS, setEsDispositivoIOS] = useState(false);
  const [mostrarModalInstrucciones, setMostrarModalInstrucciones] = useState(false);

  const abrirModalInstrucciones = () => setMostrarModalInstrucciones(true);
  const cerrarModalInstrucciones = () => setMostrarModalInstrucciones(false);

  // Detectar dispositivo iOS
  useEffect(() => {
    const esIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setEsDispositivoIOS(esIOS);
  }, []);

  // Capturar evento beforeinstallprompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setSolicitudInstalacion(e);
      setMostrarBotonInstalacion(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const instalacion = async () => {
    if (!solicitudInstalacion) return;
    try {
      await solicitudInstalacion.prompt();
      const { outcome } = await solicitudInstalacion.userChoice;
      console.log(outcome === "accepted" ? "Instalación aceptada" : "Instalación rechazada");
    } catch (error) {
      console.error("Error al instalar PWA:", error);
    } finally {
      setSolicitudInstalacion(null);
      setMostrarBotonInstalacion(false);
    }
  };

  // Perfil de usuario
  useEffect(() => {
    const obtenerPerfil = async () => {
      if (!user) return;
      try {
        const ref = doc(db, "usuarios", user.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) setPerfil(snap.data());
      } catch (error) {
        console.error("Error al obtener perfil:", error);
      }
    };
    obtenerPerfil();
  }, [user]);

  // Inventario en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inventario"), (snapshot) => {
      let alertas = 0;
      let valorInventario = 0;

      snapshot.forEach((doc) => {
        const r = doc.data();
        if (r.activo === false) return;

        const stockTotal = Number(r.stock_total ?? 0);
        const vendidos = Number(r.vendidos ?? 0);
        const existencia = Math.max(stockTotal - vendidos, 0);
        const precioCompra = Number(r.precio_compra ?? 0);

        valorInventario += existencia * precioCompra;
        if (existencia < LOW_STOCK) alertas++;
      });

      setAlertasStock(alertas);
      setTotalInventario(valorInventario);
    });

    return () => unsub();
  }, []);

  // Ventas
  useEffect(() => {
    const cargarVentas = async () => {
      try {
        const ventasCol = collection(db, "ventas");
        const docs = await getDocs(ventasCol);

        let total = 0;
        let mesActual = new Date().getMonth();
        let ventasMesTotal = 0;
        let numVentas = 0;

        docs.forEach((doc) => {
          const data = doc.data();
          const fecha = data.createdAt?.toDate ? data.createdAt.toDate() : new Date();
          const monto = Number(data.monto ?? 0);

          total += monto;

          if (fecha.getMonth() === mesActual) {
            ventasMesTotal += monto;
            numVentas++;
          }
        });

        setTotalAcumulado(total);
        setVentasMes(ventasMesTotal);
        setNumVentasMes(numVentas);
      } catch (error) {
        console.error("Error al cargar ventas:", error);
      }
    };
    cargarVentas();
  }, []);

  return (
    <div className="inicio-container">
      {/* Botón instalación PWA */}
      {!esDispositivoIOS && mostrarBotonInstalacion && (
        <div className="mb-4 text-center">
          <Button variant="primary" onClick={instalacion}>
            Instalar app <i className="bi bi-download"></i>
          </Button>
        </div>
      )}
      {esDispositivoIOS && (
        <div className="mb-4 text-center">
          <Button variant="primary" onClick={abrirModalInstrucciones}>
            Cómo instalar en iPhone <i className="bi bi-phone"></i>
          </Button>
          <ModalInstalacionIOS
            mostrar={mostrarModalInstrucciones}
            cerrar={cerrarModalInstrucciones}
          />
        </div>
      )}

      {/* Cards KPI */}
      <div className="cards-grid">
        <div className="card card-ventas" data-aos="fade-up">
          <p>Ventas este mes</p>
          <h2>C${ventasMes.toFixed(2)}</h2>
          <small>{numVentasMes} ventas</small>
        </div>

        <div className="card card-total" data-aos="fade-up" data-aos-delay="100">
          <p>Total acumulado</p>
          <h2>C${totalAcumulado.toFixed(2)}</h2>
          <small>Total histórico de ventas</small>
        </div>

        <div className="card card-inventario" data-aos="fade-up" data-aos-delay="200">
          <p>Inventario disponible</p>
          <h2>C${totalInventario.toFixed(2)}</h2>
          <small>Valor en bodega</small>
        </div>

        <div className="card card-alerta" data-aos="fade-up" data-aos-delay="300">
          <p>Productos con stock mínimo</p>
          <h2>{alertasStock}</h2>
          <span>Existencia &lt; {LOW_STOCK}</span>
        </div>
      </div>

      {/* Información del negocio */}
      <section className="info-negocio mt-4 p-4 text-center" data-aos="fade-up">
        <h4>Bienvenido a Vidrimax</h4>
        <p>
          Controla tus ventas, inventario y productos en tiempo real. Mantén tu
          negocio organizado y toma decisiones inteligentes con datos actualizados
          al momento.
        </p>
        <p>
          Compatible con dispositivos Android e iOS. Instala la app para acceder más rápido y
          sin depender del navegador.
        </p>
      </section>
    </div>
  );
}
