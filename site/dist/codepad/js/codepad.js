/*********************************************************
 * Represents the text editor area that users can code in.
 *********************************************************/

var Codepad = function(lang, style) {
	var that = this;

	/********* Private Member Variables *********/
	var editor = ace.edit("editor");
	var markerMap = new Map();

	// Initialize the editor
	editor.setTheme("ace/theme/monokai");
	editor.setKeyboardHandler("ace/keyboard/" + style);
	editor.getSession().setMode("ace/mode/" + lang);
	editor.setOptions({
		fontFamily: "monospace",
		fontSize: "12pt"
	});

	/********* Public Methods *********/

	Codepad.prototype.setLanguage = function(lang) {
		var lang_mode;
		if (lang == "C/C++") lang_mode = "c_cpp";
		else if (lang == "Java") lang_mode = "java";
		else if (lang == "Scheme") lang_mode = "scheme";
		else if (lang == "Python") lang_mode = "python";
		else if (lang == "JavaScript") lang_mode = "javascript";
		else lang_mode = "plain_text";
		editor.getSession().setMode("ace/mode/" + lang_mode);
	};	

	Codepad.prototype.setStyle = function(style) {
		var handler;
		if (style == "Emacs") handler = "emacs";
		else if (style == "Vim") handler = "vim";
		editor.setKeyboardHandler("ace/keyboard/" + handler);
	};

	Codepad.prototype.setCodingMarker = function(codename, row) {
		var Range = ace.require('ace/range').Range;
		markerMap.set(codename, editor.session.addMarker(new Range(row, 0, row, 1), "coding-marker", "fullLine"));
	};

	Codepad.prototype.removeCodingMarker = function(codename) {
		editor.session.removeMarker(markerMap.get(codename));
	};

	Codepad.prototype.applyDeltas = function(deltas) {
		editor.getSession().getDocument().applyDeltas(deltas);
	};

	Codepad.prototype.clear = function() {
		editor.setValue("");
	};

	Codepad.prototype.getCode = function() {
		return editor.getValue();
	};

	Codepad.prototype.getEditor = function() {
		return editor;
	};
};