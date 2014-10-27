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
		NA.modules.RedisStore = require(modulePath + 'connect-redis');
		NA.modules.rss = require(modulePath + 'rss');
		NA.modules.common = require(NA.websitePhysicalPath + NA.webconfig.variationsRelativePath + 'common.json');

		return NA;
	};

}(website));



// Asynchrone
(function (publics) {
	"use strict";

	var privates = {};

	publics.asynchrone = function (params) {
		var io = params.io;

		io.sockets.on('connection', function (socket) {
			var sessionID = socket.handshake.sessionID,
				session = socket.handshake.session;

			socket.on('update-comment-number', function (options) {
				var http = require('http'),
					request;

				request = http.request(options, function (response) {
				    var data = '';

				    response.on('data', function (chunk) {
				        data += chunk;
				    });

				    response.on('end', function () {
				    	var interestingPart = data.match(/\"counts\":\[(.+)\]/g),
				    		json;

				    	if (interestingPart && interestingPart[0]) {
							json = JSON.parse("{" + interestingPart[0] + "}");
				        	socket.emit('update-comment-number', json);
				    	}
				    });
				});

				request.on('error', function (e) {
				    console.log(e.message);
				});

				request.end();
			});

		});
	};

}(website));



// Set configuration for this website.
(function (publics) {
	"use strict";

	var privates = {};

	publics.setSessions = function (NA, callback) {
        var session = NA.modules.session,
        	RedisStore = NA.modules.RedisStore(session);
        
        NA.sessionStore = new RedisStore();

		callback(NA);
	};	

	publics.setConfigurations = function (NA, callback) {
		var mongoose = NA.modules.mongoose,
			socketio = NA.modules.socketio;

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

		io.enable('browser client minification');
		if (NA.webconfig._ioGzip) {
			io.enable('browser client gzip');
		}
		io.set('log level', 1);
		io.enable('browser client cache');
		io.set('browser client expires', 86400000 * 30);
		io.enable('browser client etag');
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
            NA.sessionStore.load(data.sessionID, function (error, session) {
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
		var mongoDbAddress = 'mongodb://127.0.0.1:27017/blog';
		mongoose.connect(mongoDbAddress, function (error) {
  			if (error) {
				console.log("La base '" + mongoDbAddress + "' n'est pas accessible.");
				process.kill(process.pid);
  			};

  			callback(mongoose);
		});
		
		mongoose.connection.on('error', function (error) {
	  		console.log('Erreur pour la connexion par défaut à Mongoose: ' + error);
		});

		mongoose.connection.on('disconnected', function () {
			console.log('Connexion par défaut à Mongoose déconnectée.');
		});

		process.on('SIGINT', function (error) {
			mongoose.connection.close(function () {
				console.log('Connexion par défaut à Mongoose déconnectée en raison de l\'arrêt de l\'app termination');
				process.exit(0);
			});
		});
	};

	privates.socketIoEvents = function (io, NA) {
		var params = {};

		params.io = io;
		params.NA = NA;

		website.asynchrone(params);
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
exports.setSessions = website.setSessions;
exports.setConfigurations = website.setConfigurations;
exports.preRender = website.preRender;
exports.render = website.render;