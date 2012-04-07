var DCPU16 = (function () {
	// private stuff
	var maxWord = 0xffff,
		ramSize = 0x10000,
		wordSize = 2,
		
		_debug = function () {
			return;
			if (typeof console != 'undefined' && console.log)
				console.log(arguments);
		},
		
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
		
		registers_rev = ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'],
		
		// special stack ops and pointers/flags
		values = {
			POP: 0x18,
			PEEK: 0x19,
			PUSH: 0x1a,
			SP: 0x1b,
			PC: 0x1c,
			O: 0x1d
		},
		
		values_rev = [],
		
		trim = function (str) {
			str = str.replace(/^\s+/, "");
			str = str.replace(/\s+$/, "");

			return str;
		},
		
		tab2ws = function (str) {
			return str.replace(/\t/, " ");
		},
		
		def = function (val, def) {
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
			var t, ob = '[(', cb = '])', paramUp;
			
			if (!param && !param.slice) {
				return [0x0];
			}
			
			var brackets = 	ob.indexOf(param.slice(0, 1)) > -1 && cb.indexOf(param.slice(-1)) > -1;
			
			if (brackets) {
				param = trim(param.slice(1, -1));
			}
			
			paramUp = param.toUpperCase();

			if (paramUp in registers) {
				// register
				t = registers[paramUp];
				return brackets ? [t+0x8] : [t];
			} else if (paramUp in values) {
				// "special" values POP, PEEK, PUSH, SP, PC, and O
				return [values[paramUp]];
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
				
				if (t[0].match(/^0x[0-9a-f]{1,4}$/) || t[0].match(/^[0-9]{1,5}$/)) {
					return [0x10 + registers[trim(t[1]).toUpperCase()], parseInt(t[0])];
				} else {
					return [0x10 + registers[trim(t[1]).toUpperCase()], t[0]];
				}
			} else {
				// label
				return brackets ? [0x1e, param] : [0x1f, param];
			}
			
			return [0x0];
		};

	// very hacky
	values_rev[0x1b] = 'SP';
	values_rev[0x1c] = 'PC';
	values_rev[0x1d] = 'O';

	return {
		// assembler
		asm: function (src) {
			var lines = src.split('\n'),
				line, bc = [], rom, w, pt = 0, inc,
				i, j, k, token, resolve = [],
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
				
				// set the current execution pointer
				// this assumes that the rom is always
				// loaded at 0x0000
				if (token.label) {
					labels[token.label] = pt;
				}
				
				// apparently it was just a label
				if (token.op == '') {
					continue;
				}
				
				if (token.op.toUpperCase() == 'DAT') {
					// extract the strings first
					w = token.params.join(',').split('"');
					rom = [];
					for (j = 1; j < w.length; j = j+2) {
						rom.push(w[j]);
						// replace the string with 'str'
						w.splice(j, 1, 'str');
					}
					
					// split at the , outside the strings
					w = w.join('').split(',');
					
					// put it into the byte array
					for (j = 0; j < w.length; j++) {
						if (trim(w[j]) == 'str') {
							w[j] = rom.shift();
							for (k = 0; k < w[j].length; k++) {
								bc.push(w[j].charCodeAt(k) & maxWord);
								pt++;
							}
						} else {
							bc.push(parseInt(w[j]));
							pt++;
						}
					}
					continue;
				}
				
				w = opcodes[token.op.toUpperCase()];
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
			
			rom = [];
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
				
				where = def(where, 0);
				
				while (i < rom.length) {
					this.ram[where+i] = ((rom[2*i] & 0xff) << 8) | ((rom[2*i+1] || 0) & 0xff);
					i++;
				}
			};
			
			this.setWord = function (ptr, val) {
				this.ram[ptr] = val & maxWord;
			};
			
			this.getWord = function (ptr) {
				return this.ram[ptr] || 0;
			};
			
			this.getValue = function (val) {
				var r;
				
				if (val < 0x1f) {
					r = this.ram[this.getAddress(val)] || 0;
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
					r = registers_rev[val];
				} else if (val >= 0x8 && val < 0x10) {
					r = this.getWord(registers_rev[val-8]);
				} else if (val >= 0x10 && val < 0x18) {
					r = this.getWord(this.ram.PC++) + this.getWord(registers_rev[val-0x10]);
				} else if (val == 0x18) {
					this.ram.SP = (this.ram.SP + 1) & maxWord;
					r = this.ram.SP;
				} else if (val == 0x19) {
					r = this.ram.SP;
				} else if (val == 0x1a) {
					this.ram.SP -= 1;
					if (this.ram.SP < 0) {
						this.ram.SP = maxWord + this.ram.SP;
					}
					r = this.ram.SP;
				} else if (val >= 0x1b && val <= 0x1d) {
					r = values_rev[val];
				} else if (val == 0x1e) {
					r = this.getWord(this.ram.PC++);
				}
				
				return r;
			};
			
			this.exec = function (op, a, b) {
				var tmp, addrA, valB;
				
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
								if (this.ram.SP == 0) {
									this.ram.SP = maxWord;
								} else {
									this.ram.SP -= 1;
								}
								this.ram[this.ram.SP] = this.ram.PC;
								this.ram.PC = valB;
							break;
						};
						break;
					case 0x1: // SET
						_debug('SET', addrA.toString(16), valB.toString(16));
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
					
				_debug(op, a, b);
				this.exec(op, a, b);
			};
			
			this.screen2html =  function () {
				// this is very inefficient and by far not the best way but
				// it is only to test if i have the right color scheme.
				var i, val,
					screenSize = 0x800, screenBase = 0x8000,
					lastStyle = 'background-color: #000; color: #fff;',
					style = '',
					output = '<span style="' + lastStyle + '">';
				
				for (i = 0; i < 0x800; i++) {
					val = this.getWord(screenBase + i);
					style = 'background-color: #' +
						(((val >> 8) & 4) ? 'f' : '0') +
						(((val >> 8) & 2) ? 'f' : '0') +
						(((val >> 8) & 1) ? 'f' : '0') +
						'; color: #' +
						(((val >> 12) & 4) ? 'f' : '0') +
						(((val >> 12) & 2) ? 'f' : '0') +
						(((val >> 12) & 1) ? 'f' : '0') + ';';
					
					if (style != lastStyle) {
						lastStyle = style;
						output += '</span><span style="' + lastStyle + '">';
					}
					
					if (i % 32 == 0) {
						output += '<br />';
					}
					
					output += String.fromCharCode(val & 0x7f);
				}
				
				output += '</span>';
				
				return output;
			};
			
			this.clear();
			
			if (rom) {
				this.load(rom);
			}
		}
	};
})();

