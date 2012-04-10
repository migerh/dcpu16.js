/*jshint forin:true, noarg:true, noempty:true, undef:true, curly:true, browser:true, devel:true, indent:4, maxerr:50 */

var DCPU16 = (function () {
	"use strict";

	// private stuff
	var _ = {
		maxWord: 0xffff,
		ramSize: 0x10000,
		wordSize: 2,
		
		useDebug: false,
		
		debug: function () {
			if (_.useDebug && typeof console != 'undefined' && console.log) {
				console.log.apply(console, arguments);
			}
		},
		
		// opcodes translation table
		opcodes: {
			// basic opcodes
			SET: 0x1, ADD: 0x2, SUB: 0x3, MUL: 0x4, DIV: 0x5, MOD: 0x6, SHL: 0x7,
			SHR: 0x8, AND: 0x9, BOR: 0xa, XOR: 0xb, IFE: 0xc, IFN: 0xd, IFG: 0xe,
			IFB: 0xf,			
			// non-basic opcodes
			JSR: 0x10
		},
		
		opcodes_rev: ['', 'SET', 'ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SHL', 'SHR',
					'AND', 'BOR', 'XOR', 'IFE', 'IFN', 'IFG', 'IFB'],
		
		nbopcodes_rev: ['UNDEF', 'JSR'],
		
		// registers
		registers: {A: 0x0, B: 0x1, C: 0x2, X: 0x3, Y: 0x4, Z: 0x5, I: 0x6, J: 0x7},
		
		registers_rev: ['A', 'B', 'C', 'X', 'Y', 'Z', 'I', 'J'],
		
		// special stack ops and pointers/flags
		values: {POP: 0x18, PEEK: 0x19, PUSH: 0x1a, SP: 0x1b, PC: 0x1c, O: 0x1d},
		
		values_rev: [],
		
		parseInt: function (str) {
			var r;
			
			if (str.match(/^0x/)) {
				r = parseInt(str, 16);
			} else if (str[0] === '0') {
				r = parseInt(str, 8);
			} else {
				r = parseInt(str, 10);
			}
			
			return r;
		},
		
		trim: function (str) {
			str = str.replace(/^\s+/, "");
			str = str.replace(/\s+$/, "");

			return str;
		},
		
		tab2ws: function (str) {
			return str.replace(/\t/, " ");
		},
		
		printHex: function (v, w) {
			// TODO FIXME
			if (typeof v == 'undefined') {
				return '';
			}
		
			var r = v.toString(16), i;
			
			w = _.def(w, 0);
			
			for (i = r.length; i < w; i++) {
				r = '0' + r;
			}
			
			return '0x' + r;
		},
		
		def: function (val, def) {
			if (typeof val == 'undefined' || typeof val == 'null') {
				return def;
			}
			
			return val;
		},
		
		next: function (str) {
			return _.trim(str).split(' ')[0];
		},

		tokenize: function (line) {
			var label, op = 'NOP', params = [];

			if (line[0] == ':') {
				label = _.next(line.slice(1));
				line = _.trim(line.slice(label.length + 1));
			}
			
			op = _.next(line);
			line = _.trim(line.slice(op.length));
			
			params = line.split(',');
			
			return {
				label: label,
				op: op,
				params: params
			};
		},
		
		get: function (param) {
			var t, ob = '[(', cb = '])', paramUp;
			
			if (!param && !param.slice) {
				return [0x0];
			}
			
			var brackets = ob.indexOf(param.slice(0, 1)) > -1 && cb.indexOf(param.slice(-1)) > -1;
			
			if (brackets) {
				param = _.trim(param.slice(1, -1));
			}
			
			paramUp = param.toUpperCase();

			if (paramUp in _.registers) {
				// register
				_.debug('found register', paramUp);
				t = _.registers[paramUp];
				return brackets ? [t + 0x8] : [t];
			} else if (paramUp in _.values) {
				// "special" values POP, PEEK, PUSH, SP, PC, and O
				return [_.values[paramUp]];
			} else if (param.match(/^0x[0-9a-fA-F]{1,4}$/) || param.match(/^[0-9]{1,5}$/)) {
				// next word is value
				t = _.parseInt(param) & _.maxWord;
				_.debug('found value', t.toString(16));

				if (!brackets && t >= 0x0 && t < 0x20) {
					return [0x20 + t];
				} else {
					return brackets ? [0x1e, t] : [0x1f, t];
				}
			} else if (brackets && param.indexOf('+') > -1) {
				// this [nextword+register] thing
				t = param.split('+');
				
				if (!_.registers[t[1]]) {
					// _error!
				}
				
				// jshint is complaining about an empty block here
				// i guess it's the {x,y} things inside the regex
				if (t[0].match(/^0x[0-9a-fA-F]{1,4}$/) || t[0].match(/^[0-9]{1,5}$/)) {
					return [0x10 + _.registers[_.trim(t[1]).toUpperCase()], _.parseInt(t[0])];
				} else {
					return [0x10 + _.registers[_.trim(t[1]).toUpperCase()], t[0]];
				}
			} else {
				// label
				_.debug('rec label');
				param.isLabel = true;
				return brackets ? [0x1e, param] : [0x1f, param];
			}
			
			return [0x0];
		}
	};

	// very hacky
	_.values_rev[0x1b] = 'SP';
	_.values_rev[0x1c] = 'PC';
	_.values_rev[0x1d] = 'O';
	_.values_rev[0x18] = 'POP';
	_.values_rev[0x19] = 'PEEK';
	_.values_rev[0x1a] = 'PUSH';


	return {
		// some of the helper methods might be useful outside the assembler and emulator scope
		_: {
			parseInt: _.parseInt
		},
		// assembler
		asm: function (src) {
			var lines = src.split('\n'),
				line, bc = [], rom, w, pt = 0, inc, p,
				i, j, k, token, resolve = [],
				labels = {},
				meta = {
					line2addr: {},
					addr2line: {}
				};
			
			// read it line by line
			for (i = 0; i < lines.length; i++) {
				// get rid of the comment and remove alle whitespaces
				// and convert remaining tabs to whitespaces
				line = _.tab2ws(_.trim(lines[i].split(';')[0]));
				
				_.debug(line);
				if (line === '') {
					continue;
				}
				
				inc = 1;
				token = _.tokenize(line);
				
				// set the current execution pointer
				// this assumes that the rom is always
				// loaded at 0x0000
				if (token.label) {
					labels[token.label] = pt;
				}
				
				// apparently it was just a label
				if (token.op === '') {
					continue;
				}
				
				if (!meta.entry) {
					meta.entry = i+1;
				}
				meta.line2addr[i+1] = pt;
				meta.addr2line[pt] = i+1;
				
				if (token.op.toUpperCase() == 'DAT') {
					// extract the strings first
					w = token.params.join(',');
					rom = [];

					// escape escape sequences
					w = w.replace(/\\"/g, '", 0x22, "')
						.replace(/\\'/g, '", 0x27, "')
						.replace(/\\n/g, '", 0xA, "')
						.replace(/\\r/g, '", 0xD, "')
						.replace(/\\t/g, '", 0x9, "')
						.replace(/\\\\/g, '", 0x5C, "')
						.replace(/\\0/g, '", 0x0, "');
					
					w = w.split('"');
					
					for (j = 1; j < w.length; j = j + 2) {
						rom.push(w[j]);
						// replace the string with 'str'
						w.splice(j, 1, 'str');
					}
					
					// split at the , outside the strings
					w = w.join('').split(',');
					
					// put it into the byte array
					for (j = 0; j < w.length; j++) {
						if (_.trim(w[j]) == 'str') {
							w[j] = rom.shift();
							for (k = 0; k < w[j].length; k++) {
								bc.push(w[j].charCodeAt(k) & _.maxWord);
								pt++;
							}
						} else {
							bc.push(_.parseInt(_.trim(w[j])));
							pt++;
						}
					}
					continue;
				}
				
				_.debug(token);
				
				w = _.opcodes[token.op.toUpperCase()];
				bc.push(0);
				
				// basic op code
				if (w > 0x0 && w < 0x10) {
					for (j = 0; j < 2; j++) {
						p = _.get(_.trim(token.params[j]));
					
						w = w | ((p[0] & 0x3f) << 4 + j * 6);
						if (typeof p[1] != 'undefined') {
							if (p[1].length && p[1].match && p[1].indexOf) {
								resolve.push({
									label: p[1],
									oppt: pt,
									pt: pt + inc,
									par: j
								});
								bc.push(0x0);
								inc++;
							} else {
								_.debug('push literal', p[1]);
								bc.push(p[1] & _.maxWord);
								inc++;
							}
						}
					}
				} else {
					_.debug(token.params);
					p = _.get(_.trim(token.params[0]));
					_.debug(p, p[1].isLabel);

					w = w | ((p[0] & 0x3f) << 10);
					if (typeof p[1] != 'undefined') {
						// move this into a new function and merge it with above
						if (p[1].length && p[1].match && p[1].indexOf) {
							_.debug('push label');
							resolve.push({
								label: p[1],
								oppt: pt,
								pt: pt + inc,
								par: 0
							});
							bc.push(0x0);
							inc++;
						} else {
							_.debug('write literal');
							bc.push(p[1] & _.maxWord);
							inc++;
						}
					}
				}
				
				bc[pt] = w;
				pt += inc;
			}
			
			inc = 0;
			
			_.debug(labels);
			
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
			
			return {
				src: src,
				bc: rom,
				meta: meta
			};
		},
		
		dasm: function (rom) {
			var src = [], currentline, i = 0, j = 0, bc = [],
				op, values = [0, 0], startval = 0, w, par, line = 1,
				labels = {}, romlen, isPC,
				meta = {
					addr2line: {},
					line2addr: {},
					entry: 0
				};
			
			while (i < rom.length) {
				bc.push(((rom[i++] & 0xff) << 8) | ((rom[i++] || 0) & 0xff));
			}
			
			romlen = bc.length;
			i = 0;
			while (i < romlen) {
				meta.addr2line[i] = line;
				meta.line2addr[line] = i;

				w = bc[i++];
				op = w & 0xf;
				values[0] = (w & 0x3f0) >> 4;
				values[1] = (w & 0xfc00) >> 10;
				
				isPC = false;
				
				if (op > 0) {
					currentline = {
						op: _.opcodes_rev[op]
					};
					startval = 0;
				} else if (values[0] > 0 && values[0] <= 1) {
					currentline = {
						op: _.nbopcodes_rev[values[0]]
					};
					startval = 1;
				} else {
					src.push({
						op: 'dat',
						params: [{
							str: _.printHex(w)
						}],
						line: line++
					});
					continue;
				}
				
				currentline.params = [];
				for (j = startval; j < 2; j++) {
					w = values[j];
					if (w >= 0 && w < 0x8) {
						par = {
							str: _.registers_rev[w]
						};
					} else if (w >= 0x8 && w < 0x10) {
						par = {
							str: '[' + _.registers_rev[w-0x8] + ']'
						};
					} else if (w >= 0x10 && w < 0x18) {
						par = {
							str: '[' + _.printHex(bc[i]) + '+' + _.registers_rev[w-0x10] + ']',
							labelTo: bc[i++],
							register: _.registers_rev[w-0x10]
						};
					} else if (w >= 0x18 && w < 0x1e) {
						par = {
							str: _.values_rev[w]
						};
					} else if (w == 0x1e) {
						par = {
							str: '[' + _.printHex(bc[i]) + ']',
							labelTo: bc[i++]
						};
					} else if (w == 0x1f) {
						par = {
							str: _.printHex(bc[i++])
						};
						
						if (isPC) {
							par.labelTo = bc[i-1];
							par.setPC = true;
						}
					} else {
						par = {
							str: _.printHex(w-0x20)
						};
						
						if (isPC) {
							par.labelTo = w-0x20;
							par.setPC = true;
						}
					}
					
					if (currentline.op == 'SET' && par.str == 'PC') {
						isPC = true;
					}
					currentline.params.push(par);
				}
				
				currentline.line = line++;
				src.push(currentline);
			}

			for (i = 0; i < src.length; i++) {
				w = src[i];
				
				for (j = 0; j < w.params.length; j++) {
					if (w.params[j].labelTo && meta.addr2line[w.params[j].labelTo]) {
						line = meta.addr2line[w.params[j].labelTo];
						src[line-1].label = 'line' + (line+1);
						
						if (w.params[j].register) {
							w.params[j].str = '[line' + (line+1) + '+' + w.params[j].register + ']';
						} else if (w.params[j].setPC) {
							w.params[j].str = 'line' + (line+1);
						} else {
							w.params[j].str = '[line' + (line+1) + ']';
						}
					}
					
					// finish the values
					w.params[j] = w.params[j].str;
				}
			}
			
			for (i = 0; i < src.length; i++) {
				w = src[i];
				src[i] = (w.label ? ':' + w.label  + '  ' : '    ') + w.op + ' ' + w.params.join(', ') + '\n';
			}
			
			src = src.join('');

			return {
				src: src,
				bc: rom,
				meta: meta
			};
		},
		
		// emulator
		PC: function (rom) {
			this.ramSize = _.ramSize;
			this.wordSize = _.wordSize;
			this.maxWord = _.maxWord;
			this.skipNext = false;
			this.isRunning = false;
			this.stepCount = 0;
			
			this.events = {};
			this.breakpoints = {};
			
			this.on = function (event, handler, scope) {
				this.events[event] = this.events[event] || [];
				handler.scope = _.def(scope, this);
				this.events[event].push(handler);
			};
			
			this.off = function (event, handler) {
				var i;
				
				if (this.events[event]) {
					for (i = 0; i < this.events[event].length; i++) {
						if (this.events[event][i] === handler) {
							this.events[event].splice(i, 1);
							break;
						}
					}
				}
			};
			
			this.trigger = function (event) {
				var i;
				
				if (this.events[event]) {
					for (i = 0; i < this.events[event].length; i++) {
						this.events[event][i].call(this.events[event][i].scope);
					}
				}
			};
			
			this.toggleBreakpoint = function (addr) {
				return this.breakpoints[addr] = !this.breakpoints[addr];
			};
						
			this.clear = function () {
				var i;
				
				this.ram = new Array(this.ramSize);
				
				// use the registers as properties of the RAM
				// this simplifies getWord and setWord
				this.ram.PC = 0;
				this.ram.SP = 0;
				this.ram.O = 0;
				
				for (i in _.registers) {
					if (_.registers.hasOwnProperty(i)) {
						this.ram[i] = 0;
					}
				}
				
				this.stepCount = 0;
			};
			
			this.load = function (rom, where) {
				var i = 0;
				
				where = _.def(where, 0);
				
				while (i < rom.length) {
					this.ram[where + i] = ((rom[2 * i] & 0xff) << 8) | ((rom[2 * i + 1] || 0) & 0xff);
					i++;
				}
			};
			
			this.setWord = function (ptr, val) {
				this.ram[ptr] = val & this.maxWord;
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
					r = _.registers_rev[val];
				} else if (val >= 0x8 && val < 0x10) {
					r = this.getWord(_.registers_rev[val - 8]);
				} else if (val >= 0x10 && val < 0x18) {
					r = this.getWord(this.ram.PC++) + this.getWord(_.registers_rev[val - 0x10]);
				} else if (val == 0x18) {
					r = this.ram.SP;
					this.ram.SP = (this.ram.SP + 1) & this.maxWord;
				} else if (val == 0x19) {
					r = this.ram.SP;
				} else if (val == 0x1a) {
					this.ram.SP -= 1;
					if (this.ram.SP < 0) {
						this.ram.SP = this.maxWord;
					}
					r = this.ram.SP;
				} else if (val >= 0x1b && val <= 0x1d) {
					r = _.values_rev[val];
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
					// jshint complains about this switch that it should be an if
					// but it's for future non-basic opcodes
					switch (a) {
					case 0x1:
						if (this.ram.SP === 0) {
							this.ram.SP = this.maxWord;
						} else {
							this.ram.SP -= 1;
						}
						this.ram[this.ram.SP] = this.ram.PC;
						this.ram.PC = valB;
						break;
					}
					break;
				case 0x1: // SET
					_.debug('SET', addrA.toString(16), valB.toString(16));
					this.setWord(addrA, valB);
					break;
				case 0x2: // ADD
					tmp = this.getWord(addrA) + valB;
					
					this.ram.O = 0;
					if (tmp & this.maxWord + 1) {
						this.ram.O = 1;
					}
						
					this.setWord(addrA, tmp);
					break;
				case 0x3: // SUB
					tmp = this.getWord(addrA) - valB;
					
					this.ram.O = 0;
					if (tmp < 0) {
						this.ram.O = this.maxWord;
						tmp = this.maxWord + tmp;
					}
					
					this.setWord(addrA, tmp);
					break;
				case 0x4: // MUL
					tmp = this.getWord(addrA) * valB;
					this.ram.O = ((tmp) >> 16) & this.maxWord;
					
					this.setWord(addrA, tmp);
					break;
				case 0x5: // DIV
					if (valB === 0) {
						tmp = 0;
					} else {
						tmp = Math.floor(this.getWord(addrA) / valB);
						this.ram.O = (Math.floor(this.getWord(addrA) << 16) / valB) & this.maxWord;
					}
					
					this.setWord(addrA, tmp);
					break;
				case 0x6: // MOD
					if (valB === 0) {
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
					this.ram.O = (tmp >> 16) & this.maxWord;
					
					this.setWord(addrA, tmp);
					break;
				case 0x8: // SHR
					tmp = this.getWord(addrA) >> valB;
					this.ram.O = ((this.getWord(addrA) << 16) >> valB) & this.maxWord;
					
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
					if (this.getWord(addrA) !== valB) {
						this.skipNext = true;
						this.step();
					}
					break;
				case 0xd: // IFN
					if (this.getWord(addrA) === valB) {
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
					if (this.getWord(addrA) & valB === 0) {
						this.skipNext = true;
						this.step();
					}
					break;
				}
			};
		
			this.step = function (trigger) {
				var w = this.getWord(this.ram.PC++),
					op = w & 0xf,
					a = (w & 0x3f0) >> 4,
					b = (w & 0xfc00) >> 10;
				
				trigger = _.def(trigger, true);
					
				_.debug(op, a, b);
				this.exec(op, a, b);
				this.stepCount++;
				
				if (trigger) {
					this.trigger('update');
				}
				
				// step should be executed even if a breakpoint is set
				if (this.breakpoints[this.ram.PC]) {
					return false;
				} else {
					return true;
				}
			};
			
			this.steps = function (steps) {
				var i;
				
				for (i = 0; i < steps; i++) {
					if (!this.step(false)) {
						return false;
					}
				}
				this.trigger('update');
				
				return true;
			};
			
			this.start = function () {
				var _this = this,
					timer = 30,
					runner = function () {
						if (_this.isRunning && _this.steps(100)) {
							setTimeout(runner, timer);
						} else {
							_this.stop();
						}
					};

				this.isRunning = true;
				this.step(false);
				setTimeout(runner, timer);
			};
			
			this.stop = function () {
				this.isRunning = false;
				this.trigger('update');
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
					
					//if (i % 32 === 0) {
					if (val & 0x7f === 0xA) {
						output += '<br />';
					} else {
						output += String.fromCharCode(val & 0x7f);
					}
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

if (typeof module != 'undefined') {
	module.exports.DCPU16 = DCPU16;
}
