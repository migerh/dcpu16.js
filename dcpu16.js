var DCPU16 = (function () {
	// private stuff
	var maxWord = 0xffff,
		ramSize = 0x10000,
		wordSize = 2,
		
		o,
	
		// opcodes translation table
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
		
		// registers
		registers = {
			A: 0x0,
			B: 0x1,
			C: 0x2,
			X: 0x3,
			Y: 0x4,
			Z: 0x5,
			I: 0x6,
			J: 0x7
		},
		
		// special stack ops and pointers/flags
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
		
		_def = function (val, def) {
			if (typeof val == 'undefined' || typeof val == 'null') {
				return def;
			}
			
			return val;
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
			var t, ob = '[(', cb = '])';
			
			if (!param && !param.slice) {
				return [0x0];
			}
			
			var brackets = 	ob.indexOf(param.slice(0, 1)) > -1 && cb.indexOf(param.slice(-1)) > -1;
			
			if (brackets) {
				param = trim(param.slice(1, -1));
			}

			if (param in registers) {
				// register
				t = registers[param];
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
				
				if (!registers[t[1]]) {
					// _error!
				}
				
				return [0x10 + registers[t[1]], parseInt(t[0])];
			} else {
				// label
				return brackets ? [0x1e, param] : [0x1f, param];
			}
			
			return [0x0];
		},
		
		// unused for now
		base64enc = function (data) {
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
		},
		
		decLabelRef = function (labels, ptr) {
			var l;
			
			for (l in labels) {
				if (labels.hasOwnProperty(l)) {
					if (labels[i] > ptr) {
						labels[i]--;
					}
				}
			}
		};
	
	// reverse lookup for registers
	for (o in registers) {
		if (registers.hasOwnProperty(o)) {
			registers[registers[o]] = o;
		}
	}

	for (o in values) {
		if (values.hasOwnProperty(o)) {
			values[values[o]] = o;
		}
	}

	return {
		// assembler
		asm: function (src) {
			var lines = src.split('\n'),
				line, bc = [], rom = [], w, pt = 0, inc,
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
				
				if (token.op == '') {
					continue;
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
			
			for (i = 0; i < bc.length; i++) {
				rom.push((bc[i] >> 8) & 0xff);
				rom.push(bc[i] & 0xff);
			}
			
			return rom;
		},
		
		// emulator
		PC: function (rom) {
			this.ramSize = ramSize;
			this.wordSize = wordSize;
			this.skipNext = false;
						
			this.clear = function () {
				var i;
				
				this.ram = new Array(this.ramSize);
				
				// use the registers as properties of the RAM
				// this simplifies getWord and setWord
				this.ram.PC = 0;
				this.ram.SP = 0;
				this.ram.O = 0;
				
				for (i in registers) {
					if (registers.hasOwnProperty(i)) {
						this.ram[i] = 0;
					}
				}
			};
			
			this.load = function (rom, where) {
				var i = 0;
				
				where = _def(where, 0);
				
				while (i < rom.length) {
					this.ram[where+i] = ((rom[2*i] & 0xff) << 8) | ((rom[2*i+1] || 0) & 0xff);
					i++;
				}
			};
			
			this.setWord = function (ptr, val) {
				console.log('setWord', ptr, val);
				this.ram[ptr] = val & maxWord;
			};
			
			this.getWord = function (ptr) {
				return this.ram[ptr];
			};
			
			this.getValue = function (val) {
				var r;
				
				if (val < 0x1f) {
					r = this.ram[this.getAddress(val)];
				} else if (val == 0x1f) {
					r = this.ram[this.ram.PC++];
				} else if (val >= 0x20 && val < 0x40) {
					r = val - 0x20;
				}
				
				return r;
			};
			
			this.getAddress = function (val) {
				var r;
			
				if (val >= 0 && val < 0x8) {
					r = registers[val];
				} else if (val >= 0x8 && val < 0x10) {
					r = this.ram[registers[val-8]];
				} else if (val >= 0x10 && val < 0x18) {
					r = this.getWord(this.ram.PC++) + this.ram[registers[val-0x10]];
				} else if (val == 0x18) {
					r = this.ram.SP++;
				} else if (val == 0x19) {
					r = this.ram.SP;
				} else if (val == 0x1a) {
					r = --this.ram.SP;
				} else if (val >= 0x1b && val <= 0x1d) {
					r = values[val];
				} else if (val == 0x1e) {
					r = this.ram[this.ram.PC++];
				}
				
				return r;
			};
			
			this.exec = function (op, a, b) {
				var tmp, addrA, valB;
				
				console.log(op, a, b);
				
				addrA = this.getAddress(a);
				valB = this.getValue(b);
				
				// fail silently
				if (!addrA || this.skipNext) {
					this.skipNext = false;
					return;
				}
				
				switch (op) {
					case 0:
						switch (a) {
							case 0x1:
								this.ram[this.ram.SP++] = this.ram.PC;
								this.ram.PC = valB;
							break;
						};
						break;
					case 0x1: // SET
						console.log('set', addrA, valB);
						this.setWord(addrA, valB);
						break;
					case 0x2: // ADD
						tmp = this.getWord(addrA) + valB;
						
						this.ram.O = 0;
						if (tmp & maxWord+1) {
							this.ram.O = 1;
						}
						
						this.setWord(addrA, tmp);
						break;
					case 0x3: // SUB
						tmp = this.getWord(addrA) - valB;
						
						this.ram.O = 0;
						if (tmp < 0) {
							this.ram.O = maxWord;
							tmp = maxWord + tmp;
						}
						
						this.setWord(addrA, tmp);
						break;
					case 0x4: // MUL
						tmp = this.getWord(addrA) * valB;
						this.ram.O = ((tmp) >> 16) & maxWord;
						
						this.setWord(addrA, tmp);
						break;
					case 0x5: // DIV
						if (valB == 0) {
							tmp = 0;
						} else {
							tmp = Math.floor(this.getWord(addrA)/valB);
							this.ram.O = (Math.floor(this.getWord(addrA) << 16)/valB) & maxWord;
						}
						
						this.setWord(addrA, tmp);
						break;
					case 0x6: // MOD
						if (valB == 0) {
							tmp = 0;
						} else {
							tmp = this.getWord(addrA) % valB;
						}
						
						this.setWord(addrA, tmp);
						break;
					// careful here, the "number" datatype in javascript is not a pure
					// integer and thus bit ops like << and >> are not guaranteed to work
					// as expected.
					case 0x7: // SHL
						tmp = this.getWord(addrA) << valB;
						this.ram.O = (tmp>>16) & maxWord;
						
						this.setWord(addrA, tmp);
						break;
					case 0x8: // SHR
						tmp = this.getWord(addrA) >> valB;
						this.ram.O = ((this.getWord(addrA)<<16)>>valB) & maxWord;
						
						this.setWord(addrA, tmp);
						break;
					case 0x9: // AND
						tmp = this.getWord(addrA) & valB;
						
						this.setWord(addrA, tmp);
						break;
					case 0xa: // BOR
						tmp = this.getWord(addrA) | valB;
						
						this.setWord(addrA, tmp);
						break;
					case 0xb: // XOR
						tmp = this.getWord(addrA) ^ valB;
						
						this.setWord(addrA, tmp);
						break;
					case 0xc: // IFE
						if (this.getWord(addrA) != valB) {
							this.skipNext = true;
							this.step();
						}
						break;
					case 0xd: // IFN
						if (this.getWord(addrA) == valB) {
							this.skipNext = true;
							this.step();
						}
						break;
					case 0xe: // IFG
						if (this.getWord(addrA) <= valB) {
							this.skipNext = true;
							this.step();
						}
						break;
					case 0xf: // IFB
						if (this.getWord(addrA) & valB == 0) {
							this.skipNext = true;
							this.step();
						}
						break;
				};
			};
			
			this.step = function () {
				var w = this.getWord(this.ram.PC++),
					op = w & 0xf,
					a = (w & 0x3f0) >> 4,
					b = (w & 0xfc00) >> 10;
					
				this.exec(op, a, b);
			};
			
			this.clear();
			
			if (rom) {
				this.load(rom);
			}
		}	
	};
})();

