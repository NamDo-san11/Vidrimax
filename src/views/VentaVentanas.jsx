// src/views/VentasVentanas.jsx
import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, doc, runTransaction, Timestamp } from "firebase/firestore";
import { db } from "../database/firebaseconfig";
import { evaluarFormula } from "../components/utils/formulas";
import { guardarTasaUSD, obtenerTasaUSD } from "../components/utils/tasaUSD";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

import jsPDF from "jspdf";
import logoVidrimax from "../assets/logoex.png";

export default function VentasVentanas() {
  // ===== Tipos de ventanas =====
  const [tipos, setTipos] = useState([]);
  const [cargandoTipos, setCargandoTipos] = useState(true);

  const [tipoId, setTipoId] = useState("");
  const tipoSeleccionado = useMemo(
    () => tipos.find((t) => t.id === tipoId),
    [tipos, tipoId]
  );

  // ===== Datos factura =====
  const [cliente, setCliente] = useState("");
  const [empleado, setEmpleado] = useState("");

  // ===== Tasa =====
  const [tasaUSD, setTasaUSD] = useState(36.78);
  const [cargandoTasa, setCargandoTasa] = useState(true);
  const [guardandoTasa, setGuardandoTasa] = useState(false);
  const [mensajeTasa, setMensajeTasa] = useState("");

  // ===== Medidas / variables =====
  const [ancho, setAncho] = useState("");
  const [alto, setAlto] = useState("");
  const [x, setX] = useState("0");
  const [y, setY] = useState("0");
  const [z, setZ] = useState("0");
  const [cantidad, setCantidad] = useState(1);

  // ✅ Color
  const [color, setColor] = useState("");

  // ===== Carrito =====
  const [carrito, setCarrito] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [productoId, setProductoId] = useState("");
  const [productoCantidad, setProductoCantidad] = useState(1);
  const [mostrarModalProductos, setMostrarModalProductos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");

  // ✅ UI: items expandidos (materiales)
  const [openDetalle, setOpenDetalle] = useState({}); // { itemId: true/false }

  // ===== UI state =====
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const productosFiltrados = useMemo(() => {
    const normalizar = (texto) => String(texto ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
    const termino = normalizar(busquedaProducto.trim());
    return productos
      .filter((producto) => producto.existencia > 0)
      .filter((producto) => normalizar(
        `${producto.nombre} ${producto.color} ${producto.categoria}`
      ).includes(termino));
  }, [productos, busquedaProducto]);

  const productoSeleccionado = productos.find((producto) => producto.id === productoId);

  // ===== Cargar tipos =====
  useEffect(() => {
    const cargar = async () => {
      try {
        setCargandoTipos(true);
        const qs = await getDocs(collection(db, "tiposVentanas"));
        const data = qs.docs.map((d) => ({ id: d.id, ...d.data() }));
        setTipos(data);
        if (data.length) setTipoId(data[0].id);
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los tipos de ventanas.");
      } finally {
        setCargandoTipos(false);
      }
    };
    cargar();
  }, []);

  useEffect(() => {
    const cargarTasa = async () => {
      try {
        setTasaUSD(await obtenerTasaUSD());
      } catch (e) {
        console.error(e);
        setError("No se pudo cargar la tasa USD guardada.");
      } finally {
        setCargandoTasa(false);
      }
    };
    cargarTasa();
  }, []);

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const qs = await getDocs(collection(db, "inventario"));
        setProductos(qs.docs.map((d) => {
          const producto = d.data();
          return {
            id: d.id,
            nombre: producto.nombre ?? "",
            color: producto.color ?? "",
            categoria: producto.categoria ?? "",
            precio: Number(producto.precio_venta ?? 0),
            existencia: Number(producto.stock_total ?? 0)
          };
        }));
      } catch (e) {
        console.error(e);
        setError("No se pudieron cargar los productos del inventario.");
      } finally {
        setCargandoProductos(false);
      }
    };
    cargarProductos();
  }, []);

  const guardarTasa = async () => {
    setMensajeTasa("");
    setError("");
    if (!Number.isFinite(Number(tasaUSD)) || Number(tasaUSD) <= 0) {
      setError("Ingresa una tasa USD válida.");
      return;
    }

    setGuardandoTasa(true);
    try {
      await guardarTasaUSD(tasaUSD);
      setMensajeTasa("Tasa USD guardada.");
    } catch (e) {
      console.error(e);
      setError(e.message || "No se pudo guardar la tasa USD.");
    } finally {
      setGuardandoTasa(false);
    }
  };

  // Reset al cambiar tipo
  useEffect(() => {
    setAncho("");
    setAlto("");
    setX("0");
    setY("0");
    setZ("0");
    setCantidad(1);
    setColor("");
    setError("");
  }, [tipoId]);

  // ===== Helpers: recalcular item según excluidos =====
  const recomputarItem = (item) => {
    const excl = new Set(item.excluidos || []);
    const detalleFinal = (item.detalleOriginal || []).filter((d) => !excl.has(d.material));

    const totalUnitarioFinal = detalleFinal.reduce((acc, d) => acc + Number(d.subtotal || 0), 0);
    const totalFinal = totalUnitarioFinal * Number(item.cantidad || 1);

    return {
      ...item,
      detalleFinal,
      totalUnitarioFinal,
      totalFinal
    };
  };

  // ===== Calcular unitario (genera detalleOriginal) =====
  const calcularUnitario = () => {
    if (!tipoSeleccionado) throw new Error("Selecciona un tipo de ventana.");
    if (!ancho || !alto) throw new Error("Ingresa ancho y alto.");
    if (Number(ancho) <= 0 || Number(alto) <= 0) throw new Error("Medidas inválidas.");
    if (Number(tasaUSD) <= 0) throw new Error("Tasa USD inválida.");
    if (!color.trim()) throw new Error("Escribe el color.");

    const ctx = {
      ancho: Number(ancho),
      alto: Number(alto),
      x: tipoSeleccionado.usaX ? Number(x) : 0,
      y: tipoSeleccionado.usaY ? Number(y) : 0,
      z: tipoSeleccionado.usaZ ? Number(z) : 0
    };

    // detalleOriginal
    const detalleOriginal = (tipoSeleccionado.materiales || []).map((mat) => {
      const longitudNeta = evaluarFormula(mat.formula, ctx);
      const cantMat = Number(mat.cantidad ?? 1);
      const precio = Number(mat.precio ?? 0);

      const longitudTotal = longitudNeta * cantMat;
      const subtotal = longitudTotal * precio;

      return {
        material: mat.nombre,
        formula: mat.formula,
        longitudTotal,
        precio,
        subtotal
      };
    });

    const totalUnitario = detalleOriginal.reduce((acc, it) => acc + it.subtotal, 0);

    return { detalleOriginal, totalUnitario, ctx };
  };

  // ===== Agregar al carrito =====
  const agregarAlCarrito = () => {
    setError("");
    try {
      const cant = Math.max(1, Number(cantidad || 1));
      const { detalleOriginal, ctx } = calcularUnitario();

      const itemBase = {
        id: `${tipoId}_${Date.now()}`,
        tipoItem: "ventana",
        tipoId,
        tipoNombre: tipoSeleccionado.nombre,
        color: color.trim(),
        ancho: ctx.ancho,
        alto: ctx.alto,
        x: ctx.x,
        y: ctx.y,
        z: ctx.z,
        cantidad: cant,

        // ✅ Guardamos original + excluidos + final
        excluidos: [],
        detalleOriginal
      };

      // Inicializa final igual al original
      const item = recomputarItem(itemBase);

      setCarrito((prev) => [...prev, item]);

      // limpiar inputs
      setAncho("");
      setAlto("");
      setX("0");
      setY("0");
      setZ("0");
      setColor("");
      setCantidad(1);
    } catch (e) {
      setError(e.message || "Error al agregar al carrito.");
    }
  };

  const agregarProductoAlCarrito = () => {
    setError("");
    const producto = productos.find((p) => p.id === productoId);
    const cantidadAgregar = Number(productoCantidad);

    if (!producto) return setError("Selecciona un producto del inventario.");
    if (!Number.isInteger(cantidadAgregar) || cantidadAgregar <= 0) {
      return setError("La cantidad del producto debe ser un entero mayor a 0.");
    }

    const cantidadEnCarrito = carrito
      .filter((item) => item.tipoItem === "producto" && item.id === producto.id)
      .reduce((acc, item) => acc + item.cantidad, 0);

    if (cantidadEnCarrito + cantidadAgregar > producto.existencia) {
      return setError(`Existencia insuficiente para ${producto.nombre}.`);
    }

    setCarrito((prev) => {
      const existente = prev.find((item) => item.tipoItem === "producto" && item.id === producto.id);
      if (existente) {
        return prev.map((item) => item === existente
          ? {
              ...item,
              cantidad: item.cantidad + cantidadAgregar,
              totalFinal: item.precio * (item.cantidad + cantidadAgregar)
            }
          : item);
      }

      return [...prev, {
        ...producto,
        tipoItem: "producto",
        cantidad: cantidadAgregar,
        totalFinal: producto.precio * cantidadAgregar
      }];
    });
    setProductoId("");
    setProductoCantidad(1);
  };

  const quitarDelCarrito = (id) => {
    setCarrito((prev) => prev.filter((i) => i.id !== id));
    setOpenDetalle((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  };

  const vaciarCarrito = () => {
    setCarrito([]);
    setOpenDetalle({});
  };

  const toggleDetalleItem = (id) => {
    setOpenDetalle((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // ✅ Quitar / Restaurar material en un item
  const toggleMaterial = (itemId, material) => {
    setCarrito((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;

        const excl = new Set(it.excluidos || []);
        if (excl.has(material)) excl.delete(material);
        else excl.add(material);

        const actualizado = { ...it, excluidos: Array.from(excl) };
        return recomputarItem(actualizado);
      })
    );
  };

  // ===== Totales =====
  const total = useMemo(
    () => carrito.reduce((acc, it) => acc + Number(it.totalFinal || 0), 0),
    [carrito]
  );

  const totalUSD = useMemo(() => {
    const t = Number(tasaUSD);
    if (!t || t <= 0) return 0;
    return total / t;
  }, [total, tasaUSD]);

  // ===== PDF =====
  const generarFacturaVentanasPDF = (factura) => {
    const EMPRESA = {
      nombre: "VIDRIMAX",
      telefono: "Tel: 5802-8225",
      direccion: "Del Hotel Pergolas 100 v al Sur, 20 v al Este",
      frase: "Calidad y confianza en cada detalle"
    };

    const docpdf = new jsPDF({ orientation: "portrait", unit: "mm", format: [140, 216] });

    const M_LEFT = 6, M_RIGHT = 134, M_TOP = 12;
    let yPos = M_TOP;

    // Logo
    const logoWidth = 30, logoHeight = 18, logoX = (140 - logoWidth) / 2;
    docpdf.addImage(logoVidrimax, "PNG", logoX, yPos, logoWidth, logoHeight);
    yPos += logoHeight + 2;

    // Encabezado
    docpdf.setFontSize(14); docpdf.text(EMPRESA.nombre, 70, yPos, { align: "center" });
    yPos += 5; docpdf.setFontSize(9); docpdf.text(EMPRESA.frase, 70, yPos, { align: "center" });
    yPos += 4; docpdf.text(EMPRESA.direccion, 70, yPos, { align: "center" });
    yPos += 4; docpdf.text(EMPRESA.telefono, 70, yPos, { align: "center" });

    yPos += 4; docpdf.setLineWidth(0.4); docpdf.line(M_LEFT, yPos, M_RIGHT, yPos);

    // Datos de factura
    yPos += 8; docpdf.setFontSize(9);
    docpdf.text(`Factura #: ${factura.numero}`, M_LEFT, yPos);
    docpdf.text(`Fecha: ${new Date(factura.fecha).toLocaleDateString()}`, M_RIGHT, yPos, { align: "right" });
    yPos += 6; docpdf.text(`Cliente: ${factura.cliente}`, M_LEFT, yPos);
    yPos += 6; docpdf.text(`Empleado: ${factura.empleado}`, M_LEFT, yPos);
    yPos += 6; docpdf.text(`Tasa: 1 USD = C$ ${Number(factura.tasaUSD).toFixed(2)}`, M_LEFT, yPos);

    // Cabecera tabla
    yPos += 8; docpdf.setFontSize(8); docpdf.setLineWidth(0.3); docpdf.line(M_LEFT, yPos, M_RIGHT, yPos);
    yPos += 5;
    docpdf.text("Ventana (Color)", M_LEFT + 4, yPos);
    docpdf.text("Cant", 86, yPos, { align: "right" });
    docpdf.text("Unit", 110, yPos, { align: "right" });
    docpdf.text("Subt", 134, yPos, { align: "right" });
    yPos += 3; docpdf.line(M_LEFT, yPos, M_RIGHT, yPos); yPos += 5;

    factura.items.forEach((i) => {
      const esProducto = i.tipoItem === "producto";
      const base = esProducto
        ? `${i.nombre}${i.color ? ` - ${i.color}` : ""}`
        : `${i.tipoNombre} - ${i.color} (${i.ancho} x ${i.alto})`;
      const vars = !esProducto && (Number(i.x) || Number(i.y) || Number(i.z))
        ? ` X:${Number(i.x).toFixed(3)} Y:${Number(i.y).toFixed(3)} Z:${Number(i.z).toFixed(3)}`
        : "";
      const sinTxt = !esProducto && i.excluidos?.length
        ? ` (Sin: ${i.excluidos.slice(0, 2).join(", ")}${i.excluidos.length > 2 ? "…" : ""})`
        : "";

      docpdf.text(base + vars + sinTxt, M_LEFT + 2, yPos, { maxWidth: 78 });
      docpdf.text(String(i.cantidad), 86, yPos, { align: "right" });
      docpdf.text(`C$ ${Number(esProducto ? i.precio : i.totalUnitarioFinal).toFixed(2)}`, 110, yPos, { align: "right" });
      docpdf.text(`C$ ${Number(esProducto ? i.subtotal : i.totalFinal).toFixed(2)}`, 134, yPos, { align: "right" });

      yPos += 7;
      if (yPos > 185) { docpdf.addPage(); yPos = M_TOP + 10; }
    });

    // Total
    yPos += 2; docpdf.setLineWidth(0.4); docpdf.line(M_LEFT, yPos, M_RIGHT, yPos);
    yPos += 8; docpdf.setFontSize(11);
    docpdf.text(`TOTAL: C$ ${Number(factura.total).toFixed(2)}`, M_RIGHT, yPos, { align: "right" });

    yPos += 6; docpdf.setFontSize(10);
    docpdf.text(`TOTAL USD: $ ${Number(factura.totalUSD).toFixed(2)}`, M_RIGHT, yPos, { align: "right" });

    // Pie
    yPos += 12; docpdf.setFontSize(8);
    docpdf.text("Gracias por su preferencia", 70, yPos, { align: "center" });
    docpdf.text(
      "Cotización / Factura de ventanas. Revisen medidas y detalles antes de confirmar.",
      70,
      yPos + 5,
      { align: "center", maxWidth: 120 }
    );

    docpdf.save(`Factura_Ventanas_${factura.numero}.pdf`);
  };

  // ===== Guardar venta =====
  const guardarVentaVentanas = async () => {
    setError("");

    if (!cliente.trim()) return setError("Escribe el cliente.");
    if (!empleado.trim()) return setError("Escribe el empleado.");
    if (carrito.length === 0 || !carrito.some((item) => item.tipoItem !== "producto")) {
      return setError("Agrega al menos una ventana.");
    }
    if (Number(tasaUSD) <= 0) return setError("Tasa USD inválida.");

    setGuardando(true);

    try {
      const factura = {
        numero: Date.now(),
        cliente: cliente.trim(),
        empleado: empleado.trim(),
        fecha: new Date(),
        tasaUSD: Number(tasaUSD),

        items: carrito.map((i) => i.tipoItem === "producto"
          ? {
              tipoItem: "producto",
              productoId: i.id,
              nombre: i.nombre,
              categoria: i.categoria,
              color: i.color,
              cantidad: i.cantidad,
              precio: Number(i.precio || 0),
              subtotal: Number(i.totalFinal || 0)
            }
          : {
              tipoItem: "ventana",
              tipoId: i.tipoId,
              tipoNombre: i.tipoNombre,
              color: i.color,
              ancho: i.ancho,
              alto: i.alto,
              x: i.x,
              y: i.y,
              z: i.z,
              cantidad: i.cantidad,
              excluidos: i.excluidos || [],
              totalUnitarioFinal: Number(i.totalUnitarioFinal || 0),
              totalFinal: Number(i.totalFinal || 0),
              detalleFinal: (i.detalleFinal || []).map((d) => ({
                material: d.material,
                formula: d.formula,
                longitudTotal: Number(d.longitudTotal || 0),
                precio: Number(d.precio || 0),
                subtotal: Number(d.subtotal || 0)
              }))
            }),

        total,
        totalUSD
      };

      const productosVendidos = carrito.filter((item) => item.tipoItem === "producto");
      const facturaRef = doc(collection(db, "ventasVentanas"));
      await runTransaction(db, async (transaction) => {
        const refsInventario = productosVendidos.map((item) => doc(db, "inventario", item.id));
        const snapshots = await Promise.all(refsInventario.map((ref) => transaction.get(ref)));

        snapshots.forEach((snapshot, index) => {
          const item = productosVendidos[index];
          if (!snapshot.exists()) {
            throw new Error(`El producto ${item.nombre} ya no existe en el inventario.`);
          }
          const stockActual = Number(snapshot.data().stock_total ?? 0);
          if (item.cantidad > stockActual) {
            throw new Error(`Existencia insuficiente para ${item.nombre}. Disponible: ${stockActual}.`);
          }
        });

        productosVendidos.forEach((item, index) => {
          transaction.update(refsInventario[index], {
            stock_total: Number(snapshots[index].data().stock_total ?? 0) - item.cantidad
          });
        });
        transaction.set(facturaRef, {
          ...factura,
          fecha: Timestamp.now()
        });
      });

      setProductos((prev) => prev.map((producto) => {
        const vendido = productosVendidos.find((item) => item.id === producto.id);
        return vendido
          ? { ...producto, existencia: producto.existencia - vendido.cantidad }
          : producto;
      }));
      generarFacturaVentanasPDF(factura);

      alert("Venta de ventanas guardada y factura generada ✅");
      setCarrito([]);
      setOpenDetalle({});
      setCliente("");
      setEmpleado("");
    } catch (e) {
      console.error(e);
      setError(e.message || "No se pudo guardar la venta.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargandoTipos) {
    return <div className="text-center mt-4">Cargando tipos de ventanas…</div>;
  }

  return (
    <div className="container my-4">
      <div className="row g-3">
        {/* FORM */}
        <div className="col-lg-7">
          <div className="card shadow border-0">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Venta de Ventanas</h5>
            </div>

            <div className="card-body">
              {error ? <div className="alert alert-danger">{error}</div> : null}

              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label fw-bold">Cliente</label>
                  <input
                    className="form-control"
                    value={cliente}
                    onChange={(e) => setCliente(e.target.value)}
                    placeholder="Nombre del cliente"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Empleado</label>
                  <input
                    className="form-control"
                    value={empleado}
                    onChange={(e) => setEmpleado(e.target.value)}
                    placeholder="Nombre del empleado"
                  />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Tipo de ventana</label>
                  <select
                    className="form-select"
                    value={tipoId}
                    onChange={(e) => setTipoId(e.target.value)}
                  >
                    {tipos.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.nombre}
                      </option>
                    ))}
                  </select>

                  {tipoSeleccionado?.descripcion ? (
                    <div className="text-muted mt-1" style={{ fontSize: 13 }}>
                      {tipoSeleccionado.descripcion}
                    </div>
                  ) : null}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-bold">Color</label>
                  <input
                    className="form-control"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    placeholder="Ej: Champán, Blanco, Natural..."
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label fw-bold">Alto (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="form-control"
                    value={alto}
                    onChange={(e) => setAlto(e.target.value)}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label fw-bold">Ancho (m)</label>
                  <input
                    type="number"
                    step="0.001"
                    className="form-control"
                    value={ancho}
                    onChange={(e) => setAncho(e.target.value)}
                  />
                </div>

                <div className="col-md-2">
                  <label className="form-label fw-bold">Cantidad</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={cantidad}
                    onChange={(e) => setCantidad(Math.max(1, Number(e.target.value)))}
                  />
                </div>

                {/* Variables X/Y/Z */}
                {tipoSeleccionado?.usaX ? (
                  <div className="col-md-4">
                    <label className="form-label">X</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control"
                      value={x}
                      onChange={(e) => setX(e.target.value)}
                    />
                  </div>
                ) : null}

                {tipoSeleccionado?.usaY ? (
                  <div className="col-md-4">
                    <label className="form-label">Y</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control"
                      value={y}
                      onChange={(e) => setY(e.target.value)}
                    />
                  </div>
                ) : null}

                {tipoSeleccionado?.usaZ ? (
                  <div className="col-md-4">
                    <label className="form-label">Z</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control"
                      value={z}
                      onChange={(e) => setZ(e.target.value)}
                    />
                  </div>
                ) : null}

                {/* Tasa */}
                <div className="col-md-6">
                  <label className="form-label fw-bold">Tasa USD (editable)</label>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="form-control"
                    value={tasaUSD}
                    disabled={cargandoTasa}
                    onChange={(e) => {
                      setTasaUSD(e.target.value);
                      setMensajeTasa("");
                    }}
                  />
                  <div className="text-muted" style={{ fontSize: 12 }}>
                    1 USD = {Number(tasaUSD || 0).toFixed(2)} C$
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={guardarTasa}
                    disabled={cargandoTasa || guardandoTasa}
                  >
                    {guardandoTasa ? "Guardando..." : "Guardar tasa"}
                  </button>
                  {mensajeTasa ? <div className="text-success small mt-1">{mensajeTasa}</div> : null}
                </div>

                <div className="col-12 d-flex gap-2 mt-2">
                  <button className="btn btn-outline-success" onClick={agregarAlCarrito}>
                    Agregar al carrito
                  </button>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={vaciarCarrito}
                    disabled={carrito.length === 0}
                  >
                    Vaciar carrito
                  </button>
                </div>

                <div className="col-12 mt-3">
                  <div className="border rounded-3 bg-light p-3">
                    <div className="d-flex align-items-start gap-3 mb-3">
                      <div
                        className="rounded-3 bg-primary text-white d-flex align-items-center justify-content-center flex-shrink-0"
                        style={{ width: 42, height: 42 }}
                      >
                        <i className="bi bi-box-seam fs-5" />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-1">Productos adicionales</h6>
                        <div className="small text-muted">
                          Agrega otros artículos a la misma factura de la ventana.
                        </div>
                      </div>
                    </div>

                    <div className="row g-2 align-items-end">
                      <div className="col-md-7">
                        <label className="form-label small fw-semibold">Producto</label>
                        <button
                          type="button"
                          className={`btn border bg-white text-start w-100 d-flex justify-content-between align-items-center ${productoSeleccionado ? "border-primary" : "border-secondary-subtle"}`}
                          style={{ height: 40, overflow: "hidden" }}
                          aria-haspopup="dialog"
                          aria-expanded={mostrarModalProductos}
                          onClick={() => {
                            setBusquedaProducto("");
                            setMostrarModalProductos(true);
                          }}
                          disabled={cargandoProductos}
                        >
                          <span className={productoSeleccionado ? "text-dark" : "text-muted"}>
                            {cargandoProductos
                              ? "Cargando inventario..."
                              : productoSeleccionado
                                ? `${productoSeleccionado.nombre}${productoSeleccionado.color ? ` - ${productoSeleccionado.color}` : ""}`
                                : "Buscar y seleccionar producto"}
                          </span>
                          <i className="bi bi-search text-primary" />
                        </button>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small fw-semibold">Cantidad</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          className="form-control"
                          value={productoCantidad}
                          onChange={(e) => setProductoCantidad(e.target.value)}
                        />
                      </div>
                      <div className="col-md-3">
                        <button
                          type="button"
                          className="btn btn-primary w-100"
                          style={{
                            minHeight: 40,
                            backgroundColor: "#0d6efd",
                            borderColor: "#0d6efd",
                            color: "#fff",
                            whiteSpace: "nowrap"
                          }}
                          onClick={agregarProductoAlCarrito}
                          disabled={cargandoProductos || !productoId}
                        >
                          <i className="bi bi-plus-lg me-1" />
                          Agregar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CARRITO */}
        <div className="col-lg-5">
          <div className="card shadow border-0">
            <div className="card-header bg-dark text-white">
              <h5 className="mb-0">Carrito</h5>
            </div>

            <div className="card-body">
              {carrito.length === 0 ? (
                <div className="text-muted">Agrega ventanas para ver el resumen.</div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {carrito.map((it) => (
                    <div key={it.id} className="border rounded p-2">
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div style={{ minWidth: 0 }}>
                          <div className="fw-bold text-truncate">
                            {it.tipoItem === "producto" ? it.nombre : it.tipoNombre}
                            {it.tipoItem === "producto" && (
                              <span className="badge bg-secondary ms-2">Producto</span>
                            )}
                          </div>
                          <div className="text-muted" style={{ fontSize: 12 }}>
                            {it.color ? <>Color: <strong>{it.color}</strong></> : it.categoria}
                          </div>
                          {it.tipoItem === "producto" ? (
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              Cantidad: {it.cantidad}
                            </div>
                          ) : (
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              {it.ancho.toFixed(3)}m x {it.alto.toFixed(3)}m • Cant: {it.cantidad}
                            </div>
                          )}
                          {it.tipoItem !== "producto" && (it.x || it.y || it.z) ? (
                            <div className="text-muted" style={{ fontSize: 12 }}>
                              X:{Number(it.x).toFixed(3)} Y:{Number(it.y).toFixed(3)} Z:{Number(it.z).toFixed(3)}
                            </div>
                          ) : null}
                        </div>

                        <div className="d-flex flex-column gap-2">
                          {it.tipoItem !== "producto" && (
                            <button
                              className="btn btn-sm btn-outline-primary"
                              onClick={() => toggleDetalleItem(it.id)}
                            >
                              <i className="bi bi-list-check" />{" "}
                              {openDetalle[it.id] ? "Ocultar" : "Materiales"}
                            </button>
                          )}

                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => quitarDelCarrito(it.id)}
                          >
                            <i className="bi bi-trash" /> Quitar
                          </button>
                        </div>
                      </div>

                      {/* Totales recalculados */}
                      <div className="d-flex justify-content-between mt-2">
                        <span className="text-muted">Unitario (ajustado)</span>
                        <span className="fw-bold">C$ {Number(it.tipoItem === "producto" ? it.precio : it.totalUnitarioFinal || 0).toFixed(2)}</span>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Subtotal</span>
                        <span className="fw-bold">C$ {Number(it.totalFinal || 0).toFixed(2)}</span>
                      </div>

                      {/* Chips excluidos */}
                      {it.tipoItem !== "producto" && it.excluidos?.length ? (
                        <div className="mt-2" style={{ fontSize: 12 }}>
                          <span className="text-muted">Sin: </span>
                          {it.excluidos.slice(0, 3).map((m) => (
                            <span key={m} className="badge bg-danger-subtle text-danger border me-1">
                              {m}
                            </span>
                          ))}
                          {it.excluidos.length > 3 ? (
                            <span className="text-muted">+{it.excluidos.length - 3}</span>
                          ) : null}
                        </div>
                      ) : null}

                      {/* Detalle materiales con Quitar/Restaurar */}
                      {it.tipoItem !== "producto" && openDetalle[it.id] && (
                        <div className="mt-3">
                          <div className="small fw-bold mb-2">Materiales (clic para quitar/restaurar)</div>

                          <div className="table-responsive">
                            <table className="table table-sm table-bordered align-middle mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th>Material</th>
                                  <th className="text-end">Subtotal</th>
                                  <th className="text-center" style={{ width: 90 }}>Acción</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(it.detalleOriginal || []).map((d, idx) => {
                                  const excluido = (it.excluidos || []).includes(d.material);
                                  return (
                                    <tr key={d.material + idx} style={excluido ? { opacity: 0.55 } : undefined}>
                                      <td>
                                        <div className="fw-semibold">{d.material}</div>
                                        <div className="text-muted" style={{ fontSize: 11 }}>
                                          <code>{d.formula}</code>
                                        </div>
                                      </td>
                                      <td className="text-end">
                                        C$ {Number(d.subtotal || 0).toFixed(2)}
                                      </td>
                                      <td className="text-center">
                                        <button
                                          className={`btn btn-sm ${excluido ? "btn-outline-success" : "btn-outline-danger"}`}
                                          onClick={() => toggleMaterial(it.id, d.material)}
                                          title={excluido ? "Restaurar" : "Quitar"}
                                        >
                                          <i className={`bi ${excluido ? "bi-arrow-counterclockwise" : "bi-trash"}`} />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>

                          <div className="text-muted mt-2" style={{ fontSize: 12 }}>
                            * Quitar no borra el material del catálogo, solo de esta facturación.
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <hr />

              <div className="d-flex justify-content-between">
                <span className="fw-bold">TOTAL (C$)</span>
                <span className="fw-bold">{Number(total).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mt-1">
                <span className="fw-bold">TOTAL (USD)</span>
                <span className="fw-bold">${Number(totalUSD).toFixed(2)}</span>
              </div>

              <button
                className="btn btn-outline-success w-100 mt-3"
                disabled={guardando || !carrito.some((item) => item.tipoItem === "ventana")}
                onClick={guardarVentaVentanas}
              >
                {guardando ? "Guardando..." : "Confirmar venta + PDF"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {mostrarModalProductos && (
        <>
          <div
            className="modal-backdrop show"
            style={{ zIndex: 1040 }}
            onClick={() => setMostrarModalProductos(false)}
          />
          <div
            className="modal show d-block"
            tabIndex="-1"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-productos-title"
            style={{ zIndex: 1050 }}
            onClick={() => setMostrarModalProductos(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setMostrarModalProductos(false);
            }}
          >
            <div
              className="modal-dialog modal-dialog-centered"
              role="document"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content border-0 shadow-lg rounded-3">
                <div className="modal-header py-2">
                  <div>
                    <h5 className="modal-title fw-bold" id="modal-productos-title">
                      Productos disponibles
                    </h5>
                  </div>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={() => setMostrarModalProductos(false)}
                  />
                </div>
                <div className="modal-body pt-2">
                  <div className="input-group mb-2">
                    <span className="input-group-text bg-white">
                      <i className="bi bi-search" />
                    </span>
                    <input
                      type="search"
                      className="form-control"
                      placeholder="Escribe para buscar..."
                      value={busquedaProducto}
                      onChange={(e) => setBusquedaProducto(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="small text-muted mb-1">
                    {productosFiltrados.length} disponibles
                  </div>

                  <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
                    {productosFiltrados.map((producto) => (
                      <button
                        type="button"
                        key={producto.id}
                        className="w-100 text-start border-0 border-bottom bg-white d-flex justify-content-between align-items-center gap-3 px-2 py-2"
                        style={{ cursor: "pointer" }}
                        aria-label={`Seleccionar ${producto.nombre}, C$ ${producto.precio.toFixed(2)}, existencia ${producto.existencia}`}
                        onClick={() => {
                          setProductoId(producto.id);
                          setMostrarModalProductos(false);
                        }}
                      >
                        <span className="fw-semibold text-truncate">{producto.nombre}</span>
                        <span className="small text-muted text-end flex-shrink-0">
                          C$ {producto.precio.toFixed(2)} · Stock {producto.existencia}
                        </span>
                      </button>
                    ))}

                    {!productosFiltrados.length && (
                      <div className="text-center text-muted p-4">
                        {busquedaProducto
                          ? "No se encontraron productos con esa búsqueda."
                          : "No hay productos con existencia disponible."}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
