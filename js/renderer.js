// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

var fonts = [
    'Arial, Helvetica, sans-serif',
    '"Arial Black", Gadget, sans-serif',
    '"Comic Sans MS", cursive, sans-serif',
    'Impact, Charcoal, sans-serif',
    '"Lucida Sans Unicode", "Lucida Grande", sans-serif',
    'Tahoma, Geneva, sans-serif',
    '"Trebuchet MS", Helvetica, sans-serif',
    'Verdana, Geneva, sans-serif',
    'Georgia, serif',
    '"Times New Roman", Times, serif',
    '"Courier New", Courier, monospace',
    '"Lucida Console", Monaco, monospace'
];

const {BrowserWindow} = require('electron').remote;
const {ipcRenderer} = require('electron');

function Prompter(fresh) {

    $.extend(this,this.defaults);
    if (localStorage.prompter) {
	try {
	    $.extend(this,JSON.parse(localStorage.prompter));
	} catch (err) { }
    }
    if (fresh) {
	this.autosave();
	$.extend(this,this.defaults);
    }

    this.el = $("#content");

    this.isScrolling = false;

    $(document).mousewheel((function(e,delta){
	if (this.isScrolling) {
	    console.log(delta);
	    this.speed += (delta+(delta>0?1:-1))/2;
	    this.checkSpeed();
	    e.preventDefault();
	}
    }).bind(this));

    $("#size-plus").click(this.changeFontSize.bind(this,"+"));
    $("#size-minus").click(this.changeFontSize.bind(this,"-"));
    $("#invert-color").click(this.setColor.bind(this,true));

    $("#font").change(this.changeFont.bind(this));
    for (i=0;i<fonts.length;i++) {
	$("<option>").val(fonts[i]).text(fonts[i].split(",")[0].replace(/"/g,""))
	    .appendTo("#font"); }
    
    document.addEventListener("webkitfullscreenchange",this.fullscreenChange.bind(this));
    $("#start").click((function() {
	this.playing = false;
	this.warn("Press &lt;Esc&gt; to stop prompting.");
	//BrowserWindow.getFocusedWindow().setFullScreen(true);
	this.root.get(0).webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }).bind(this));

    this.init();
    
    $(document).keydown(this.handleKey.bind(this));
    this.moveTextInterval = setInterval(this.scrollText.bind(this),1);

    /*rangy.init();
    resetApplier = rangy.createCssClassApplier("reset-formatting",
					       {normalize: true,
						applyToEditableOnly: true});
    boldApplier = rangy.createCssClassApplier("bold",
					      {normalize: true,
					       applyToEditableOnly: true});
    italicApplier = rangy.createCssClassApplier("italic",
						{normalize: true,
						 applyToEditableOnly: true});
    underlineApplier = rangy.createCssClassApplier("underline",
						   {normalize: true,
						    applyToEditableOnly: true});
    $("#bold").click( function(e){
	resetApplier.applyToSelection();
	boldApplier.toggleSelection();
    });
    $("#italic").click( function(e){
	resetApplier.applyToSelection();
	italicApplier.toggleSelection();
    });
    $("#underline").click( function(e){
	resetApplier.applyToSelection();
	underlineApplier.toggleSelection();
    });*/

    function clearFormatting() {
	$("#content [style]").removeAttr("style"); }
    setInterval(clearFormatting,400);

    function loadAutosave(e) {
	var prompter = $(this).parents("tbody").data("prompter");
	prompter.save();
	prompter.init(self.defaults);
	prompter.init(JSON.parse(localStorage.prompterAutosaves)[
	    $(this).parents("tr").data("timestamp")],true);
	$("#save-name").val("");
	$(this).parents(".ui-dialog-content").dialog("close");
    }
    window.onbeforeunload = (function() {
	this.save();
	if (this.isScrolling) {
	    return "Are you sure you want to leave the teleprompter? Your work will be saved when you return."; }
    }).bind(this);

};

Prompter.prototype = {
    init: function(obj,nosave) {
	if (obj) {
	    if (!nosave) { this.autosave(); }
	    $.extend(this,obj);
	}
	this.el.html(this.text);
	$("#minimum-speed").val(this.minimumSpeed);
	this.setColor();
	this.changeFontSize();
	this.changeFont();
	setClean();
    },
    autosave: function() {
	var autosaves;
	try {
	    autosaves = JSON.parse(localStorage.prompterAutosaves);
	} catch (e) {
	    autosaves = {};
	}
	if (autosaves.length) {
	    autosaves = {};
	}
	try {
	    autosaves[new Date().getTime()] = JSON.parse(localStorage.prompter);
	} catch (e) { }
	localStorage.prompterAutosaves = JSON.stringify(autosaves);
    },
    fullscreenChange: function(e) {
	this.isScrolling = document.webkitIsFullScreen;
	this.el.prop("contentEditable",!this.isScrolling);
	$(document.body).css("overflow-y",this.isScrolling?"hidden":"auto");
	this.root.css("cursor",(this.isScrolling&&!this.root.hasClass("preview"))?
		      "url(cursor.png), crosshair":"text");
	this.el.css({
	    "userSelect": this.isScrolling?"none":"",
	});
    },
    setColor: function(change) {
	if (change) {
	    this.invert = !this.invert;
	}
	this.el.css("color",this.invert?"white":"black");
	this.root.css("background-color",this.invert?"black":"white");
	this.save();
	setDirty();
    },
    changeFontSize: function(sign,e) {
	this.el.css("fontSize",sign?sign+"=4":this.fontSize);
	this.fontSize = this.el.css("fontSize");
	this.save();
	setDirty();
    },
    changeFont: function(e) {
	if (!e) {
	    $("#font").val(this.font); }
	this.el.css("fontFamily",$("#font").val())
	this.font = $("#font").val();
	this.save();
	setDirty();
    },

    checkSpeed: function() {
	this.speed = Math.floor(this.speed);
	negative = (this.speed<0)?true:false;
	if (Math.abs(this.speed) > this.maximumSpeed-0.5) {
	    this.speed = this.maximumSpeed*(negative?-1:1);
	}
	var oldspeed = this.speed;
	if (Math.abs(this.speed) < this.minimumSpeed && this.speed !== 0) {
	    if (Math.abs(this.speed) <= 1) {
		this.speed = this.minimumSpeed*(negative?-1:1);
	    } else {
		this.speed = 0;
	    }
	}
	console.log(oldspeed,this.speed);
	this.save();
    },
    save: function() {
	this.text = this.el.html();
	localStorage.prompter = JSON.stringify(this,[
	    "font","fontSize","invert","text",
	    "minimumSpeed","maximumSpeed"
	]);
	return JSON.stringify(this,["font","fontSize","invert","text"]);
    },
    warn: function(msg,timeout) {
	if (!timeout) { timeout = 2000; }
	$("#warning").stop(true,true).html(msg).fadeIn(200).delay(timeout).fadeOut(500);
    },
    handleKey: function(e) {
	if (e.which == 9) {
	    e.preventDefault();
	    $("#content").blur();
	    return false;
	}
	if (document.activeElement == $("#content").get(0)) {
	    if (this.text != this.el.html()) {
		setDirty();
		this.save();
	    }
	    return true;
	}
	if (e.which == 39) { e.which = 40; }
	if (e.which == 37) { e.which = 38; }
	if (e.which == 38 || e.which == 40) {
	    if (this.isScrolling && !this.playing) {
		this.warn("The prompter is currently not scrolling...",1000); }
	}
	switch (e.which) {
	case 38: // Up Arrow
	    var oldScrollTop = this.el.parent().scrollTop();
	    this.el.parent().get(0).scrollTop += 1;
	    if (this.el.parent().scrollTop() == oldScrollTop && this.speed !== 0) {
		//console.log(document.height,innerHeight,$(document).scrollTop(),this.speed);
		this.speed = 0;
		break;
	    }
	    this.speed += -1;
	    break;
	case 40: // Down Arrow
	    if (this.el.parent().scrollTop() == 0 && this.speed !== 0) {
		//console.log($(document).scrollTop(),this.speed);
		this.speed = 0;
		break;
	    }
	    this.speed += 1;
	    break;
	case 32: // Space Key
	    this.playing = !this.playing;
	    if (this.playing && this.speed == 0) {
		this.speed = 1;
		this.checkSpeed();
	    }
	    break;
	default:
	    return true;
	}
	this.checkSpeed();
	e.preventDefault();
	return false;
    },
    scrollText: function() {
	if (this.isScrolling && this.playing && Math.abs(this.doScroll) > 1000 ) {
	    this.abs = Math.abs(this.speed);
	    $("#content-container").get(0).scrollTop += ( (this.speed<0)?-1:1) * (this.abs>10 ? this.abs%10:1);
	    this.doScroll = 0;
	} else {
	    this.doScroll += this.speed*this.speed*this.speed;
	}
    },
    root: $(".window-content"),
    defaults: {
	fontSize: "64px",
	font: fonts[0],
	invert: false,
	text: ""
    },
    doScroll: 0,
    speed: 8,
    minimumSpeed: 6,
    maximumSpeed: 19
};

let p;

$(function(){

    p = new Prompter(true);
    module.exports.p = p;
    module.exports.Prompter = Prompter;
    
    $(".window-content").scrollTop(200);
    $("#content").focus();
    
});

function setDirty() {
    ipcRenderer.send("setdirty");
}

function setClean() {
    ipcRenderer.send("setclean");
}

ipcRenderer.on('fileopen', (event, message) => {
    p.init(message);
});

let fn = "Untitled";

ipcRenderer.on('updatename', (event, message) => {
    fn = message.split("/").slice(-1);
    $(".title").text(fn +
		     " - NearPrompt Teleprompter");
});

ipcRenderer.on('filesave', (event) => {
    ipcRenderer.send("filesave", p.save());
});
