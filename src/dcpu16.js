/*jshint forin:true, noarg:true, noempty:true, undef:true, curly:true, browser:true, devel:true, indent:4, maxerr:50 */

var DCPU16 = (function () {
	"use strict";

	// private stuff
	var pub,
		_ = {
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
			
			str = _.trim(str);
			
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
		
		add: function (a, b) {
			return a+b;
		},
		
		mul: function (a, b) {
			return a*b;
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
						//.replace(/\\'/g, '\'')
						.replace(/\\"/g, '"');
						//.replace(/\\0/g, '\0');
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


	pub = {
		// some of the helper methods might be useful outside the assembler and emulator scope
		parseInt: _.parseInt,
		printHex: _.printHex,
		// assembler
		asm: function (src, options) {
			var tokens,
				bc = [], rom = [],
				labels = {}, resolve = [], expr = [], macros = {},
				pc = 0, op, oppc, i, t, u,
				
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
				pushExpression = function (expression, storage, register) {
					expr.push({
						expression: expression,
						oppc: oppc,
						pc: pc,
						par: storage,
						register: register
					});
					bc.push(0);
					pc++;
				},
				evaluateExpression = function (expression, line) {
					var i, values = [], registers = [], w, op, value;
					
					for (i = 0; i < expression.children.length; i++) {
						if (expression.children[i].isNumber) {
							values.push(expression.children[i].value);
						} else if (expression.children[i].isString) {
							if (_.registers[expression.children[i].value] >= 0) {
								registers.push(_.registers[expression.children[i].value]);
							} else if (labels[expression.children[i].value] >= 0) {
								values.push(labels[expression.children[i].value]);
							} else {
								throw new ParserError('Unresolved label "' + expression.children[i].value + '"', line);
							}
						} else if (expression.children[i].isExpression) {
							w = evaluateExpression(expression.children[i]);
							if (w[0]) {
								values.push(w[0]);
							}
							if (w[1]) {
								registers.push(w[1]);
							}
						} else {
							throw new ParserError('Unexpected value "' + expression.children[i].value + '" inside expression', line);
						}
					}

					if (registers.length > 1) {
						throw new ParserError('Only one register is allowed in one expression, you gave ' + registers.length, line);
					}
					
					if (expression.op === 'mul') {
						if (registers.lenth > 0) {
							throw new ParserError('Register must not be involved in multiplications', line);
						}
						op = _.mul;
					} else if (expression.op === 'add') {
						op = _.add;
					} else {
							throw new ParserError('Unknown operand "' + expression.op + '"', line);
					}
					
					value = values[0];
					for (i = 1; i < values.length; i++) {
						value = op(value, values[i]);
					}

					return [value, registers[0]];
				},
				handleParameter = function (data, storage, line) {
					// this function changes the local variables op and inc
					var value, hasLabel = false,
						addr, reg;
						
					if (data.label && data.label.length > 0) {
						labels[data.label] = pc;
						hasLabel = true;
					}
					
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
							pushExpression(data, storage, true);
							value = 0x1e;
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
						} else if (data.isNumber || (data.isStringLiteral && data.value.length > 0)) {
							if (data.isStringLiteral) {
								data.value = data.value.charCodeAt(0);
							}
							
							if (!hasLabel && data.value < 0x20) {
								value = data.value + 0x20;
							} else {
								push(data.value);
								value = 0x1f;
							}
						} else if (data.isExpression) {
							pushExpression(data, storage, false);
							value = 0x1f;
						} else {
							throw new ParserError('Invalid parameter "' + JSON.stringify(data) + '"', line);
						}
					}

					op = op | ((value & 0x3f) << (4 + storage * 6));
				},
				replaceValueStrings = function (tokens, parameter, value) {
					var i, j, k, w;
					
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
									} else if (w.isString) {
										pushLabel(w.value, 0);
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
							}
	
							// reserve space in mem for the opcode and values
							oppc = pc;
							push(0);
							
							// inc and op are going to be changed inside handleParameter
							if (op > 0 && op <= 0xf) {
								handleParameter(node.params[0], 0, line);
								handleParameter(node.params[1], 1, line);
							} else {
								handleParameter(node.params[0], 1, line);
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
								throw new ParserError('Unknown macro "' + node.name + '"', line + 1);
							}
							
							// TODO make this compatible to browsers without native JSON
							w = JSON.parse(JSON.stringify(macro.src));
							
							for (j = 0; j < macro.params.length; j++) {
								if (!node.params[j] || !node.params[j].value) {
									throw new ParserError('Not enough parameters given', line);
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
				
			options = options || {};
			
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

			for (i = 0; i < expr.length; i++) {
				t = meta.addr2line[expr[i].oppc];
				
				try {
					u = evaluateExpression(expr[i].expression, t);
				} catch (e) {
					throw new ParserError(e.message, t);
				}

				if (!expr[i].register && typeof u[1] !== 'undefined') {
					throw new ParserError('Registers are not allowed in this expression', t);
				}
				
				bc[expr[i].pc] = u[0];

				if (typeof u[1] !== 'undefined') {
					t = 0xf | (0x3f << ((1 - expr[i].par) * 6 + 4));
					bc[expr[i].oppc] = (bc[expr[i].oppc] & t) | ((u[1] + 0x10) << (expr[i].par * 6 + 4));
				}
			}
			
			for (i = 0; i < bc.length; i++) {
				rom.push(bc[i] & 0xff);
				rom.push((bc[i] >> 8) & 0xff);
			}

			return {
				src: src,
				bc: rom,
				meta: meta
			};
		},
		dasm: function (rom, options) {
			var src = [], currentline, i = 0, j = 0, bc = [],
				op, values = [0, 0], startval = 0, w, par, line = 1,
				labels = {}, romlen, isPC,
				meta = {
					addr2line: {},
					line2addr: {},
					entry: 0
				};
			
			while (i < rom.length) {
				bc.push((rom[i++] & 0xff) | (((rom[i++] || 0) & 0xff) << 8));
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
							str: '[' + _.registers_rev[w - 0x8] + ']'
						};
					} else if (w >= 0x10 && w < 0x18) {
						par = {
							str: '[' + _.printHex(bc[i]) + '+' + _.registers_rev[w - 0x10] + ']',
							labelTo: bc[i++],
							register: _.registers_rev[w - 0x10]
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
							par.labelTo = bc[i - 1];
							par.setPC = true;
						}
					} else {
						par = {
							str: _.printHex(w - 0x20)
						};
						
						if (isPC) {
							par.labelTo = w - 0x20;
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
						src[line - 1].label = 'line' + (line + 1);
						
						if (w.params[j].register) {
							w.params[j].str = '[line' + (line + 1) + '+' + w.params[j].register + ']';
						} else if (w.params[j].setPC) {
							w.params[j].str = 'line' + (line + 1);
						} else {
							w.params[j].str = '[line' + (line + 1) + ']';
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
			
			this.defaultCharMap = function () {
				var charMap = 0x8180, charMapSize = 0x100, i,
					dcm = [/* for the elegant version: charMap, charMapSize, */
							0x000F,0x0808,0x080F,0x0808,0x08F8,0x0808,0x00FF,0x0808,0x0808,0x0808,0x08FF,0x0808,0x00FF,0x1414,0xFF00,0xFF08,
							0x1F10,0x1714,0xFC04,0xF414,0x1710,0x1714,0xF404,0xF414,0xFF00,0xF714,0x1414,0x1414,0xF700,0xF714,0x1417,0x1414,
							0x0F08,0x0F08,0x14F4,0x1414,0xF808,0xF808,0x0F08,0x0F08,0x001F,0x1414,0x00FC,0x1414,0xF808,0xF808,0xFF08,0xFF08,
							0x14FF,0x1414,0x080F,0x0000,0x00F8,0x0808,0xFFFF,0xFFFF,0xF0F0,0xF0F0,0xFFFF,0x0000,0x0000,0xFFFF,0x0F0F,0x0F0F,
							0x0000,0x0000,0x005F,0x0000,0x0300,0x0300,0x3E14,0x3E00,0x266B,0x3200,0x611C,0x4300,0x3629,0x7650,0x0002,0x0100,
							0x1C22,0x4100,0x4122,0x1C00,0x2A1C,0x2A00,0x083E,0x0800,0x4020,0x0000,0x0808,0x0800,0x0040,0x0000,0x601C,0x0300,
							0x3E41,0x3E00,0x427F,0x4000,0x6259,0x4600,0x2249,0x3600,0x0F08,0x7F00,0x2745,0x3900,0x3E49,0x3200,0x6119,0x0700,
							0x3649,0x3600,0x2649,0x3E00,0x0024,0x0000,0x4024,0x0000,0x0814,0x2241,0x1414,0x1400,0x4122,0x1408,0x0259,0x0600,
							0x3E59,0x5E00,0x7E09,0x7E00,0x7F49,0x3600,0x3E41,0x2200,0x7F41,0x3E00,0x7F49,0x4100,0x7F09,0x0100,0x3E49,0x3A00,
							0x7F08,0x7F00,0x417F,0x4100,0x2040,0x3F00,0x7F0C,0x7300,0x7F40,0x4000,0x7F06,0x7F00,0x7F01,0x7E00,0x3E41,0x3E00,
							0x7F09,0x0600,0x3E41,0xBE00,0x7F09,0x7600,0x2649,0x3200,0x017F,0x0100,0x7F40,0x7F00,0x1F60,0x1F00,0x7F30,0x7F00,
							0x7708,0x7700,0x0778,0x0700,0x7149,0x4700,0x007F,0x4100,0x031C,0x6000,0x0041,0x7F00,0x0201,0x0200,0x8080,0x8000,
							0x0001,0x0200,0x2454,0x7800,0x7F44,0x3800,0x3844,0x2800,0x3844,0x7F00,0x3854,0x5800,0x087E,0x0900,0x4854,0x3C00,
							0x7F04,0x7800,0x447D,0x4000,0x2040,0x3D00,0x7F10,0x6C00,0x417F,0x4000,0x7C18,0x7C00,0x7C04,0x7800,0x3844,0x3800,
							0x7C14,0x0800,0x0814,0x7C00,0x7C04,0x0800,0x4854,0x2400,0x043E,0x4400,0x3C40,0x7C00,0x1C60,0x1C00,0x7C30,0x7C00,
							0x6C10,0x6C00,0x4C50,0x3C00,0x6454,0x4C00,0x0836,0x4100,0x0077,0x0000,0x4136,0x0800,0x0201,0x0201,0x704C,0x7000];
							
				// clever version: this.ram.splice.apply(this, dcm);
				// unfortunately this doesn't work because ram is uninitalized :/
				// brute force ugly "solution:
				for (i = 0; i < charMapSize; i++) {
					this.ram[charMap + i] = dcm[i];
				}
			};
			
			this.pressKey = (function () {
				var offset = 0,
					bufferBase = 0x9000,
					bufferPoint = 0x9010;
				
				return function (key) {
					offset = (offset + 1) % 16;
					
					this.ram[bufferBase + offset] = key & 0x7f;
					this.ram[bufferPoint] = bufferBase + offset;
				};
			})();
			
			this.load = function (rom, where) {
				var i = 0;
				
				where = _.def(where, 0);
				
				while (i < rom.length) {
					this.ram[where + i] = ((rom[2 * i + 1] & 0xff) << 8) | ((rom[2 * i] || 0) & 0xff);
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
				if (((op > 0 && op < 0xc) && !addrA) || this.skipNext) {
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
						this.ram.O = 0;
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
					if ((addrA & valB) === 0) {
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
						if (_this.isRunning && _this.steps(1000)) {
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
			
			this.drawCharacter = function (canvas, char1, char2, bg, fg, blink, offsetX, offsetY, bw, bh) {
				var j, k, r = 0, c = 0, char, chars = [char1, char2], line;

				for (j = 0; j < 2; j++) {
					char = chars[j];
					line = char >> 8;

					for (k = 0; k < 16; k++) {
						canvas.fillStyle = '#' + ((1 << (k % 8)) & line ? fg : bg);
						canvas.fillRect(offsetX + c, offsetY + r, bh, bw);

						if ((k + 1) % 8 === 0) {
							line = char;
							r = 0;
							c += bw;
						} else {
							r += bh;
						}
					}
				}
			};
			
			this.renderScreen = function (canvas) {
				var screenBase = 0x8000, screenSize = 0x180,
					charMap = 0x8180, charMapSize = 0x100,
					w = 512, h = 384, bh = 4, bw = 4, r = 0, c = 0,
					color = 'f', bg, fg, blink = 0,
					i, val;
				
				for (i = screenBase; i < screenBase + screenSize; i++) {
					val = this.getWord(i);

					color = (val & 0x800 ? 'f' : 'a');
					bg = (((val >> 8) & 4) ? color : '0') +
							(((val >> 8) & 2) ? color : '0') +
							(((val >> 8) & 1) ? color : '0');
							
					color = (val & 0x8000 ? 'f' : 'a');
					fg = (((val >> 12) & 4) ? color : '0') +
							(((val >> 12) & 2) ? color : '0') +
							(((val >> 12) & 1) ? color : '0');
					
					this.drawCharacter(canvas,
								this.getWord(charMap + 2 * (val & 0x7f)), this.getWord(charMap + 2 * (val & 0x7f) + 1),
								bg, fg, blink,
								c, r, bw, bh);
					
					if ((i + 1) % 32 === 0) {
						c = 0;
						r += 8*bh;
					} else {
						c += 4*bw;
					}
				}
			};
			
			this.clear();
			this.defaultCharMap();
			
			if (rom) {
				this.load(rom);
			}
		}
	};
	
	// we are running test cases
	if (typeof TestCase !== 'undefined') {
		pub._ = _;
		pub._.ParserError = ParserError;
	}
	
	return pub;
})();

if (typeof module != 'undefined') {
	module.exports.DCPU16 = DCPU16;
}
