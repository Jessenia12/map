var helper = require('./../helpers/helpers')

module.exports.controller = (app, io, socket_list) => {
    
    const msg_success = "successfully"
    const msg_fail = "fail"
    
    // ✅ ACTUALIZADO: Objeto mejorado para tracking familiar
    const car_location_obj = {}
    
    app.post('/api/car_join', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;
        
        // ✅ ACTUALIZADO: Agregar user_type a los parámetros requeridos
        helper.CheckParameterValid(res, reqObj, ['uuid', 'lat', 'long', 'degree', 'socket_id'], () => {
            
            socket_list['us_' + reqObj.uuid] = { 
                'socket_id': reqObj.socket_id,
                'user_type': reqObj.user_type || 'Desconocido' // ✅ NUEVO
            }
            
            // ✅ ACTUALIZADO: Guardar información completa del usuario familiar
            car_location_obj[reqObj.uuid] = {
                'uuid': reqObj.uuid, 
                'lat': reqObj.lat, 
                'long': reqObj.long, 
                'degree': reqObj.degree,
                'user_type': reqObj.user_type || 'Desconocido', // ✅ NUEVO
                'timestamp': Date.now(), // ✅ NUEVO
                'last_update': new Date().toISOString() // ✅ NUEVO
            }
            
            // ✅ ACTUALIZADO: Emisión mejorada con tipo de usuario
            io.emit("car_join", {
                "status": "1",
                "payload": {
                    'uuid': reqObj.uuid, 
                    'lat': reqObj.lat, 
                    'long': reqObj.long, 
                    'degree': reqObj.degree,
                    'user_type': reqObj.user_type || 'Desconocido', // ✅ NUEVO
                    'timestamp': Date.now() // ✅ NUEVO
                }
            })
            
            // ✅ Log mejorado
            helper.Dlog(`👤 ${reqObj.user_type || 'Usuario'} se unió al tracking familiar`);
            
            res.json({ 
                "status": "1", 
                "payload": {
                    "all_users": car_location_obj,
                    "user_count": Object.keys(car_location_obj).length, // ✅ NUEVO
                    "current_user": car_location_obj[reqObj.uuid] // ✅ NUEVO
                }, 
                "message": msg_success 
            })
            
        })
    })
    
    app.post('/api/car_update_location', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;
        
        helper.CheckParameterValid(res, reqObj, ['uuid', 'lat', 'long', 'degree', 'socket_id'], () => {
            
            socket_list['us_' + reqObj.uuid] = { 
                'socket_id': reqObj.socket_id,
                'user_type': reqObj.user_type || socket_list['us_' + reqObj.uuid]?.user_type || 'Desconocido' // ✅ ACTUALIZADO
            }
            
            // ✅ ACTUALIZADO: Mantener información del usuario y actualizar ubicación
            if (car_location_obj[reqObj.uuid]) {
                car_location_obj[reqObj.uuid] = {
                    ...car_location_obj[reqObj.uuid], // Mantener datos existentes
                    'lat': reqObj.lat, 
                    'long': reqObj.long, 
                    'degree': reqObj.degree,
                    'user_type': reqObj.user_type || car_location_obj[reqObj.uuid].user_type, // ✅ ACTUALIZADO
                    'timestamp': Date.now(), // ✅ ACTUALIZADO
                    'last_update': new Date().toISOString() // ✅ ACTUALIZADO
                }
            } else {
                // Si no existe, crear nuevo registro
                car_location_obj[reqObj.uuid] = {
                    'uuid': reqObj.uuid, 
                    'lat': reqObj.lat, 
                    'long': reqObj.long, 
                    'degree': reqObj.degree,
                    'user_type': reqObj.user_type || 'Desconocido',
                    'timestamp': Date.now(),
                    'last_update': new Date().toISOString()
                }
            }
            
            // ✅ ACTUALIZADO: Emisión mejorada con información familiar
            io.emit("car_update_location", {
                "status": "1",
                "payload": {
                    'uuid': reqObj.uuid, 
                    'lat': reqObj.lat, 
                    'long': reqObj.long, 
                    'degree': reqObj.degree,
                    'user_type': car_location_obj[reqObj.uuid].user_type, // ✅ NUEVO
                    'timestamp': car_location_obj[reqObj.uuid].timestamp // ✅ NUEVO
                }
            })
            
            // ✅ Log mejorado
            helper.Dlog(`📍 ${car_location_obj[reqObj.uuid].user_type} actualizó ubicación`);
            
            res.json({ 
                "status": "1", 
                "payload": {
                    "updated_user": car_location_obj[reqObj.uuid], // ✅ NUEVO
                    "all_users": car_location_obj // ✅ OPCIONAL: para debug
                },
                "message": msg_success 
            })
            
        })
    })
    
    // ✅ NUEVO: Endpoint para obtener todos los miembros de la familia
    app.get('/api/family_members', (req, res) => {
        try {
            const familyMembers = Object.values(car_location_obj).map(user => ({
                uuid: user.uuid,
                user_type: user.user_type,
                lat: parseFloat(user.lat),
                long: parseFloat(user.long),
                degree: parseFloat(user.degree),
                last_update: user.last_update,
                is_online: (Date.now() - user.timestamp) < 60000 // Online si actualizó en el último minuto
            }));
            
            helper.Dlog(`👨‍👩‍👧‍👦 Obteniendo ${familyMembers.length} miembros de la familia`);
            
            res.json({
                "status": "1",
                "payload": {
                    "family_members": familyMembers,
                    "total_count": familyMembers.length,
                    "online_count": familyMembers.filter(member => member.is_online).length
                },
                "message": msg_success
            });
            
        } catch (error) {
            helper.Dlog('❌ Error en family_members: ' + error);
            res.json({
                "status": "0",
                "message": msg_fail
            });
        }
    });
    
    // ✅ NUEVO: Endpoint para desconectar usuario
    app.post('/api/car_leave', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;
        
        helper.CheckParameterValid(res, reqObj, ['uuid'], () => {
            
            if (car_location_obj[reqObj.uuid]) {
                const userType = car_location_obj[reqObj.uuid].user_type;
                
                // Eliminar de ambos objetos
                delete car_location_obj[reqObj.uuid];
                delete socket_list['us_' + reqObj.uuid];
                
                // Notificar a otros usuarios
                io.emit("car_leave", {
                    "status": "1",
                    "payload": {
                        "uuid": reqObj.uuid,
                        "user_type": userType,
                        "timestamp": Date.now()
                    }
                });
                
                helper.Dlog(`👋 ${userType} se desconectó del tracking familiar`);
                
                res.json({
                    "status": "1",
                    "message": `${userType} desconectado correctamente`
                });
            } else {
                res.json({
                    "status": "0",
                    "message": "Usuario no encontrado"
                });
            }
        });
    });
    
    // ✅ NUEVO: Limpieza automática de usuarios inactivos cada 5 minutos
    setInterval(() => {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000; // 5 minutos
        
        for (let uuid in car_location_obj) {
            if (now - car_location_obj[uuid].timestamp > inactiveThreshold) {
                const userType = car_location_obj[uuid].user_type;
                
                helper.Dlog(`🧹 Limpiando usuario inactivo: ${userType}`);
                
                // Notificar desconexión automática
                io.emit("car_leave", {
                    "status": "1",
                    "payload": {
                        "uuid": uuid,
                        "user_type": userType,
                        "timestamp": now,
                        "reason": "inactive"
                    }
                });
                
                delete car_location_obj[uuid];
                delete socket_list['us_' + uuid];
            }
        }
    }, 5 * 60 * 1000); // Ejecutar cada 5 minutos
}