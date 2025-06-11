var helper = require('./../helpers/helpers')

module.exports.controller = (app, io, socket_list) => {
    
    const msg_success = "successfully"
    const msg_fail = "fail"
    
    io.on('connection', (client) => {
        
        helper.Dlog(`🔌 Nueva conexión: ${client.id}`);
        
        client.on('UpdateSocket', (data) => {
            helper.Dlog("UpdateSocket :- " + data);
            var jsonObj = JSON.parse(data);
            
            helper.CheckParameterValidSocket(client, "UpdateSocket", jsonObj, ['uuid'], () => {
                
                // ✅ ACTUALIZADO: Mantener información del usuario si ya existe
                const existingUser = socket_list['us_' + jsonObj.uuid];
                
                socket_list['us_' + jsonObj.uuid] = { 
                    'socket_id': client.id,
                    'user_type': jsonObj.user_type || existingUser?.user_type || 'Desconocido', // ✅ NUEVO
                    'connected_at': Date.now() // ✅ NUEVO
                };
                
                helper.Dlog(`👤 Socket actualizado para: ${socket_list['us_' + jsonObj.uuid].user_type}`);
                helper.Dlog(socket_list);
                
                client.emit('UpdateSocket', { 
                    'status': '1', 
                    'message': msg_success,
                    'user_type': socket_list['us_' + jsonObj.uuid].user_type // ✅ NUEVO
                });
            });
        });
        
        // ✅ NUEVO: Evento para unirse al tracking familiar
        client.on('join_family_tracking', (data) => {
            try {
                const { uuid, user_type } = JSON.parse(data);
                
                client.join('family_room');
                helper.Dlog(`👨‍👩‍👧‍👦 ${user_type} se unió al tracking familiar (Socket: ${client.id})`);
                
                // Actualizar información del socket
                if (socket_list['us_' + uuid]) {
                    socket_list['us_' + uuid].user_type = user_type;
                }
                
                // Notificar a la familia sobre el nuevo miembro
                client.to('family_room').emit('family_member_joined', {
                    uuid: uuid,
                    user_type: user_type,
                    socket_id: client.id,
                    timestamp: Date.now()
                });
                
                client.emit('join_family_tracking', {
                    'status': '1',
                    'message': `${user_type} conectado al tracking familiar`
                });
                
            } catch (error) {
                helper.Dlog('❌ Error en join_family_tracking: ' + error);
                client.emit('join_family_tracking', {
                    'status': '0',
                    'message': 'Error al unirse al tracking familiar'
                });
            }
        });
        
        // ✅ NUEVO: Manejo de desconexión
        client.on('disconnect', () => {
            helper.Dlog(`🔌 Usuario desconectado: ${client.id}`);
            
            // Buscar y notificar sobre la desconexión
            for (let userKey in socket_list) {
                if (socket_list[userKey].socket_id === client.id) {
                    const userType = socket_list[userKey].user_type;
                    const uuid = userKey.replace('us_', '');
                    
                    helper.Dlog(`👋 ${userType} se desconectó automáticamente`);
                    
                    // Notificar a la familia
                    client.to('family_room').emit('family_member_left', {
                        uuid: uuid,
                        user_type: userType,
                        timestamp: Date.now(),
                        reason: 'disconnect'
                    });
                    
                    break;
                }
            }
        });
        
    });
}