var helper = require('./../helpers/helpers');

module.exports.controller = (app, io, socket_list) => {

    const msg_success = "successfully";
    const msg_fail = "fail";

    const car_location_obj = {};

    app.post('/api/car_join', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;

        helper.CheckParameterValid(res, reqObj, ['uuid', 'lat', 'long', 'degree', 'socket_id'], () => {

            socket_list['us_' + reqObj.uuid] = {
                'socket_id': reqObj.socket_id,
                'user_type': reqObj.user_type || 'Desconocido'
            };

            car_location_obj[reqObj.uuid] = {
                'uuid': reqObj.uuid,
                'lat': reqObj.lat,
                'long': reqObj.long,
                'degree': reqObj.degree,
                'user_type': reqObj.user_type || 'Desconocido',
                'timestamp': Date.now(),
                'last_update': new Date().toISOString()
            };

            io.emit("car_join", {
                "status": "1",
                "payload": car_location_obj[reqObj.uuid]
            });

            helper.Dlog(`👤 ${reqObj.user_type || 'Usuario'} se unió al tracking familiar`);

            res.json({
                "status": "1",
                "payload": {
                    "all_users": car_location_obj,
                    "user_count": Object.keys(car_location_obj).length,
                    "current_user": car_location_obj[reqObj.uuid]
                },
                "message": msg_success
            });

        });
    });

    app.post('/api/car_update_location', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;

        helper.CheckParameterValid(res, reqObj, ['uuid', 'lat', 'long', 'degree', 'socket_id'], () => {

            socket_list['us_' + reqObj.uuid] = {
                'socket_id': reqObj.socket_id,
                'user_type': reqObj.user_type || socket_list['us_' + reqObj.uuid]?.user_type || 'Desconocido'
            };

            if (car_location_obj[reqObj.uuid]) {
                car_location_obj[reqObj.uuid] = {
                    ...car_location_obj[reqObj.uuid],
                    'lat': reqObj.lat,
                    'long': reqObj.long,
                    'degree': reqObj.degree,
                    'user_type': reqObj.user_type || car_location_obj[reqObj.uuid].user_type,
                    'timestamp': Date.now(),
                    'last_update': new Date().toISOString()
                };
            } else {
                car_location_obj[reqObj.uuid] = {
                    'uuid': reqObj.uuid,
                    'lat': reqObj.lat,
                    'long': reqObj.long,
                    'degree': reqObj.degree,
                    'user_type': reqObj.user_type || 'Desconocido',
                    'timestamp': Date.now(),
                    'last_update': new Date().toISOString()
                };
            }

            io.emit("car_update_location", {
                "status": "1",
                "payload": car_location_obj[reqObj.uuid]
            });

            helper.Dlog(`📍 ${car_location_obj[reqObj.uuid].user_type} actualizó ubicación`);

            res.json({
                "status": "1",
                "payload": {
                    "updated_user": car_location_obj[reqObj.uuid],
                    "all_users": car_location_obj
                },
                "message": msg_success
            });

        });
    });

    app.get('/api/family_members', (req, res) => {
        try {
            const familyMembers = Object.values(car_location_obj).map(user => ({
                uuid: user.uuid,
                user_type: user.user_type,
                lat: parseFloat(user.lat),
                long: parseFloat(user.long),
                degree: parseFloat(user.degree),
                last_update: user.last_update,
                is_online: (Date.now() - user.timestamp) < 60000
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

    app.post('/api/car_leave', (req, res) => {
        helper.Dlog(req.body);
        var reqObj = req.body;

        helper.CheckParameterValid(res, reqObj, ['uuid'], () => {

            if (car_location_obj[reqObj.uuid]) {
                const userType = car_location_obj[reqObj.uuid].user_type;

                delete car_location_obj[reqObj.uuid];
                delete socket_list['us_' + reqObj.uuid];

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

    setInterval(() => {
        const now = Date.now();
        const inactiveThreshold = 5 * 60 * 1000;

        for (let uuid in car_location_obj) {
            if (now - car_location_obj[uuid].timestamp > inactiveThreshold) {
                const userType = car_location_obj[uuid].user_type;

                helper.Dlog(`🧹 Limpiando usuario inactivo: ${userType}`);

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
    }, 5 * 60 * 1000);
};
