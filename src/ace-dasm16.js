/**

  This file is part of dcpu16.js
  
  Copyright 2012 Michael Gerhaeuser
  
  https://github.com/migerh/dcpu16.js
  
  dcpu16.js is free software; You can redistribute it and/or
  modify it under the terms of the MIT license. You should have
  received a copy of the MIT license along with dcpu16.js. If not,
  see http://www.opensource.org/licenses/MIT

 **/
 
 
define('ace/mode/dasm16', [], function(require, exports, module) {
var oop = require("pilot/oop");
var TextMode = require("ace/mode/text").Mode;
var Tokenizer = require("ace/tokenizer").Tokenizer;
var Dasm16HighlightRules = require("ace/mode/dasm16_highlight_rules").Dasm16HighlightRules;
var Range = require("ace/range").Range;

var Mode = function() {
    this.$tokenizer = new Tokenizer(new Dasm16HighlightRules().getRules());
};
oop.inherits(Mode, TextMode);

(function() {
    // Extra logic goes here. (see below)
}).call(Mode.prototype);

exports.Mode = Mode;
});

define('ace/mode/dasm16_highlight_rules', [], function(require, exports, module) {

var oop = require("pilot/oop");
var lang = require("pilot/lang");
var unicode = require('ace/unicode');
var TextHighlightRules = require("ace/mode/text_highlight_rules").TextHighlightRules;

var Dasm16HighlightRules = function() {

    //this.$rules = new TextHighlightRules().getRules();
    var keywords = lang.arrayToMap(
        ("SET|ADD|SUB|MUL|MLI|DIV|DVI|MOD|MDI|SHL|SHR|ASR|AND|BOR|XOR|" +
        "IFB|IFC|IFE|IFN|IFG|IFA|IFL|IFU|ADX|SBX|STI|STD|DAT|MOV|" +
        "JSR|INT|IAG|IAS|RFI|IAQ|HWN|HWQ|HWI").split("|")
    );
    
    var buildinConstants = lang.arrayToMap(
        ("A|B|C|X|Y|Z|I|J|PC|SP|EX|PUSH|POP|PEEK|PICK").split("|")
    );
    
     var identifierRe = "[" + unicode.packages.L + "\\$_][" 
        + unicode.packages.L
        + unicode.packages.Mn + unicode.packages.Mc
        + unicode.packages.Nd
        + unicode.packages.Pc + "\\$_]*\\b";

    this.$rules = {
    	start: [{
                token : "comment",
                regex : ";.*$"
            }, {
                token : "directive",
                regex : "#.*$"
            }, {
                token : "directive",
                regex : "\\..*$"
            }, {
                token : "constant.numeric", // hex
                regex : "0[xX][0-9a-fA-F]+\\b"
            }, {
                token : "constant.numeric", // float
                regex : "[+-]?\\d+(?:(?:\\.\\d*)?(?:[eE][+-]?\\d+)?)?\\b"
            }, {
                token : function(value) {
                    if (keywords.hasOwnProperty(value.toUpperCase()))
                        return "keyword";
                    else if (buildinConstants.hasOwnProperty(value.toUpperCase()))
                        return "constant.language";
                    else
                        return "identifier";
                },
                regex: identifierRe
            }
        ]
    };

}

oop.inherits(Dasm16HighlightRules, TextHighlightRules);

exports.Dasm16HighlightRules = Dasm16HighlightRules;
});
