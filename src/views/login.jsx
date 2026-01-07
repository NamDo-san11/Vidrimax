// src/views/login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Card, Form, Button, Alert } from "react-bootstrap";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import { appfirebase } from "../database/firebaseconfig";
import { useAuth } from "../database/authcontext";
import "../styles/login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate("/inicio", { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const auth = getAuth(appfirebase);
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/inicio", { replace: true });
    } catch (err) {
      console.error(err);
      let mensaje = "No se pudo iniciar sesión.";
      if (err.code === "auth/invalid-credential") mensaje = "Correo o contraseña incorrectos.";
      if (err.code === "auth/network-request-failed") mensaje = "Problema de conexión. Verifica tu internet.";
      setError(mensaje);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" role="main">
      <Container className="login-container">
        <Row className="justify-content-center w-100 g-0">
          <Col xs={12} sm={10} md={8} lg={6} xl={5} className="login-col">
            <div className="login-hero">
              <div className="login-mark">
                <span>VMI</span>
              </div>
              <h1 className="login-brand">Vidrimax</h1>
              <p className="login-brand-sub">Sistema de Gestión</p>
            </div>

            <Card className="login-card">
              <Card.Body className="login-card-body">
                <h2 className="login-welcome">Bienvenido</h2>
                <p className="login-desc">Inicia sesión para continuar</p>

                {error && (
                  <Alert variant="danger" className="py-2 login-alert">
                    {error}
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Correo electrónico</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                  </Form.Group>

                  <Form.Group className="mb-4">
                    <Form.Label>Contraseña</Form.Label>
                    <Form.Control
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                    />
                  </Form.Group>

                  <Button type="submit" className="login-btn" disabled={loading}>
                    {loading ? "Iniciando sesión..." : "Iniciar sesión →"}
                  </Button>
                </Form>

                <p className="login-hint">Acceso exclusivo para personal autorizado de Vidrimax.</p>
              </Card.Body>
            </Card>

            <p className="login-footer">© 2024 Vidrimax. Todos los derechos reservados.</p>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
