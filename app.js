var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const cors = require('cors');
const fs = require('fs');

var app = express();

// ✅ Crear el único servidor HTTP
var server = require('http').createServer(app);

// ✅ Montar socket.io sobre el mismo servidor
var io = require('socket.io')(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true
  }
});

// ✅ Correcto: solo usas el puerto asignado por Render
var serverPort = process.env.PORT;

if (!serverPort) {
  console.error("❌ Error: La variable de entorno PORT no está definida. Render la asigna automáticamente.");
  process.exit(1);
}

var user_socket_connect_list = [];

// ✅ Configuración de Express (todo correcto)
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ Configuración de CORS correcta
const corsOptions = {
  origin: "*",
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// ✅ Ruta raíz simple
app.get('/', (req, res) => {
  res.send('Servidor de tracking familiar activo 🚀');
});

// ✅ Correctamente cargando controladores
fs.readdirSync('./controllers').forEach((file) => {
  if (file.substr(-3) == ".js") {
    const route = require('./controllers/' + file);
    route.controller(app, io, user_socket_connect_list);
  }
});

// ✅ Manejo de error 404
app.use(function(req, res, next) {
  next(createError(404));
});

// ✅ Middleware de error general
app.use(function(err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

// ✅ Finalmente levantar el servidor en el puerto asignado por Render
server.listen(serverPort, '0.0.0.0', () => {
  console.log(`🚀 Server iniciado en el puerto ${serverPort}`);
});

module.exports = app;
