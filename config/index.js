const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

// Función HTTPS callable para crear un usuario
exports.crearUsuario = functions.https.onCall(async (data, context) => {
  // 🔹 Verificar que el que llama sea admin
  const callerUid = context.auth?.uid;
  if (!callerUid) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "Debe estar autenticado."
    );
  }

  // Obtener rol del admin
  const callerDoc = await admin.firestore().collection("users").doc(callerUid).get();
  const callerRole = callerDoc.data()?.role;
  if (callerRole !== "admin") {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Solo admins pueden crear usuarios."
    );
  }

  // 🔹 Datos del nuevo usuario
  const { email, password, role } = data;
  if (!email || !password || !role) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Email, password y role son requeridos."
    );
  }

  try {
    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
    });

    // Guardar rol en Firestore
    await admin.firestore().collection("users").doc(userRecord.uid).set({
      email,
      role,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { uid: userRecord.uid, email, role };
  } catch (error) {
    console.error("Error creando usuario:", error);
    throw new functions.https.HttpsError("internal", error.message);
  }
});
