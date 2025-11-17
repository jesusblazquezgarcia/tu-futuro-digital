# Tu Futuro Digital — Proyecto (Frontend + Backend)

## Estructura
- `frontend/` — landing page (index.html)
- `backend/` — Node.js + Express (server.js), ejemplo de integración PayPal y notificaciones por email.

## Instrucciones rápidas

### Frontend (pruebas locales)
Puedes abrir `frontend/index.html` en tu navegador para ver la página (no funcionarán los pagos sin backend).

### Backend (ejecución local)
1. Copia `.env.example` a `.env` y rellena las variables.
2. Entra en `backend/`:
   ```bash
   cd backend
   npm install
   npm run dev
   ```
3. El servidor escuchará en `PORT` (por defecto 3000).

### PayPal
- Para pruebas usa las APIs sandbox de PayPal y ajusta las URLs en `server.js` a `api-m.sandbox.paypal.com`.
- En producción rellena `PAYPAL_CLIENT_ID` y `PAYPAL_SECRET`.

### Bizum
- Bizum requiere integración con TPV (Redsys u otro). El endpoint devuelve un placeholder; debes implementar el flujo con tu entidad bancaria o TPV.

### Hotmart
- Si vendes por Hotmart configura allí el producto y añade la URL de webhook que apunte a `BASE_URL + '/api/hotmart-webhook'` (a implementar).

### Notificaciones por email
- El backend envía correos a `NOTIFY_EMAIL` cuando hay registros, pagos o bajas. Rellena `SMTP_*` con tus credenciales.

## Despliegue
- Para desplegar el frontend en GitHub Pages / Vercel / Netlify sube la carpeta `frontend`.
- Para desplegar el backend usa Render / Railway / Heroku / DigitalOcean. Protege las variables de entorno.

---

Si quieres, puedo:
- Preparar el repositorio listo para subir a GitHub (ZIP que ya generé).
- Crear los scripts para Redsys (Bizum) si me pasas los datos del TPV.
- Cambiar PayPal a entorno sandbox para pruebas y dejar la configuración lista.
