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
		resolveEscapeSequences: function (str) {
			return str.replace(/\\\\/g, '\\')
						.replace(/\\n/g, '\n')
						.replace(/\\r/g, '\r')
						.replace(/\\t/g, '\t')
						.replace(/\\'/g, '\'')
						.replace(/\\"/g, '"')
						.replace(/\\0/g, '\0');
		},
		preprocess: function (src) {
			// eliminate tabs
			return src.replace(/\t/g, "");
		}
	},
	
	ParserError = function (msg, line) {
		this.name = 'ParserError';
		this.message = msg;
		this.line = line;
	};
	ParserError.prototype = Error.prototype;

	// very hacky
	_.values_rev[0x1b] = 'SP';
	_.values_rev[0x1c] = 'PC';
	_.values_rev[0x1d] = 'O';
	_.values_rev[0x18] = 'POP';
	_.values_rev[0x19] = 'PEEK';
	_.values_rev[0x1a] = 'PUSH';


	return {
		// some of the helper methods might be useful outside the assembler and emulator scope
		parseInt: _.parseInt,
		// assembler
		asm: function (src) {
			var tokens,
				bc = [], rom = [],
				labels = {}, resolve = [], macros = {},
				pc = 0, op, oppc, i,
				
				meta = {
					addr2line: {},
					line2addr: {},
					entry: 0
				},

				push = function (v) {
					bc.push(v & _.maxWord);
					pc++;
				},
				pushLabel = function (label, storage) {
					resolve.push({
						label: label,
						oppc: oppc,
						pc: pc,
						par: storage
					});
					bc.push(0);
					pc++;
				},
				handleParameter = function (data, storage) {
					// this function changes the local variables op and inc
					var value,
						addr, reg;
					
					if (data.hasBrackets) {
						/* handle
							0x08-0x0f: [register]
							0x10-0x17: [next word + register]
							0x1e: [next word]
						*/
						if (data.isString) {
							if (_.registers[data.value.toUpperCase()] >= 0) {
								// is it a register?
								value = _.registers[data.value.toUpperCase()] + 0x8;
							} else if (_.values[data.value.toUpperCase()]) {
								// is it PUSH, POP, PEEK, PC, SP or O?
								// whoopsie, this is not allowed!
								throw new ParserError('"' + data.value.toUpperCase() + '" is not allowed inside memory access brackets', line);
							} else {
								// it's a label!
								pushLabel(data.value, storage);
								value = 0x1e;
							}
						} else if (data.isNumber) {
							push(data.value);
							value = 0x1e;
						} else if (data.isExpression) {
							// allow only addition of exactly two summands for now
							if (!data.children[0].isExpression && !data.children[1].isExpression) {
								if (data.children[0].isString && _.registers[data.children[0].value.toUpperCase()] >= 0) {
									reg = data.children[0];
									addr = data.children[1];
								} else if (data.children[1].isString && _.registers[data.children[1].value.toUpperCase()] >= 0) {
									reg = data.children[1];
									addr = data.children[0];
								} else {
									throw new ParserError('Expected a register', line);
								}

								if (addr.isString && _.registers[addr.value.toUpperCase()] >= 0) {
									throw new ParserError('Expected number or label reference', line);
								}
								
								value = _.registers[reg.value.toUpperCase()] + 0x10;
								if (addr.isString) {
									pushLabel(addr.value, storage);
								} else if (addr.isNumber) {
									push(addr.value);
								} else {
									throw new ParserError('can this case even occur?', line);
								}
							} else {
								throw new ParserError('Expressions with more than one summand are not supported', line);
							}
						} else {
							throw new ParserError('Invalid parameter "' + JSON.stringify(data) + '"', line);
						}
					} else {
						/* handle
							0x00-0x07: register (A, B, C, X, Y, Z, I or J, in that order)
							0x18: POP / [SP++]
							0x19: PEEK / [SP]
							0x1a: PUSH / [--SP]
							0x1b: SP
							0x1c: PC
							0x1d: O
							0x1f: next word (literal)
							0x20-0x3f: literal value 0x00-0x1f (literal)
						*/
						if (data.isString) {
							if (_.registers[data.value.toUpperCase()] >= 0) {
								// is it a register?
								value = _.registers[data.value.toUpperCase()];
							} else if (_.values[data.value.toUpperCase()]) {
								// is it PUSH, POP, PEEK, PC, SP or O?
								value = _.values[data.value.toUpperCase()];
							} else {
								// it's a label!
								pushLabel(data.value, storage);
								value = 0x1f;
							}
						} else if (data.isNumber) {
							if (data.value < 0x20) {
								value = data.value + 0x20;
							} else {
								push(data.value);
								value = 0x1f;
							}
						} else {
							throw new ParserError('Invalid parameter "' + JSON.stringify(data) + '"', line);
						}
					}

					op = op | ((value & 0x3f) << (4 + storage*6));
				},
				replaceValueStrings = function (tokens, parameter, value) {
					var i, j, k, w;
					
					// TODO find stuff in expressions
					for (i = 0; i < tokens.length; i++) {
						if (tokens[i].cmd) {
							w = tokens[i].cmd;
						} else {
							w = tokens[i];
						}
						
						if (w.params) {
							for (j = 0; j < w.params.length; j++) {
								if (w.params[j].isExpression) {
									// currently only simple add expressions with 2 summands
									for (k = 0; k < 2; k++) {
										if (w.params[j].children[k].value === parameter) {
											w.params[j].children[k].value = value;
										}
									}
								}
								
								if (w.params[j].value === parameter) {
									w.params[j].value = value;
								}
							}
						}
					}
					
					return tokens;
				},
				parseTokens = function (tokens, allowMacros) {
					var i, j, k, w,
						line, node, macro;

					for (i = 0; i < tokens.length; i++) {
						node = tokens[i];
	
						switch (node.action) {
						case 'nop':
							// e.g. a line completely consisting of a comment
							continue;
							break;
						case 'op':
							// standard op/label stuff
							if (node.label) {
								labels[node.label] = pc;
							}
							
							if (!node.line) {
								throw new ParserError('Undefined line');
							}
							
							line = node.line;
							meta.addr2line[pc] = line;
							meta.line2addr[line] = pc;
							
							if (!node.cmd) {
								// there is no command, continue with the next line
								continue;
							}
							
							// everything from node is done, continue with node.cmd
							node = node.cmd;
							
							// handle the special op DAT
							if (node.op === 'DAT') {
								for (j = 0; j < node.params.length; j++) {
									w = node.params[j];
	
									if (w.isNumber) {
										push(w.value);
									} else if (w.isStringLiteral) {
										w = _.resolveEscapeSequences(w.value);
										for (k = 0; k < w.length; k++) {
											push(w.charCodeAt(k));
										}
									} else {
										throw new ParserError('Unknown DAT value "' + JSON.stringify(w) + '"', line);
									}
								}
								continue;
							}
							
							// handle the rest of the ops
							op = _.opcodes[node.op];
							if (typeof op === 'undefined') {
								throw new ParserError('Unknown operator "' + '"', line);
							};
	
							// reserve space in mem for the opcode and values
							oppc = pc;
							push(0);
							
							// inc and op are going to be changed inside handleParameter
							if (op > 0 && op <= 0xf) {
								handleParameter(node.params[0], 0);
								handleParameter(node.params[1], 1);
							} else {
								handleParameter(node.params[0], 1);
							}
							
							bc[oppc] = op;
							
							break;
						case 'macro':
							if (allowMacros) {
								macros[node.name] = node;
							} else {
								throw new ParserError('A macro cannot be defined here (Nested macro definition?)', line);
							}
							break;
						case 'macrocall':
							macro = macros[node.name];
							
							if (typeof macro === 'undefined') {
								throw new ParserError('Unknown macro "' + node.name + '"', line+1);
							}
							
							// TODO make this compatible to browsers without native JSON
							w = JSON.parse(JSON.stringify(macro.src));
							
							for (j = 0; j < macro.params.length; j++) {
								if (!node.params[j] || !node.params[j].value) {
									throw new ParseError('Not enough parameters given', line);
								}
								
								w = replaceValueStrings(w, macro.params[j].value, node.params[j].value);
							}
							
							parseTokens(w, false);
							break;
						default:
							throw new ParserError('Unknown or undefined action "' + op.action + '"', line);
						}
					}
				};
			
			src = _.preprocess(src);
			
			try {
				tokens = DCPU16.Parser.parse(src);
				parseTokens(tokens, true);
			} catch (e) {
				throw new ParserError(e.message, e.line);
			}
			
			for (i = 0; i < resolve.length; i++) {
				bc[resolve[i].pc] = labels[resolve[i].label];
			}
			
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
				
				if (op > 0 && op < 0xc) {
					addrA = this.getAddress(a);
				} else {
					// special treatment for conditions
					addrA = this.getValue(a);
				}
				valB = this.getValue(b);

				// fail silently
				// BUT NOT FOR CONDITIONS, STUPID!!!
				if ((op > 0 && op < 0xc) && (!addrA || this.skipNext)) {
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
					if (addrA !== valB) {
						this.skipNext = true;
						this.step();
					}
					break;
				case 0xd: // IFN
					if (addrA === valB) {
						this.skipNext = true;
						this.step();
					}
					break;
				case 0xe: // IFG
					if (addrA <= valB) {
						this.skipNext = true;
						this.step();
					}
					break;
				case 0xf: // IFB
					if (addrA & valB === 0) {
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
						if (_this.isRunning && _this.steps(2000)) {
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
					screenSize = 0x200, screenBase = 0x8000,
					lastStyle = 'background-color: #000; color: #fff;',
					style = '', color,
					output = '<span style="' + lastStyle + '">';
				
				for (i = 0; i < screenSize; i++) {
					val = this.getWord(screenBase + i);
					
					if (val & 128) {
						color = 'f';
					} else {
						color = '8';
					}
					
					style = 'background-color: #' +
						(((val >> 8) & 4) ? color : '0') +
						(((val >> 8) & 2) ? color : '0') +
						(((val >> 8) & 1) ? color : '0') +
						'; color: #' +
						(((val >> 12) & 4) ? color : '0') +
						(((val >> 12) & 2) ? color : '0') +
						(((val >> 12) & 1) ? color : '0') + ';';
					
					if (style != lastStyle) {
						lastStyle = style;
						output += '</span><span style="' + lastStyle + '">';
					}
					
					if (i % 32 === 0) {
						output += '\n';
					}
					
					val = val & 0x7f;
					if (val < 10) {
						output += " ";
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
