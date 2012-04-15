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
        ("SET|ADD|SUB|MUL|DIV|MOD|SHL|SHR|AND|BOR|XOR|" +
        "IFE|IFN|IFG|IFB|DAT").split("|")
    );
    
    var buildinConstants = lang.arrayToMap(
        ("A|B|C|X|Y|Z|I|J|PC|SP|O|PUSH|POP|PEEK").split("|")
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
