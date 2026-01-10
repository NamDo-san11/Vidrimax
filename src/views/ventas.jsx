// src/views/ventas.jsx
import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  getDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import "../styles/ventas.css";

function Ventas() {
  const [inventario, setInventario] = useState([]);
  const [carrito, setCarrito] = useState([]);
  const [guardando, setGuardando] = useState(false);

  // 🔍 Búsqueda
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    const cargarInventario = async () => {
      try {
        const snap = await getDocs(collection(db, "inventario"));
        const data = snap.docs.map(d => {
          const i = d.data();
          const stock = Number(i.stock_total ?? 0);
          const vendidos = Number(i.vendidos ?? 0);
          return {
            id: d.id,
            nombre: i.nombre ?? "",
            color: i.color ?? "",
            categoria: i.categoria ?? "",
            descripcion: i.descripcion ?? "",
            precio: Number(i.precio_venta ?? 0),
            existencia: Math.max(stock - vendidos, 0)
          };
        });
        setInventario(data);
      } catch (e) {
        console.error("Error cargando inventario:", e);
      }
    };
    cargarInventario();
  }, []);

  // 🔍 Filtrado seguro
  const inventarioFiltrado = inventario.filter(p => {
    const nombre = String(p.nombre ?? "");
    const color = String(p.color ?? "");
    const categoria = String(p.categoria ?? "");
    const busq = busqueda.toLowerCase();
    return (
      nombre.toLowerCase().includes(busq) ||
      color.toLowerCase().includes(busq) ||
      categoria.toLowerCase().includes(busq)
    );
  });

  const agregar = (p) => {
    if (p.existencia <= 0) return;

    const existe = carrito.find(i => i.id === p.id);

    if (existe) {
      if (existe.cantidad + 1 > p.existencia) return;
      setCarrito(carrito.map(i =>
        i.id === p.id ? { ...i, cantidad: i.cantidad + 1 } : i
      ));
    } else {
      setCarrito([...carrito, { ...p, cantidad: 1 }]);
    }
  };

  const sumar = (id) => {
    setCarrito(carrito.map(i => {
      if (i.id === id && i.cantidad < i.existencia) {
        return { ...i, cantidad: i.cantidad + 1 };
      }
      return i;
    }));
  };

  const restar = (id) => {
    setCarrito(carrito
      .map(i => i.id === id ? { ...i, cantidad: i.cantidad - 1 } : i)
      .filter(i => i.cantidad > 0)
    );
  };

  const total = carrito.reduce((s, i) => s + i.precio * i.cantidad, 0);

  const guardarVenta = async () => {
    if (carrito.length === 0) return;
    setGuardando(true);

    try {
      for (const item of carrito) {
        const ref = doc(db, "inventario", item.id);
        const snap = await getDoc(ref);
        const stock = snap.data().stock_total ?? 0;
        const vendidos = snap.data().vendidos ?? 0;

        if (item.cantidad > stock - vendidos) {
          throw new Error(`Stock insuficiente: ${item.nombre}`);
        }
      }

      await addDoc(collection(db, "ventas"), {
        fecha: new Date(),
        items: carrito.map(i => ({
          id: i.id,
          nombre: i.nombre,
          color: i.color,
          categoria: i.categoria,
          cantidad: i.cantidad,
          precio: i.precio
        })),
        total
      });

      for (const item of carrito) {
        const ref = doc(db, "inventario", item.id);
        const snap = await getDoc(ref);
        const vendidosActuales = snap.data().vendidos ?? 0;
        await updateDoc(ref, {
          vendidos: vendidosActuales + item.cantidad
        });
      }

      alert("Venta guardada correctamente");
      setCarrito([]);
      setBusqueda("");
    } catch (e) {
      alert(e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="ventas-container">
      <h2>Nueva Venta</h2>

      <div className="ventas-grid">
        {/* INVENTARIO */}
        <div className="card">
          <h3>Inventario</h3>

          <input
            className="inv-search"
            type="text"
            placeholder="Buscar por nombre, color o categoría..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          {inventarioFiltrado.map(p => (
            <div className="inv-row" key={p.id}>
              <div>
                <strong>{p.nombre}</strong> <span style={{color:'#999'}}>({p.color})</span>
                <small>Stock: {p.existencia}</small>
              </div>

              <button
                className={`btn-agregar ${p.existencia === 0 ? "disabled" : ""}`}
                disabled={p.existencia === 0}
                onClick={() => agregar(p)}
              >
                Agregar
              </button>
            </div>
          ))}
        </div>

        {/* CARRITO */}
        <div className="card">
          <h3>Venta</h3>

          {carrito.map(i => (
            <div className="cart-row" key={i.id}>
              <span>{i.nombre} ({i.color})</span>

              <div className="qty-box">
                <button className="qty-btn" onClick={() => restar(i.id)}>−</button>
                <div className="qty-value">{i.cantidad}</div>
                <button className="qty-btn" onClick={() => sumar(i.id)}>+</button>
              </div>

              <span className="price">
                C$ {(i.precio * i.cantidad).toFixed(2)}
              </span>
            </div>
          ))}

          <div className="total">
            Total: C$ {total.toLocaleString("es-NI", { minimumFractionDigits: 2 })}
          </div>

          <button
            className="btn-confirmar"
            onClick={guardarVenta}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Confirmar Venta"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default Ventas;
