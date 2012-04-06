var DCPU16 = (function () {
	var maxWord = 0xffff,
		ramSize = 0x10000,
		wordSize = 2,
	
		opcodes = {
			// basic opcodes
			SET: 0x1,
			ADD: 0x2,
			SUB: 0x3,
			MUL: 0x4,
			DIV: 0x5,
			MOD: 0x6,
			SHL: 0x7,
			SHR: 0x8,
			AND: 0x9,
			BOR: 0xa,
			XOR: 0xb,
			IFE: 0xc,
			IFN: 0xd,
			IFG: 0xe,
			IFB: 0xf,
			
			// non-basic opcodes
			JSR: 0x01 << 4
		},
		
		regs = {
			A: 0x0,
			B: 0x1,
			C: 0x2,
			X: 0x3,
			Y: 0x4,
			Z: 0x5,
			I: 0x6,
			J: 0x7
		},
		
		values = {
			POP: 0x18,
			PEEK: 0x19,
			PUSH: 0x1a,
			SP: 0x1b,
			PC: 0x1c,
			O: 0x1d
		},
		
		trim = function (str) {
			str = str.replace(/^\s+/, "");
			str = str.replace(/\s+$/, "");

			return str;
		},
		
		tab2ws = function (str) {
			return str.replace(/\t/, " ");
		},
		
		next = function (str) {
			return trim(str).split(' ')[0];
		},

		tokenize = function (line) {
			var label, op = 'NOP', params = [];

			if (line[0] == ':') {
				label = next(line.slice(1));
				line = trim(line.slice(label.length+1));
			}
			
			op = next(line);
			line = trim(line.slice(op.length));
			
			params = line.split(',');
			
			return {
				label: label,
				op: op,
				params: params
			};
		},
		
		get = function (param) {
			var t;
			
			if (!param && !param.slice) {
				return [0x0];
			}
			
			var brackets = 	param.slice(0, 1) == '[' && param.slice(-1) == ']' ||
							param.slice(0, 1) == '(' && param.slice(-1) == ')';
			
			if (brackets) {
				param = trim(param.slice(1, -1));
			}

			if (param in regs) {
				// register
				t = regs[param];
				return brackets ? [t+0x8] : [t];
			} else if (param in values) {
				// "special" values POP, PEEK, PUSH, SP, PC, and O
				return [values[param]];
			} else if (param.match(/^0x[0-9a-f]{1,4}$/) || param.match(/^[0-9]{1,5}$/)) {
				// next word is value
				t = parseInt(param) & maxWord;

				if (!brackets && t >= 0x0 && t < 0x20) {
					return [0x20 + t];
				} else {
					return brackets ? [0x1e, t] : [0x1f, t];
				}
			} else if (brackets && param.indexOf('+') > -1) {
				// this [nextword+register] thing
				t = param.split('+');
				
				if (!regs[t[1]]) {
					// _error!
				}
				
				return [0x10 + regs[t[1]], parseInt(t[0])];
			} else {
				// label
				return brackets ? [0x1e, param] : [0x1f, param];
			}
			
			return [0x0];
		},
		
		base64enc: function (data) {
			// taken from https://github.com/Stuk/jszip
			var _keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
				output = "",
				chr1, chr2, chr3, enc1, enc2, enc3, enc4,
				i = 0;

			while (i < data.length) {
				chr1 = data.charCodeAt(i++);
				chr2 = data.charCodeAt(i++);
				chr3 = data.charCodeAt(i++);

				enc1 = chr1 >> 2;
				enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
				enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
				enc4 = chr3 & 63;

				if (isNaN(chr2)) {
				   enc3 = enc4 = 64;
				} else if (isNaN(chr3)) {
				   enc4 = 64;
				}

				output = output + _keyStr.charAt(enc1) + _keyStr.charAt(enc2) + _keyStr.charAt(enc3) + _keyStr.charAt(enc4);
	   		}

			return output;
		};

	return {
		decLabelRef: function (labels, ptr) {
			var l;
			
			for (l in labels) {
				if (labels.hasOwnProperty(l)) {
					if (labels[i] > ptr) {
						labels[i]--;
					}
				}
			}
		},
		
		asm: function (src) {
			var lines = src.split('\n'),
				line, bc = [], w, pt = 0, inc,
				i, j, token, resolve = [],
				labels = {};
			
			// read it line by line
			for (i = 0; i < lines.length; i++) {
				// get rid of the comment and remove alle whitespaces
				// and convert remaining tabs to whitespaces
				line = tab2ws(trim(lines[i].split(';')[0]));
				
				if (line == '') {
					continue;
				}
				
				inc = 1;
				token = tokenize(line);
				
				if (token.label) {
					labels[token.label] = pt;
				}
				
				w = opcodes[token.op];
				bc.push(0);

				// basic op code
				if (w > 0x0 && w < 0x10) {
					for (j = 0; j < 2; j++) {
						p = get(trim(token.params[j]));
					
						w = w | ((p[0] & 0x3f) << 4+j*6);
						if (p[1]) {
							if (p[1].length && p[1].slice && p[1].match) {
								resolve.push({
									label: p[1],
									oppt: pt,
									pt: pt + inc,
									par: j
								});
								bc.push(0x0);
								inc++;
							} else {
								bc.push(p[1] & maxWord);
								inc++;
							}
						}
					}
				} else {
					p = get(trim(token.params[0]));

					w = w | ((p[0] & 0x3f) << 10);
					if (p[1]) {
						// move this into a new function and merge it with above
						if (p[1].length && p[1].slice && p[1].match) {
							resolve.push({
								label: p[1],
								oppt: pt,
								pt: pt + inc,
								par: 0
							});
							bc.push(0x0);
							inc++;
						} else {
							bc.push(p[1] & maxWord);
							inc++;
						}
					}
				}
				
				bc[pt] = w;
				pt += inc;
			}
			
			inc = 0;
			
			for (i = 0; i < resolve.length; i++) {
				w = resolve[i];
				/*
				if (labels[w.label] >= 0 && labels[w.label] < 0x20) {
					// this is a little bit more complex because all the references to the other labels
					// may change, too... :/
					this._decLabelRef(labels, w.oppt);
					bc[w.oppt-inc] = bc[w.oppt-inc] & ((0x3f << ((1-w.par)*6 + 4)) | 0xf);
					bc[w.oppt-inc] = bc[w.oppt-inc] | ((0x20 + labels[w.label]) << (w.par*6+4));
					bc.splice(w.pt-inc, 1);
					inc++;
				} else {*/
					bc[w.pt] = labels[w.label];
				//}
			}
			
			return bc;
		},
		
		Instance: function (rom) {
			this.ramSize = ramSize;
			this.wordSize = wordSize;
			
			this.pc = 0;
			this.sp = 0;
			this.o: 0;
			this.reg: {
				a: 0,
				b: 0,
				c: 0,
				x: 0,
				y: 0,
				z: 0,
				i: 0,
				j: 0
			};
			this.ram = new Array(ramSize*wordSize);
			
			if (rom) {
				this.load(rom);
			}
		}	
	};
})();

DCPU16.Instance.prototype.clear = function () {
	this.pc = 0;
	this.sp = 0;
	this.o = 0;
	this.reg.a = 0;
	this.reg.b = 0;
	this.reg.c = 0;
	this.reg.x = 0;
	this.reg.y = 0;
	this.reg.z = 0;
	this.reg.i = 0;
	this.reg.j = 0;
			
	this.ram = new Array(this.ramSize);
};

DCPU16.Instance.prototype.load = function (rom) {
	
};
