"use strict";

/* Initialize the codestream for communicating with the server  */
var server_name = "codepad.us"
var codestream = new Codestream("ws://" + server_name + ":8081/web-socket");

/* Initialize the 'Codeform' for user input */
var codeform = new Codeform(codestream);

/* Initialize the 'Codeworld' */
var codeworld = new Codeworld(codestream);
codestream.onevent("heartbeat", codeform.updateServerInfo);
codestream.connect();
window.onload = codeform.validateInput;
codestream.setErrorCallback(function() {
	codeworld.hide();
	codeform.show();
	codeform.serverError();
});

codestream.onevent("join_group_response", handleJoinGroupResponse);

function handleJoinGroupResponse(data) {
	if (data.status == "codename_taken") {
		codeform.displayCodenameError("codename taken");
		codeform.disableSubmit();
	} else if (data.status == "codename_invalid") {
		codeform.displayCodenameError("codename invalid");
		codeform.disableSubmit();
	} else if (data.status == "codegroup_invalid") { 
		codeform.displayCodegroupError("codegroup invalid");
		codeform.disableSubmit();
	} else if (data.status == "codegroup_full") { 
		codeform.displayCodegroupError("codegroup is full");
		codeform.disableSubmit();
	} else {
		codeform.hide();
		document.getElementById("codepad-footer").style.display="none";
		codeworld.setCodename(codeform.getCodename());
		codeworld.setCodegroupName(codeform.getCodegroupName());
		codeworld.applyDeltas(data.deltas);
		codeworld.show();
		codeworld.displayCodegroupName();
		data.users.forEach(function(codename) {
			codeworld.addCoder(codename);
		});

		codeform.disableGroupInfoRequest();
	}
};

function htmlEncodeString(raw) {
	return raw.replace(/[\u00A0-\u9999<>\&]/gim, function(str) {
		return '&#' + str.charCodeAt(0) + ';';
	});
}

function sanitize(message) {
	return htmlEncodeString(message.trim());
};




