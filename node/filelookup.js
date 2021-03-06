/**
 * module filelookup
 * @author: Christophe Parisse
 */

var fs = require("fs");
var path = require("path");
var mime = require("mime");
// var trash = require('trash');
var os = require('os');
/*
var version = require("../editor/version.js");
var codefn = require('../editor/codefn.js');
*/
var filelookup = exports;

filelookup.DOMAIN_DEFAULT = '/Users';
filelookup.domain = '/';

filelookup.init = function(domain) {
	if (domain === undefined)
		filelookup.root = '/';
	else
		filelookup.root = domain;	// default value for localhost systems - different for distant servers
};

/**
 * the variables are used to store the default path and top domain for a user
 * dirUp and dirReload are special names used to distinguish the special actions mode up in the file system and reload
 */
var dirUp = '*Up*';
var dirReload = '*Reload*';
var dirHome = '*Home*';
var dirDevice = '*Device*';

filelookup.shortAudioWav = '-shortaudiotrjs.wav';
filelookup.shortAudioRaw = '-shortaudiotrjs.raw';

var normalizeslash = function(fn) {
	fn = fn.replace(/\\/g, '/');
    if (filelookup.testSystem() !== 'linux')
        return fn.toLowerCase();
    else
        return fn;
};

/**
 * adds a slash to a filename if there is not one
 * @method addslash
 * @param {string} filename
 * @returns {string} newname
 */
filelookup.addslash = function(pt) {
	return (pt != '/' && pt.substr(1) != ':/') ? pt + '/' : pt;
};

filelookup.setroot = function(fn) {
	filelookup.root = fn;
};

filelookup.process = function(req, res, url_parsed) {
/*
displayfiles_get_node
displayfiles_delete_node
displayfiles_create_node
displayfiles_rename_node
displayfiles_move_node
displayfiles_copy_node
displayfiles_get_content
*/
	if (version.debug(__filename)) console.log( 'filelookup GET ' );
    if (version.debug(__filename)) console.log('get(all url): ' + JSON.stringify(url_parsed) );
	if (url_parsed.query.operation === 'get_node') {
		filelookup.get_node(req, res, url_parsed);
	} else if (url_parsed.query.operation === 'get_folder') {
		filelookup.get_folder(req, res, url_parsed);
	} else if (url_parsed.query.operation === 'get_content') {
		filelookup.get_content(req, res, url_parsed);
	} else if (url_parsed.query.operation === 'rename_node') {
		filelookup.rename_node(req, res, url_parsed);
	} else if (url_parsed.query.operation === 'delete_node') {
		filelookup.delete_node(req, res, url_parsed);
	} else if (url_parsed.query.operation === 'move_node') {
		filelookup.move_node(req, res, url_parsed);
	} else if (url_parsed.query.operation === 'copy_node') {
		filelookup.copy_node(req, res, url_parsed);
	} else if (url_parsed.query.operation === 'create_node') {
		filelookup.create_node(req, res, url_parsed);
	} else {
		console.log('not yet implemented : GET : ' + url_parsed.query.operation);
		res.writeHeader(200, {"Content-Type": "application/json"});
		res.write(JSON.stringify({}));
		res.end();
	}
};

/**
 * find the list of valid devices for windows (a z letters)
 * @method testDevices
 * @return {array-of-string} list of devices
 */
filelookup.testDevices = function() {
	var devs = new Array();
	var letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
	for (var v in letters) {
		if ( fs.existsSync( letters[v] + ':') )
			devs.push( letters[v] + ':/' );
	}
	return devs;
};

/**
 * find user home folder
 * @method getUserHome
 * @return {string} path to folder
 */
filelookup.getUserHome = function() {
	if (version.location === 'distant') return version.home;
	// console.log(process.env);
	return process.env.USERPROFILE || process.env.HOME || process.env.HOMEPATH;
};

/**
 * find the name of system : windows or macosx or linux
 * @method testSystem
 * @return {string} name of system
 */
filelookup.testSystem = function() {
	if (os.platform() === 'darwin')
		return 'macosx';
	else if (os.platform() === 'win32')
		return 'windows';
	else
		return 'linux';
};

/**
 * find the name of system : windows or macosx or linux
 * @method testSystem
 * @return {string} name of system
 */
filelookup.testArch = function() {
	if (os.arch() === 'x64')
		return '64bits';
	else
		return '32bits';
};

/*
var addAllFolders = function(dir, cts) {
	var contents = fs.readdirSync(dir);
	contents.forEach( function(f) {
		if (f.indexOf('.') === 0) return;
		if (f.indexOf('$') === 0) return;
		if (version.debug(__filename)) console.log("format de mes fichiers " + f);
		try {
			var fulln = path.normalize(dir + path.sep + f);
			// console.log(fulln.toString() + ' 1 ' + stat.toString() + ' 2 ' + fn + ' 3 ' + f);
//			var stat = fs.statSync( path.join(dir, f) );
			var stat = fs.statSync( fulln );
			if (stat.isDirectory()) {
				cts.push( { icon : "folder", id : fulln, label : f, type: "folder", } );
			}
		} catch (error) {
			console.log('error ' + error + ' listing: ' + fulln);
		}
	});
};
*/

var get_node_root = function(req, res, url_parsed) {
	if (version.debug(__filename)) console.log("get_node: " + url_parsed.query.id + '\n');
//	var name = codefn.decodeRawFilename(url_parsed.query.id);
	var name = url_parsed.query.id;
	if (version.debug(__filename)) console.log(JSON.stringify(url_parsed.query));
	if (version.debug(__filename)) console.log('Name: '+name);

	/*
	 * Specific treatement for the root of all systems
	 * find the user path, the documents, the desktop and the devices
	 */
		res.writeHeader(200, {"Content-Type": "application/json"});
		var t = [];
		var c;
		/*
		 * add pointer to home
		 */
		var home = filelookup.getUserHome();
		t.push(	{ label: 'Home', id: normalizeslash(home), type: "home", } );
//		c = t[t.length-1].children;
//		addAllFolders(home, c);
		/*
		 * add pointer to desktop
		 */
		var desktop = home + path.sep + 'Desktop';
		t.push(	{ label: 'Desktop', id: normalizeslash(desktop), type: "desktop", } );
		/*
		 * add pointer to documents
		 */
		var documents = home + path.sep + 'Documents';
		t.push(	{ label: 'Documents', id: normalizeslash(documents), type: "documents", } );
		/*
		 * add pointer to volumes
		 */
		var ts = filelookup.testSystem();
		if (ts  === 'windows') {
			// if this windows, find all the devices
			var devs = filelookup.testDevices();
			if (version.debug(__filename)) console.log( devs );
			for (var d in devs) {
				if (version.debug(__filename)) console.log( devs[d] );
				t.push( { id : normalizeslash(devs[d]), label : devs[d], type: "volume", } );
			}
		} else if (ts === 'macosx') {
			t.push( { label: 'Ordinateur', id: filelookup.root, type: "computer", } );
			var volumes = fs.readdirSync('/Volumes');
			for (var v in volumes) {
				if (volumes[v] === '.') continue;
				if (volumes[v] === '..') continue;
				try {
					var fulln = path.normalize('/Volumes' + path.sep + volumes[v]);
					var stat = fs.statSync( fulln );
					if (stat.isDirectory())
						t.push( { label: volumes[v], id: '/Volumes/' + volumes[v], type: "volume", } );
				} catch (e) {
					;
				}
			}
		} else if (ts === 'linux') {
            t = [];
			t.push( { label: 'Ordinateur', id: filelookup.root, type: "computer", } );
		}
		if (version.debug(__filename)) console.log("send to html: " + JSON.stringify(t) + '\n');
		res.write(JSON.stringify(t));
	    res.end();
		return;
};

filelookup.get_node = function(req, res, url_parsed) {
	if (version.debug(__filename)) console.log("get_node: " + url_parsed.query.id + '\n');
	var name = url_parsed.query.id;
	if (version.debug(__filename)) console.log(JSON.stringify(url_parsed.query));
	if (version.debug(__filename)) console.log('Name: '+name);

	if (name === '#' && version.location === 'local') {
		get_node_root(req, res, url_parsed);
		return;
	}

	try {
		var fn;
		if (/^[A-Za-z]:/.test(name))
			fn = name;
		else if (name.indexOf(path.sep) !== 0)
			fn = filelookup.root + name;
		else
			fn = name;
		var norm = path.normalize(fn);
		var dir = fs.realpathSync(norm);
		if (version.debug(__filename)) console.log('DIR: ' + dir);
		var statdir = fs.statSync(dir);
		if (statdir.isFile()) {
			res.writeHeader(200, {"Content-Type": "application/json"});
			var t = [
				{ id: dir, label: dir, },
			];
			if (version.debug(__filename)) console.log("direct send to html: " + JSON.stringify(t) + '\n');
			res.write(JSON.stringify(t));
		    res.end();
		} else if (statdir.isDirectory()) {
			var contents = fs.readdirSync(dir);
			res.writeHeader(200, {"Content-Type": "application/json"});
			// find all files in the current directory
			var t = [];
			contents.forEach( function(f) {
				if (f.indexOf('.') === 0) return;
				if (f.indexOf('$') === 0) return;
				if (version.debug(__filename)) console.log("format de mes fichiers " + f);
				// if (f.indexOf(exports.shortAudioWav) != -1) return;
				// if (f.indexOf(exports.shortAudioRaw) != -1) return;
				try {
					var fulln = path.join(dir, f);
					var stat = fs.statSync(fulln);
					fulln = path.normalize(fulln);
					if (stat.isDirectory()) {
						t.push( { icon : "folder", id : normalizeslash(fulln), label : f, type: "folder", } );
					}
				} catch (error) {
					console.log('error ' + error + ' listing: ' + fulln);
				}
			});
			if (version.debug(__filename)) console.log("send to html: " + JSON.stringify(t) + '\n');
			res.write(JSON.stringify(t));
		    res.end();
		}
	} catch (error) {
		console.log('get_node for ' + name + ' :-: ' + error);
		url_parsed.query.id = '#';
		// url_parsed.query
		get_node_root(req, res, url_parsed);
	}
};

filelookup.get_folder = function(req, res, url_parsed) {
	if (version.debug(__filename)) console.log("get_folder: " + url_parsed.query.id + '\n');
//	var name = codefn.decodeRawFilename(url_parsed.query.id);
	var name = url_parsed.query.id;
	var fn;
	if (name === '#')
		fn = filelookup.root;
	else if (/^[A-Za-z]:/.test(name))
		fn = name;
	else if (name.indexOf(path.sep) !== 0)
		fn = filelookup.root + name;
	else
		fn = name;
	if (version.debug(__filename)) console.log('GET FOLDER' + JSON.stringify(url_parsed.query));
	if (version.debug(__filename)) console.log('Name: '+name);
/*
	if ( name.indexOf(":") >= 0 ) {
			// var id = array_map(array($this, 'id'), explode(':', $id));
			var t = { type: 'multiple', content: 'Multiple selected: ' . name };
	}
*/
	try {
		var norm = path.normalize(fn);
		var dir = fs.realpathSync(norm);
		var statdir = fs.statSync(dir);
		if (statdir.isDirectory()) {
			var contents = fs.readdirSync(dir);
			res.writeHeader(200, {"Content-Type": "application/json"});
			var t = [];
			contents.forEach( function(f) {
				if (f.indexOf('.') === 0) return;
				if (f.indexOf('..') === 0) return;
				if (version.debug(__filename)) console.log("format de mes fichiers " + f);
				// if (f.indexOf(exports.shortAudioWav) != -1) return;
				// if (f.indexOf(exports.shortAudioRaw) != -1) return;
				try {
					var fulln = path.join(dir, f);
					var stat = fs.statSync( fulln );
					// var fulln = dir.lastIndexOf(path.sep) === (dir.length-1) ? f : dir + path.sep + f;
					fulln = path.normalize(fulln);
					if (stat.isFile()) {
						if (version.debug(__filename)) console.log("ajoute " + fulln);
						t.push( fulln );
					}
				} catch (error) {
					console.log('error ' + error + ' listing: ' + fulln);
				}
			});
			if (version.debug(__filename)) console.log(JSON.stringify(t) + '\n');
			res.write(JSON.stringify(t));
		    res.end();
		}
	} catch (error) {
		console.log('get_folder:' + error);
		res.writeHeader(200, {"Content-Type": "application/json"});
		res.write(JSON.stringify({ id:'cannot process folder', children: false, text:'error', icon:'error' }));
	    res.end();
		return;
	}
};

/*
 * additional elements not used yet
 */

/*
filelookup.get_content = function(req, res, url_parsed) {
	var name = codefn.decodeRawFilename(url_parsed.query.id);
	var fn;
	if (name === '#')
		fn = filelookup.root;
	else if (/^[A-Za-z]:/.test(name))
		fn = name;
	else if (name.indexOf(path.sep) !== 0)
		fn = filelookup.root + name;
	else
		fn = name;
	if (version.debug(__filename)) console.log('GET CONTENT' + JSON.stringify(url_parsed.query));
	if (version.debug(__filename)) console.log('Name: '+name);
//
	// if ( name.indexOf(":") >= 0 ) {
			// // var id = array_map(array($this, 'id'), explode(':', $id));
			// var t = { type: 'multiple', content: 'Multiple selected: ' . name };
	// }
//
	try {
		var norm = path.normalize(fn);
		var dir = fs.realpathSync(norm);
		var statdir = fs.statSync(dir);
		if (statdir.isFile()) {
			res.writeHeader(200, {"Content-Type": "application/json"});
            if (filelookup.testSystem() !== 'linux')
    			var ext = path.extname(dir).toLowerCase().substr(1);
            else
    			var ext = path.extname(dir).substr(1);
			var t = { type: ext, content: ''};
			t.name = dir;
			switch(ext) {
				case 'txt':
				case 'text':
				case 'md':
				case 'js':
				case 'json':
				case 'css':
				case 'html':
				case 'teiml':
				case 'htm':
				case 'xml':
				case 'c':
				case 'cpp':
				case 'h':
				case 'sql':
				case 'log':
				case 'py':
				case 'rb':
				case 'htaccess':
				case 'php':
				case 'sh':
					t.content = fs.readFileSync(dir).toString();
					break;
				case 'jpg':
				case 'jpeg':
				case 'gif':
				case 'png':
				case 'bmp':
					var s = new Buffer(fs.readFileSync(dir)).toString('base64');
		     		var mimetypeauto = mime.lookup(dir);
					// console.log(mimetypeauto);
					res.writeHeader(200, {"Content-Type": "application/json"});
					t.content = 'data:' + mimetypeauto + ';base64,' + s;
					// if (version.debug(__filename)) console.log(JSON.stringify(t) + '\n');
					res.write(JSON.stringify(t));
				    res.end();
					break;
				default:
					res.writeHeader(200, {"Content-Type": "application/json"});
					t.content = 'File not recognized: ' + dir;
					if (version.debug(__filename)) console.log(JSON.stringify(t) + '\n');
					res.write(JSON.stringify(t));
				    res.end();
					break;
			}
			// if (version.debug(__filename)) console.log(JSON.stringify(t) + '\n');
			res.write(JSON.stringify(t));
		    res.end();
		} else if (statdir.isDirectory()) {
			res.writeHeader(200, {"Content-Type": "application/json"});
			var t = {
				type : "folder",
				content: name,
			};
			if (version.debug(__filename)) console.log(JSON.stringify(t) + '\n');
			res.write(JSON.stringify(t));
		    res.end();
		}
	} catch (error) {
		console.log('get_content:' + error);
		res.writeHeader(200, {"Content-Type": "application/json"});
		res.write(JSON.stringify({ id:'cannot process file', children: false, text:'error', icon:'error' }));
	    res.end();
		return;
	}
};
*/
