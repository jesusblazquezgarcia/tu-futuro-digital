// server.js
// Recomendado: node >=16
const express = require('express');
const bodyParser = require('body-parser');
const fetch = require('node-fetch');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
app.use(bodyParser.json());

// ------- Persistencia simple en archivo (puedes cambiar a DB real) -------
const fs = require('fs');
const DBFILE = './users.json';
function load(){ try{ return JSON.parse(fs.readFileSync(DBFILE)); }catch(e){ return {users:[]}; }}
function save(db){ fs.writeFileSync(DBFILE, JSON.stringify(db,null,2)); }

// ------- CARGAR CONFIG desde variables de entorno -------
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT || 587;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const NOTIFY_EMAIL = process.env.NOTIFY_EMAIL || 'jesus.xusta87@gmail.com';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Config nodemailer
const transporter = nodemailer.createTransport({ host:SMTP_HOST, port:SMTP_PORT, secure:false, auth:{user:SMTP_USER, pass:SMTP_PASS} });

// Endpoint para crear un registro inicial y devolver URL de pago según método
app.post('/api/registro', async (req, res) => {
  const {nombre,email,plan,metodo} = req.body;
  if(!nombre||!email||!plan||!metodo) return res.status(400).json({ok:false,message:'Faltan campos'});

  const db = load();
  const id = crypto.randomUUID();
  const user = {id, nombre, email, plan, metodo, status:'pending', createdAt: new Date().toISOString() };
  db.users.push(user); save(db);

  // ENVIAR EMAIL de notificación de registro
  try{
    await transporter.sendMail({from:SMTP_USER, to:NOTIFY_EMAIL, subject:`Nuevo registro: ${nombre}`, text:`Se ha registrado: ${nombre} <${email}> — Plan: ${plan} — Metodo: ${metodo}`});
  }catch(e){
    console.error('Error enviando email registro', e);
  }

  if(metodo === 'paypal'){
    // Crear orden con PayPal (Server-side). Aquí ejemplo con API v2.
    const auth = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_SECRET).toString('base64');
    const priceMap = {basic:'497.00', advanced:'1997.00', premium:'3000.00'};
    const orderBody = {
      intent: 'CAPTURE', purchase_units:[{amount:{currency_code:'EUR', value: priceMap[plan]}}], application_context:{return_url: BASE_URL + '/api/paypal-success?uid='+id, cancel_url: BASE_URL + '/api/paypal-cancel?uid='+id}
    };

    try{
      const tokenResp = await fetch('https://api-m.paypal.com/v1/oauth2/token', {method:'POST', headers:{'Authorization':'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'}, body:'grant_type=client_credentials'});
      const tokenData = await tokenResp.json();
      const orderResp = await fetch('https://api-m.paypal.com/v2/checkout/orders', {method:'POST', headers:{'Authorization':'Bearer '+tokenData.access_token,'Content-Type':'application/json'}, body:JSON.stringify(orderBody)});
      const orderData = await orderResp.json();
      const approvalUrl = (orderData.links||[]).find(l=>l.rel==='approve')?.href;
      return res.json({ok:true, approvalUrl});
    }catch(err){
      console.error('PayPal error', err);
      return res.status(500).json({ok:false,message:'Error creando orden PayPal'});
    }
  }

  if(metodo === 'bizum'){
    return res.json({ok:true, payUrl: BASE_URL + '/pay/bizum-placeholder?uid='+id});
  }

  if(metodo === 'hotmart'){
    return res.json({ok:true,message:'Redirigir a Hotmart'})
  }

  res.json({ok:true});
});

// PayPal success capture
app.get('/api/paypal-success', async (req,res)=>{
  const {token, uid} = req.query;
  if(!token||!uid) return res.send('Faltan parámetros');

  // Capturar orden
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_SECRET).toString('base64');
  const tokenResp = await fetch('https://api-m.paypal.com/v1/oauth2/token', {method:'POST', headers:{'Authorization':'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'}, body:'grant_type=client_credentials'});
  const tokenData = await tokenResp.json();
  const captureResp = await fetch(`https://api-m.paypal.com/v2/checkout/orders/${token}/capture`, {method:'POST', headers:{'Authorization':'Bearer '+tokenData.access_token}});
  const captureData = await captureResp.json();

  // Marcar usuario como active
  const db = load();
  const u = db.users.find(x=>x.id===uid);
  if(u){ u.status='paid'; u.payInfo = captureData; save(db); }

  // Enviar email de notificación de pago
  try{
    await transporter.sendMail({from:SMTP_USER,to:NOTIFY_EMAIL,subject:`Pago recibido: ${u?.nombre}`,text:`El usuario ${u?.nombre} <${u?.email}> ha completado el pago.`});
  }catch(e){ console.error('Error email pago', e); }

  const whatsappJoin = 'https://chat.whatsapp.com/Bi1OoFiwrLQ5tPiBi85bBy';
  res.send(`<html><body><h3>Pago recibido. Redirigiendo a la comunidad de WhatsApp...</h3><script>setTimeout(()=>{window.location='${whatsappJoin}';},1500)</script></body></html>`);
});

// Endpoint para darse de baja (unsubscribe)
app.post('/api/unsubscribe', async (req,res)=>{
  const {email} = req.body; if(!email) return res.status(400).json({ok:false});
  const db = load();
  const u = db.users.find(x=>x.email===email);
  if(u){ u.status='unsubscribed'; u.unsubAt = new Date().toISOString(); save(db);
    try{
      await transporter.sendMail({from:SMTP_USER,to:NOTIFY_EMAIL,subject:`Baja: ${u.nombre||email}`,text:`El usuario ${u.nombre||email} se ha dado de baja.`});
    }catch(e){ console.error('Error email baja', e); }
  }
  res.json({ok:true});
});

// Health
app.get('/', (req,res)=>res.send('Servidor OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT,()=>console.log('Server running on',PORT));
