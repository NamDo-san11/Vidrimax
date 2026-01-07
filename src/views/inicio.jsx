import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "../styles/inicio.css";

const LOW_STOCK = 5;

export default function Inicio() {
  const [alertasStock, setAlertasStock] = useState(0);
  const [totalInventario, setTotalInventario] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "inventario"), (snapshot) => {
      let alertas = 0;
      let valorInventario = 0;

      snapshot.forEach((doc) => {
        const r = doc.data();

        // 🔴 SOLO ignorar si está explícitamente inactivo
        if (r.activo === false) return;

        const stockTotal = Number(r.stock_total ?? 0);
        const vendidos = Number(r.vendidos ?? 0);
        const existencia = Math.max(stockTotal - vendidos, 0);
        const precioCompra = Number(r.precio_compra ?? 0);

        // Valor inventario disponible
        valorInventario += existencia * precioCompra;

        // 🚨 MISMA lógica que inventario.jsx
        if (existencia < LOW_STOCK) {
          alertas++;
        }
      });

      setAlertasStock(alertas);
      setTotalInventario(valorInventario);
    });

    return () => unsub();
  }, []);

  return (
    <div className="inicio-container">
      <div className="cards-grid">
        <div className="card card-verde">
          <p>Ventas este mes</p>
          <h2>C$0.00</h2>
          <small>0 ventas</small>
        </div>

        <div className="card">
          <p>Total acumulado</p>
          <h2>C$0.00</h2>
          <small>Sin ventas registradas</small>
        </div>

        <div className="card">
          <p>Inventario disponible</p>
          <h2>C${totalInventario.toFixed(2)}</h2>
          <small>Valor en bodega</small>
        </div>

        <div className="card card-alerta">
          <p>Productos con stock mínimo</p>
          <h2>{alertasStock}</h2>
          <span>Existencia &lt; {LOW_STOCK}</span>
        </div>
      </div>
    </div>
  );
}
