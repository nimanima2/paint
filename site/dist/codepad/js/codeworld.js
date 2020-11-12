/******************************************************************
 * Represents the the collaboritive enviroment that users see after
 * joining a group.
 ******************************************************************/

var Codeworld = function(codestream) {
	var that = this;

	/********* Private Member Variables *********/
	var codename;
	var codegroup_name;
	var codegroup = new Set();
	var activeTimers = new Map();
	var codestream = codestream;
	var codepad = new Codepad("c_cpp", "emacs");
	var codechat = new Codechat(codestream);
	var last_delta_time;
	var coder_list = document.getElementById("coderlist");

	/********* Event Listeners for the Codeworld *********/
	document.getElementById("reset-button").onclick = function() {codepad.clear()};
	document.getElementById("style-control").onchange = function() {
		codepad.setStyle(document.getElementById("style-control").value);
	};
	document.getElementById("lang-control").onchange = function() {
		var lang = document.getElementById("lang-control").value;
		codestream.send("lang_change", {
			codename: codename,
			codegroup: codegroup_name, 
			lang: lang
		});
		codepad.setLanguage(lang);
	};
	codepad.getEditor().on("change", function(e) {codestream.notifyDelta(e);});
	codestream.onevent("code_delta",  function(data) {that.applyCodeDelta(data);});
	codestream.onevent("user_joined", function(data) {that.addCoder(data.codename);});
	codestream.onevent("user_left", function(data) {that.removeCoder(data.codename);});
	codestream.onevent("lang_change", function(data) {
		codechat.update(data.codename + " changed the language to " + data.lang + ".");
		document.getElementById("lang-control").value = data.lang;
		codepad.setLanguage(data.lang);
	});
	codechat.onmessagecomposed = function(message) {codechat.send(codename, codegroup_name, message);};

	/********* Public Methods *********/

	Codeworld.prototype.show = function() {
		document.getElementById("codeworld").style.display = "block";
	};

	Codeworld.prototype.hide = function() {
		document.getElementById("codeworld").style.display = "none";
	};

	Codeworld.prototype.addCoder = function(codename) {
    	codegroup.add(codename);
    	that.addToCoderList(codename);
	};

	Codeworld.prototype.removeCoder = function(codename) {
    	codegroup.delete(codename);
    	that.removeFromCoderList(codename);
	};

	Codeworld.prototype.displayCodegroupName = function() {
		document.getElementById("codegroup-header").innerHTML = sanitize(codegroup_name);
	};

	Codeworld.prototype.applyCodeDelta = function(data) {
		var delta = data.delta;
    	codestream.appliedDeltas = true;
    	codepad.applyDeltas([delta]);

    	var currentTimer = activeTimers.get(data.codename);
    	if (currentTimer !=  null) {
    		clearTimeout(currentTimer);
    		codepad.removeCodingMarker(data.codename);
    	} else {
    		document.getElementById(data.codename).style.backgroundColor = "#80e5ff";
    	}

    	codepad.setCodingMarker(data.codename, delta.end.row);

    	activeTimers.set(data.codename, setTimeout(function() {
    		document.getElementById(data.codename).style.backgroundColor = "";
    		activeTimers.delete(data.codename);
    		codepad.removeCodingMarker(data.codename);
    	}, 500));
	};

	Codeworld.prototype.applyDeltas = function(deltas) {
    	for (var i = 0; i < deltas.length; ++i) {
    		codestream.appliedDeltas = true;	// Make sure the 'change' event doesn't get processed
    		codepad.getEditor().getSession().getDocument().applyDeltas([deltas[i]]);
    	}
	};

	Codeworld.prototype.addToCoderList = function(codename) {
		coder_list.innerHTML += "<span id='" + sanitize(codename) + 
			"' class='well well-sm codetag'>" + sanitize(codename) + "</span> ";
	};

	Codeworld.prototype.removeFromCoderList = function(codename) {
		coder_list.removeChild(document.getElementById(codename));
	};

	Codeworld.prototype.setCodename = function(name) {
		codename = name; 
	};

	Codeworld.prototype.setCodegroupName = function(name) {
		codegroup_name = name;
	};

	Codeworld.prototype.setCodestream = function(stream) {
		codestream = stream;
	};

	Codeworld.prototype.setCodepad = function(cp) {
		codepad = cp;
	};

	Codeworld.prototype.getCodestream = function(stream) {
		return codestream;
	};

	Codeworld.prototype.getCodepad = function(stream) {
		return codepad;
	};

	Codeworld.prototype.getCodename = function(name) {
		return codename;
	};

	Codeworld.prototype.getCodegroupName = function(name) {
		return codegroup_name;
	};
};