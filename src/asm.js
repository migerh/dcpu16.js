
var DCPU16 = DCPU16 || {};

(function () {
	var _ = {
			opTable: {
				'SET': 0x1,
				// sugar
				'MOV': 0x1,
				'ADD': 0x2,
				'SUB': 0x3,
				'MUL': 0x4,
				'MLI': 0x5,
				'DIV': 0x6,
				'DVI': 0x7,
				'MOD': 0x8,
				'MDI': 0x9,
				'AND': 0xa,
				'BOR': 0xb,
				'XOR': 0xc,
				'SHR': 0xd,
				'ASR': 0xe,
				'SHL': 0xf,

				'IFB': 0x10,
				'IFC': 0x11,
				'IFE': 0x12,
				'IFN': 0x13,
				'IFG': 0x14,
				'IFA': 0x15,
				'IFL': 0x16,
				'IFU': 0x17,
				
				'ADX': 0x1a,
				'SBX': 0x1b,
				
				'STI': 0x1e,
				'STD': 0x1f,
		
				// special instructions
				// TODO: get rid of the arithmetics
				'JSR': 0x1 << 5,
				
				'INT': 0x8 << 5,
				'IAG': 0x9 << 5,
				'IAS': 0xa << 5,
				'RFI': 0xb << 5,
				'IAQ': 0xc << 5,
				
				'HWN': 0x10 << 5,
				'HWQ': 0x11 << 5,
				'HWI': 0x12 << 5
			},
			
			regTable: {
				'A': 0x0,
				'B': 0x1,
				'C': 0x2,
				'X': 0x3,
				'Y': 0x4,
				'Z': 0x5,
				'I': 0x6,
				'J': 0x7,
				
				// pseudo registers
				'PUSH': 0x18,
				'POP': 0x18,
				'PEEK': 0x19,
				
				// special purpose registers
				'SP': 0x1b,
				'PC': 0x1c,
				'EX': 0x1d,
				'IA': 0xff
			},
			
			preprocess: function (src) {
				// eliminate tabs
				return src.replace(/\t/g, " ");
			},

			isArray: function (val) {
				return typeof val === "object" && 'splice' in val && 'join' in val;
			}
		}, // end of definition of _
		
		ParserError = function (msg, line) {
			this.name = 'ParserError';
			this.message = msg;
			this.line = line;
		};
		ParserError.prototype = Error.prototype;

	DCPU16.asm = function (src, options) {
		'use strict';
		
		var i, tokens, pc = 0, oppc = 0, par = 0, tmp,
		
			// results
			bc = [], listing = [], rom = [],
			addr2line = {}, line2addr = {},
		
			// constrol structures
			labels = {}, macros = {},
			
			// second pass
			resolveLabels = [], resolveExpressions = [],
			
			// errors, warnings, ...
			warnings = [],
			warn = function (msg, line) {
				warnings.push({
					message: msg,
					line: line
				});
			},
			
			// parsing and generating
			emit = function (value) {
				bc.push(value & DCPU16.maxWord);
				pc++;
			},
			
			parseTokens = function (node, allowMacros, evalExpressions) {
				var opcode = 0, parameters, i, j, result, tmp = [], parval;

				switch(node.type) {
				case "node_label":
					if (labels[node.value]) {
						warn('Label already defined in line ' + labels[node.value].line + ', ignoring this definition.', node.line);
					} else if (_.regTable[node.value.toUpperCase()] >= 0) {
						warn('"' + node.value + '" is a keyword. This label can not be referenced.', node.line);
					} else {
						labels[node.value] = {
							line: node.line,
							pc: pc
						};
					}
					break;
				case "node_directive":
					switch(node.value.toLowerCase()) {
					case "dat":
					case "dw":
						parameters = node.children[0];

						for (i = 0; i < parameters.length; i++) {
							tmp = parseTokens(parameters[i], false, false);

							if (_.isArray(tmp)) {
								emit(tmp[0]);
							} else if (typeof tmp === 'string'){
								for (j = 0; j < tmp.length; j++) {
									emit(tmp.charCodeAt(j));
								}
							} else {
								throw new ParserError('Unknown parameter "' + tmp + '" for dat.', node.line);
							}
						}
						break;

					// todo :/
					case "equ":
					case "eq":
					case "if":
					case "elseif":
					case "else":
					case "endif":
					case "org":
					case "macro":
					case "nolist":
					case "list":
					case "dir_callmacro":
						throw new ParserError('Not yet implemented.', node.line);
						break;
					default:
						warn('Ignoring unknown directive "' + node.value + '".', node.line);
						break;
					}
					break;
				case "node_op":
					if (_.opTable[node.value] >= 0) {
						opcode = _.opTable[node.value];
						parameters = node.children[0];

						if (((opcode & 0x1f) > 0 && parameters.length !== 2) || ((opcode & 0x1f) === 0 && parameters.length !== 1)) {
							throw new ParserError('Invalid number of parameters.', node.line);
						}

						oppc = pc;
						emit(0);

						if ((opcode & 0x1f) > 0) {
							// basic op
							for (par = 1; par >= 0; par--) {
								tmp = parseTokens(parameters[par], false, false);
								parval = 0;

								if (parameters[par].value === 'val_deref') {
									if (tmp[1] !== 0) {
										parval = _.regTable[tmp[1]];
										if (parval < 0x8) {
											parval += 0x8;
										}
									} else {
										parval = 0x1e;
										emit(tmp[0]);
									}
								} else {
									if (tmp[1] !== 0) {
										if (par === 1 && tmp[1] === 'PUSH') {
											throw new ParserError('PUSH is not allowed in this context.', node.line);
										} else if (par === 0 && tmp[1] === 'POP') {
											throw new ParserError('POP is not allowed in this context.', node.line);
										}
										
										parval = _.regTable[tmp[1]];
									} else {
										if (par === 1 && tmp[0] >= -1 && tmp[0] < 30) {
											parval = 0x21 + tmp[0];
										} else {
											parval = 0x1f;
											emit(tmp[0]);
										}
									}
								}
								// write parameter value to opcode
								opcode |= ((parval & ((1 << (5 + par)) - 1)) << (5 + par * 5));
							}
						} else {
							// non basic op
							par = 1;

							tmp = parseTokens(parameters[0], false, false);
							parval = 0;

							if (parameters[0].value === 'val_deref') {
								if (tmp[1] !== 0) {
									parval = _.regTable[tmp[1]];
									if (parval < 0x8) {
										parval += 0x8;
									}
								} else {
									parval = 0x1e;
									emit(tmp[0]);
								}
							} else {
								if (tmp[1] !== 0) {
									parval = _.regTable[tmp[1]];
								} else {
									if (par === 1 && tmp[0] > -1 && tmp[0] < 30) {
										parval = 0x21 + tmp[0];
									} else {
										parval = 0x1f;
										emit(tmp[0]);
									}
								}
							}
							// write parameter value to opcode
							opcode |= ((parval & 0x3f) << 10);
						}
						
						bc[oppc] = opcode;
					} else {
						throw new ParserError('Unknown operation "' + node.value + '".', node.line);
					}
					break;
				case "node_value":
					switch (node.value) {
					case "val_paramlist":
						result = [];
						for (i = 0; i < node.children.length; i++) {
							result.push(parseTokens(node.children[i], false, false));
						}
						break;
					case "val_deref":
						result = parseTokens(node.children[0], false, false);
						break;
					case "val_literal":
						result = parseTokens(node.children[0], false, false);
						break;
					}
					break;
				case "val_register":
					result = [0, node.value];
					break;
				case "val_identifier":
					if (evalExpressions) {
						result = [labels[node.value].pc, 0];
					} else {
						resolveLabels.push({
							label: node.value,
							pc: pc,
							par: par,
							line: node.line,
							oppc: oppc
						});
						result = [0xDEAD, 0];
					}
					break;
				case "val_number":
					result = [node.value, 0];
					break;
				case "val_string":
					if (evalExpressions) {
						result = [node.value.length > 0 ? node.value.charCodeAt(0) : 0, 0];
					} else {
						result = node.value;
					}
					break;
				case "node_comparison":
					throw new ParserError('Not implemented', node.line);
					break;
				case "node_expression":
					if (!evalExpressions) {
						resolveExpressions.push({
							expression: node,
							pc: pc,
							par: par,
							line: node.line,
							oppc: oppc
						});
						result = [0xDEAD, 0];
					} else {
						tmp.push(parseTokens(node.children[0], false, true));
						tmp.push(parseTokens(node.children[1], false, true));
							
						if (tmp[0][1] !== 0 && tmp[1][1] !== 0) {
							throw new ParserError('Found multiple registers in one expressions.', node.line);
						}
						
						if ((tmp[0][1] !== 0 || tmp[1][1] !== 0) && node.value !== '+') {
							throw new ParserError('Registers inside expressions are allowed in sums only.', node.line);
						}
						
						result = [0, 0];
						
						if (tmp[0][1] !== 0) {
							result[1] = tmp[0][1];
						}
						
						if (tmp[1][1] !== 0) {
							result[1] = tmp[1][1];
						}

						switch (node.value) {
						case "+":
							result[0] = tmp[0][0] + tmp[1][0];
							break;
						case "-":
							result[0] = tmp[0][0] - tmp[1][0];
							break;
						case "*":
							result[0] = tmp[0][0] * tmp[1][0];
							break;
						case "/":
							result[0] = tmp[0][0] / tmp[1][0];
							break;
						case "%":
							result[0] = tmp[0][0] % tmp[1][0];
							break;
						case "&":
							result[0] = tmp[0][0] & tmp[1][0];
							break;
						case "|":
							result[0] = tmp[0][0] | tmp[1][0];
							break;
						case "^":
							result[0] = tmp[0][0] ^ tmp[1][0];
							break;
						}
					}
					break;
				}
				
				return result;
			};
	
		options = options || {};
		src = _.preprocess(src);
		
		try {
			tokens = DCPU16.Parser.parse(src);

			for (i = 0; i < tokens.length; i++) {
				if (tokens[i].value !== 'nop') {
					addr2line[pc] = tokens[i].line;
					line2addr[tokens[i].line] = pc;
				}
				parseTokens(tokens[i], true, false);
			}
		} catch (e) {
			throw new ParserError(e.message, e.line);
		}
		
		// labels and expressions
		for (i = 0; i < resolveLabels.length; i++) {
			tmp = resolveLabels[i];
			
			if (typeof labels[tmp.label] !== 'undefined') {
				bc[tmp.pc] = labels[tmp.label].pc;
			} else {
				throw new ParserError('Can\'t find definition for label "' + tmp.label + '"', tmp.line);
			}
		}
		
		for (i = 0; i < resolveExpressions.length; i++) {
			tmp = resolveExpressions[i];

			par = parseTokens(tmp.expression, false, true);
			if (par[1] !== 0) {
				// we have a register in here
				oppc = par[1];
				par[1] = _.regTable[par[1]];
				
				// we have to delete the old parameter value
				bc[tmp.oppc] &= (((1 << (5 + (1 - tmp.par))) - 1) << (5 + (1 - tmp.par) * 5)) | 0x1f;

				if (par[1] >= 0 && par[1] < 0x8) {
					// it's a standard register
					bc[tmp.oppc] |= (par[1] + 0x10) << (5 + tmp.par * 5);
				} else if (par[1] === 0x1b) {
					// it's SP
					bc[tmp.oppc] |= 0x1a << (5 + tmp.par * 5);
				} else {
					throw new ParserError('The register "' + oppc + '" is not allowed in an expression.', tmp.line);
				}
			}

			bc[tmp.pc] = par[0];
		}

		for (i = 0; i < bc.length; i++) {
			rom.push(bc[i] & 0xff);
			rom.push((bc[i] >> 8) & 0xff);
		}
		
		return {
			bc: rom,
			base: 0,
			warnings: warnings,
			addr2line: addr2line,
			line2addr: line2addr,
			labels: labels,
			entry: addr2line[0]
		};
	}
	
	if (typeof TestCase !== 'undefined') {
		DCPU16.ParserError = ParserError;
	}

})();
