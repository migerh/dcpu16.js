
var DCPU16 = DCPU16 || {};

(function () {
	DCPU16.maxWord = 0xffff;
	DCPU16.maxSigned = 0x7fff;
	DCPU16.ramSize = 0x10000;
	
	DCPU16.signed = function (val) {
		if (0x8000 & val) {
			// < 0
			val = -0x8000 + (val & 0x7fff);
		}
		
		return val;
	};

	DCPU16.trim = function (str) {
		str = str.replace(/^\s+/, "");
		str = str.replace(/\s+$/, "");

		return str;
	};

	DCPU16.printHex = function (v, w, prep) {
			// TODO FIXME
			if (typeof v == 'undefined') {
				return '';
			}
		
			var r = v.toString(16), i;
			
			w = DCPU16.def(w, 4);
			prep = DCPU16.def(prep, false);
			
			for (i = r.length; i < w; i++) {
				r = '0' + r;
			}
			
			return (prep ? '0x' : '') + r;
	};
	
	DCPU16.def = function (val, def) {
		if (typeof val == 'undefined' || typeof val == 'null') {
			return def;
		}
				
		return val;
	};
	
	DCPU16.parseInt = function (str) {
		var r;
			
		str = DCPU16.trim(str);
			
		if (str.match(/^0x/)) {
			r = parseInt(str, 16);
		} else if (str[0] === '0') {
			r = parseInt(str, 8);
		} else {
			r = parseInt(str, 10);
		}
			
		return r;
	};		

})();
