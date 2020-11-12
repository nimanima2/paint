
/****************************************************************
 * Represents the codechat area. Capable of sending and receving
 * chat messages using the codestream.
 ****************************************************************/

var Codechat = function(codestream) {
	var that = this;

	/********* Public Member Variables *********/
	this.onmessagecomposed = function () {};

	/********* Private Member Variables *********/
	var typingTimer;

	/********* Chat DOM Elements *********/
	var codestream = codestream;
	var chat_box = document.getElementById("chat-box");
	var typing_status = document.getElementById("typing-status");
	var composition = document.getElementById("message-composition");
	var send_button = document.getElementById("send-button");

	/********* Chat Event Listeners *********/
	codestream.onevent("chat_message", function(data) { 
		that.postOther(data.codename, data.message);
	});
	codestream.onevent("typing_status", function(data) {
		updateTypingStatus(data.codename, data.status);
	});
	codestream.onevent("user_joined", function(data) {
		that.update(data.codename + " joined.");
	});
	codestream.onevent("user_left", function(data) {
		that.update(data.codename + " left.");
	});

	composition.onkeydown = function(e) {
		if (typingTimer != null) {
			clearTimeout(typingTimer);
		} else {
			codestream.notifyTypingStatus(1);
		}

		typingTimer = setTimeout(function() {
			codestream.notifyTypingStatus(0);
			typingTimer = null;
		}, 500);
		
		var message = composition.value.trim();
		if (e.keyCode == 13 && message != "") {
			that.onmessagecomposed(message);
		}
		return e.keyCode != 13;
	};

	send_button.onclick = function(e) {
		var message = composition.value.trim();
		if (message != "") {
			that.onmessagecomposed(message);
		}
	};

	/********* Public Methods *********/

	Codechat.prototype.update = function(upd) {
		chat_box.innerHTML += "<div class='chat-update'>" + sanitize(upd) + "</div>";
	};

	Codechat.prototype.postSelf = function(codename, msg) {
		chat_box.innerHTML += "<b style='color:green'>" + sanitize(codename) +
		  "</b>: " + sanitize(msg) + "<br />";
		chat_box.scrollTop = chat_box.scrollHeight;
	};

	Codechat.prototype.postOther = function(codename, msg) {
		chat_box.innerHTML += "<b>" + sanitize(codename) +
		  "</b>: " + sanitize(msg) + "<br />";
		chat_box.scrollTop = chat_box.scrollHeight;

	};

	Codechat.prototype.send = function(codename, codegroup, msg) {
		var data = {
			codename: codename,
			codegroup: codegroup,
			message: msg
		};
		codestream.send("chat_message", data);
		that.postSelf(codename, msg);
		composition.value = "";
		clearTimeout(typingTimer);
		typingTimer = null;
		codestream.notifyTypingStatus(0);
	};

	/********* Private Methods *********/

	function updateTypingStatus(codename, status) {
		if (status == 1) {
			typing_status.innerHTML = sanitize(codename) + " is typing...";
		} else {
			typing_status.innerHTML = "&nbsp;";
		}
	};
};