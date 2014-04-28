var website = {};

// Loading modules for this website.
(function (publics) {
	"use strict";

	publics.loadModules = function (NA) {
		var modulePath = (NA.webconfig._needModulePath) ? NA.nodeModulesPath : '';
		
		NA.modules.cookie = require(modulePath + 'cookie');
		NA.modules.connect = require(modulePath + 'connect');
		NA.modules.marked = require(modulePath + 'marked');
		NA.modules.mongoose = require(modulePath + 'mongoose');
		NA.modules.socketio = require(modulePath + 'socket.io');

		return NA;
	};

}(website));

// Set configuration for this website.
(function (publics) {
	"use strict";

	var privates = {};

	publics.setConfigurations = function (NA, callback) {
		var mongoose = NA.modules.mongoose,
			socketio = NA.modules.socketio,
			connect = NA.modules.connect;

		privates.mongooseInitialization(mongoose, function (mongoose) {

			privates.mongooseShemas(mongoose);

			privates.socketIoInitialisation(socketio, NA, function (io) {

				privates.socketIoEvents(io, NA);

				callback(NA);					
			});
		});

	};			

	privates.socketIoInitialisation = function (socketio, NA, callback) {
		var io = socketio.listen(NA.server),
			connect = NA.modules.connect,
			cookie = NA.modules.cookie;

		io.set('authorization', function (data, accept) {

            // No cookie enable.
            if (!data.headers.cookie) {
                return accept('Session cookie required.', false);
            }

            // First parse the cookies into a half-formed object.
            data.cookie = cookie.parse(data.headers.cookie);

            // Next, verify the signature of the session cookie.
            data.cookie = connect.utils.parseSignedCookies(data.cookie, NA.webconfig.session.secret);
             
            // save ourselves a copy of the sessionID.
            data.sessionID = data.cookie[NA.webconfig.session.key];

			// Accept cookie.
            NA.webconfig.session.sessionStore.load(data.sessionID, function (error, session) {
                if (error || !session) {
                    accept("Error", false);
                } else {
                    data.session = session;
                    accept(null, true);
                }
            });

        });

    	callback(io);		
	};

	privates.mongooseInitialization = function (mongoose, callback) {
		mongoose.connect('mongodb://127.0.0.1:27017/blog', function (error) {
  			if (error) {
				throw error;
  			};

  			callback(mongoose);
		});
		
		mongoose.connection.on('error', function (error) {
	  		console.log('Mongoose default connection error: ' + error);
		});

		mongoose.connection.on('disconnected', function () {
			console.log('Mongoose default connection disconnected');
		});

		process.on('SIGINT', function (error) {
			mongoose.connection.close(function () {
				console.log('Mongoose default connection disconnected through app termination');
				process.exit(0);
			});
		});
	};

	privates.socketIoEvents = function (io, NA) {
		var params = {};

		params.io = io;
		params.NA = NA;

		require('./article').asynchrone(params);
		require('./login').asynchrone(params);
	};

	privates.mongooseShemas = function (mongoose) {
		publics.shemas = {};

		publics.shemas.article = require('../models/Article');
		publics.shemas.category = require('../models/Category');

		mongoose.model('article', website.shemas.article, 'article');
		mongoose.model('category', website.shemas.category, 'category');
	};

}(website));

// PreRender
(function (publics) {
	"use strict";

	publics.preRender = function (params, mainCallback) {
		var variation = params.variation;

		// Ici on modifie les variables de variations.
		//console.log(params.variation);

		mainCallback(variation);
	};

}(website));

// Render
(function (publics) {
	"use strict";

	publics.render = function (params, mainCallback) {
		var data = params.data;

		// Ici on peut manipuler le DOM côté serveur avant retour client.
		//console.log(params.data);

		mainCallback(data);
	};

}(website));

exports.loadModules = website.loadModules;
exports.setConfigurations = website.setConfigurations;
exports.preRender = website.preRender;
exports.render = website.render;