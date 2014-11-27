var website = {};

website.components = {};

(function (publics) {
	"use strict";

	website.components.editAtlas = require('../components/controllers/edit-atlas');
	website.components.socketio = require('../components/controllers/socket-io');
	website.components.mongoose = require('../components/controllers/mongoose');

	publics.loadModules = function (NA) {
		NA.modules.cookie = require('cookie');
		NA.modules.socketio = require('socket.io');
		NA.modules.marked = require('marked');
		NA.modules.mongoose = require('mongoose');
		NA.modules.RedisStore = require('connect-redis');
		NA.modules.rss = require('rss');
		NA.modules.common = require(NA.websitePhysicalPath + NA.webconfig.variationsRelativePath + 'common.json');

		NA.modules.ejs = website.components.editAtlas.setFilters(NA.modules.ejs, NA);

		return NA;
	};

	publics.setConfigurations = function (NA, next) {
		var mongoose = NA.modules.mongoose,
			socketio = NA.modules.socketio;

		website.components.mongoose.initialisation(mongoose, 'mongodb://127.0.0.1:27017/blog', function (mongoose) {

			publics.shemas(mongoose);

			website.components.socketio.initialisation(socketio, NA, function (socketio, NA) {
				website.components.socketio.events(socketio, NA, function (params) {

					website.asynchrones(params);
					require('./article').asynchrones(params);
					require('./login').asynchrones(params);

					next(NA);
				});
			});
		});

	};

	publics.shemas = function (mongoose) {
		publics.shemas = {};

		publics.shemas.article = require('../models/Article');
		publics.shemas.category = require('../models/Category');

		mongoose.model('article', website.shemas.article, 'article');
		mongoose.model('category', website.shemas.category, 'category');
	};

	publics.setSessions = function (NA, callback) {
        var session = NA.modules.session,
        	RedisStore = NA.modules.RedisStore(session);
        
        NA.sessionStore = new RedisStore();

		callback(NA);
	};

	publics.asynchrones = function (params) {
		var socketio = params.socketio,
			NA = params.NA,
			fs = NA.modules.fs;

		socketio.sockets.on('connection', function (socket) {
			var sessionID = socket.request.sessionID,
				session = socket.request.session;

			website.components.editAtlas.sockets(socket, NA, session.account);

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

	publics.preRender = function (params, mainCallback) {
		var variation = params.variation,
			session = params.request.session;

		variation.edit = false;
		variation.fs = false;
		variation.fc = false;
		if (session.account) {
			variation.edit = variation.pageParameters.variation;
			variation.fs = variation.edit;
			variation.fc = variation.webconfig.commonVariation;
		}

		mainCallback(variation);
	};

}(website));



exports.loadModules = website.loadModules;
exports.setSessions = website.setSessions;
exports.setConfigurations = website.setConfigurations;
exports.preRender = website.preRender;