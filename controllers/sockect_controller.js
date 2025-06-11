var helper = require('./../helpers/helpers');

module.exports.controller = (app, io, socket_list) => {

    const msg_success = "successfully";
    const msg_fail = "fail";
    const FAMILY_ROOM = 'family_room';

    io.on('connection', (client) => {

        helper.Dlog(`🔌 Nueva conexión: ${client.id}`);

        client.on('UpdateSocket', (data) => {
            helper.Dlog("UpdateSocket :- " + data);

            let jsonObj;
            try {
                jsonObj = JSON.parse(data);
            } catch (err) {
                helper.Dlog('❌ JSON inválido en UpdateSocket');
                client.emit('UpdateSocket', { status: '0', message: 'JSON inválido' });
                return;
            }

            helper.CheckParameterValidSocket(client, "UpdateSocket", jsonObj, ['uuid'], () => {

                const existingUser = socket_list['us_' + jsonObj.uuid];

                socket_list['us_' + jsonObj.uuid] = {
                    'socket_id': client.id,
                    'user_type': jsonObj.user_type || existingUser?.user_type || 'Desconocido',
                    'connected_at': Date.now()
                };

                helper.Dlog(`👤 Socket actualizado para: ${socket_list['us_' + jsonObj.uuid].user_type}`);
                helper.Dlog(socket_list);

                client.emit('UpdateSocket', {
                    'status': '1',
                    'message': msg_success,
                    'user_type': socket_list['us_' + jsonObj.uuid].user_type
                });
            });
        });

        client.on('join_family_tracking', (data) => {
            try {
                const { uuid, user_type } = JSON.parse(data);

                client.join(FAMILY_ROOM);
                helper.Dlog(`👨‍👩‍👧‍👦 ${user_type} se unió al tracking familiar (Socket: ${client.id})`);

                if (socket_list['us_' + uuid]) {
                    socket_list['us_' + uuid].user_type = user_type;
                }

                // Emitir a todos menos al que se unió
                client.to(FAMILY_ROOM).emit('family_member_joined', {
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

        client.on('disconnect', () => {
            helper.Dlog(`🔌 Usuario desconectado: ${client.id}`);

            // Buscar usuario en socket_list y eliminarlo
            for (let userKey in socket_list) {
                if (socket_list[userKey].socket_id === client.id) {
                    const userType = socket_list[userKey].user_type;
                    const uuid = userKey.replace('us_', '');

                    helper.Dlog(`👋 ${userType} se desconectó automáticamente`);

                    // Eliminar usuario
                    delete socket_list[userKey];

                    // Emitir notificación a la sala usando io.to()
                    io.to(FAMILY_ROOM).emit('family_member_left', {
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
};
