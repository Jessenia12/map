var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

const cors = require('cors');
const fs = require('fs');

var app = express();

var server = require('http').createServer(app)
var io = require('socket.io')(server, {
  cors: {
    // ✅ CAMBIO 1: Permitir cualquier origen
    origin: "*", // Permite conexiones desde cualquier red
    methods: ["GET", "POST"],
    credentials: true
  }
})

var serverPort = 3001;

var user_socket_connect_list = [];

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json({limit: '100mb'}));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// ✅ CAMBIO 2: CORS para cualquier origen
const corsOptions = {
  origin: "*", // Permite conexiones desde cualquier red
  credentials: true,
  optionsSuccessStatus: 200
}

app.use(cors(corsOptions));

// ✅ CAMBIO 3: Headers adicionales para acceso externo
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With');
  next();
});

fs.readdirSync('./controllers').forEach( (file) => {
  if(file.substr(-3) == ".js") {
    route = require('./controllers/' + file);
    route.controller(app, io, user_socket_connect_list);
  }
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

// ✅ CAMBIO 4: Escuchar en todas las interfaces
server.listen(serverPort, '0.0.0.0', () => {
  console.log(`🚀 Server Start: ${serverPort}`);
  console.log(`🌐 Accesible desde cualquier red en puerto ${serverPort}`);
  
  // Mostrar IPs disponibles
  const networkInterfaces = require('os').networkInterfaces();
  const addresses = [];
  
  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    for (const addressInfo of networkInterface) {
      if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
        addresses.push(addressInfo.address);
      }
    }
  }
  
  console.log('📍 IPs disponibles:');
  addresses.forEach(ip => {
    console.log(`   http://${ip}:${serverPort}`);
  });
});

/*
  🔔 Recuerda: No necesitas cambiar nada en este servidor para usar la URL pública.

  Cuando uses LocalTunnel o ngrok, la URL pública (por ejemplo, 
  https://fair-mugs-relate.loca.lt) la configuras SOLO en tu app Flutter o cliente,
  en las conexiones HTTP o Socket.IO.

  Ejemplo en Flutter para HTTP o socket.io:

  final String baseUrl = 'https://fair-mugs-relate.loca.lt';

  final socket = IO.io(baseUrl, <String, dynamic>{
    'transports': ['websocket'],
    'autoConnect': false,
  });
*/
